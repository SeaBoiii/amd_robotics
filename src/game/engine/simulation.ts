/**
 * The deterministic simulation engine.
 *
 * This is the authoritative game. It contains no React, no Phaser and no DOM
 * access, and it never reads the wall clock — time advances only when `step()`
 * is called. Consequences:
 *
 *  - The whole game is unit-testable in Node.
 *  - The same seed, program and model always produce the same run, so scores
 *    are fair and a student can reproduce a bug for their teacher.
 *  - Rendering can be swapped, disabled or replaced without touching rules.
 */

import type {
  AIModel,
  Action,
  ConfidencePolicy,
  Difficulty,
  Heading,
  Mission,
  MissionResult,
  NavigationOverlay,
  ObjectiveResult,
  Prediction,
  RoverBuild,
  RoverState,
  RoverStats,
  RunTelemetry,
  SensorReading,
  SimulationEvent,
  SimulationPhase,
  SimulationSnapshot,
  StudentProgram,
  Rule,
} from '@/types';
import { classifier } from '@/ai/classifier/logisticRegression';
import { sampleFeaturesForLabel } from '@/ai/datasets/generator';
import { LABEL_INFO } from '@/ai/labels';
import { computeStats } from '@/robotics/components';
import { evaluateProgram } from '@/program/ruleEngine';
import { clamp, round } from '@/utils/format';
import { createRng, type Rng } from '@/utils/rng';
import { readSensors, sensedTiles, type SensorContext } from './sensors';
import { awardBadges, buildSuggestions, computeScore, type ScoreInput } from './scoring';
import { HEADING_VECTORS, HAZARD_TILES, SLOW_TILES, tileToLabel, turn, World } from './world';

/** Hard cap so a looping student program can never freeze the browser tab. */
const MAX_TICKS = 3000;
/** How many ticks of no progress count as "stuck". */
const STALL_LIMIT = 40;

export interface PerceivedTile {
  x: number;
  y: number;
  char: '.' | '#' | '~';
}

export interface NavigatorObservation {
  x: number;
  y: number;
  heading: Heading;
  perceived: PerceivedTile[];
  /** True when the previous forward move hit something. */
  bumped: boolean;
}

export interface NavigatorDecision {
  action: Action;
  reason: string;
  /** Simulated on-board planning time added to the clock. */
  computeMs: number;
}

/** An autonomous controller that replaces the student rule program. */
export interface Navigator {
  reset(): void;
  perceive(context: SensorContext): PerceivedTile[];
  decide(observation: NavigatorObservation): NavigatorDecision;
  overlay(): NavigationOverlay;
}

export interface SimulationConfig {
  mission: Mission;
  program: StudentProgram;
  build: RoverBuild;
  model: AIModel | null;
  confidencePolicy: ConfidencePolicy;
  difficulty: Difficulty;
  attemptNumber: number;
  previouslyFailed: boolean;
  /** Overrides the mission time limit when > 0 (Educator Mode). */
  timeLimitOverride?: number;
  /** Overrides the mission seed. Leave undefined for repeatable classroom runs. */
  seedOverride?: number;
  /** Replaces rule evaluation with an autonomous navigator. */
  navigator?: Navigator;
  /** Replaces stats derived from the student catalogue. */
  statsOverride?: RoverStats;
}

export class Simulation {
  readonly mission: Mission;
  private readonly config: SimulationConfig;
  private readonly modifiers: Mission['difficultyModifiers'][Difficulty];
  private readonly timeLimit: number;
  private readonly seed: number;

  private world!: World;
  private rng!: Rng;
  private rover!: RoverState;
  private stats = computeStats({ componentIds: [], motorPower: 50, colour: '#fff' });

  private phase: SimulationPhase = 'idle';
  private tick = 0;
  private elapsedMs = 0;
  private stallTicks = 0;
  private lastPositionKey = '';
  /** `reach_base` must not count before the rover has actually set off. */
  private hasLeftBase = false;

  private readings: SensorReading[] = [];
  private prediction: Prediction | null = null;
  private predictionCorrect: boolean | null = null;
  private activeRule: Rule | null = null;
  private decisionReason = 'Waiting to start.';
  private events: SimulationEvent[] = [];
  private result: MissionResult | null = null;
  private perceived: PerceivedTile[] = [];
  private bumped = false;

  private telemetry: RunTelemetry = Simulation.emptyTelemetry(0);

  constructor(config: SimulationConfig) {
    this.config = config;
    this.mission = config.mission;
    this.modifiers = config.mission.difficultyModifiers[config.difficulty];
    this.seed = config.seedOverride ?? config.mission.seed;
    this.timeLimit =
      config.timeLimitOverride && config.timeLimitOverride > 0
        ? config.timeLimitOverride
        : Math.round(config.mission.timeLimit * this.modifiers.timeMultiplier);
    this.reset();
  }

  private static emptyTelemetry(seed: number): RunTelemetry {
    return {
      ticks: 0,
      elapsedSeconds: 0,
      distanceTravelled: 0,
      energyUsed: 0,
      energyRemaining: 0,
      collisions: 0,
      hazardsEntered: 0,
      suppliesDelivered: 0,
      targetsFound: 0,
      predictionsMade: 0,
      correctPredictions: 0,
      humanInterventions: 0,
      lowConfidenceStops: 0,
      seed,
    };
  }

  // ------------------------------------------------------------- lifecycle

  reset(): void {
    this.world = new World(this.mission);
    this.rng = createRng(this.seed);
    this.stats = this.config.statsOverride ?? computeStats(this.config.build);

    const capacity = Math.max(10, this.stats.batteryCapacity);
    this.rover = {
      x: this.mission.start.x,
      y: this.mission.start.y,
      heading: this.mission.start.heading,
      energy: capacity,
      maxEnergy: capacity,
      carrying: this.stats.cargoCapacity,
      distanceTravelled: 0,
      collisions: 0,
      lastCommand: null,
      status: 'idle',
    };

    this.phase = 'idle';
    this.tick = 0;
    this.elapsedMs = 0;
    this.stallTicks = 0;
    this.hasLeftBase = false;
    this.lastPositionKey = `${this.rover.x},${this.rover.y}`;
    this.readings = [];
    this.prediction = null;
    this.predictionCorrect = null;
    this.activeRule = null;
    this.decisionReason = 'Waiting to start.';
    this.events = [];
    this.result = null;
    this.perceived = [];
    this.bumped = false;
    this.config.navigator?.reset();
    this.telemetry = Simulation.emptyTelemetry(this.seed);
    this.telemetry.energyRemaining = capacity;
  }

  start(): void {
    if (this.phase === 'idle') {
      this.phase = 'running';
      this.log('start', `Mission "${this.mission.title}" started. Seed ${this.seed}.`);
    } else if (this.phase === 'paused') {
      this.phase = 'running';
    }
  }

  pause(): void {
    if (this.phase === 'running') this.phase = 'paused';
  }

  isFinished(): boolean {
    return this.phase === 'succeeded' || this.phase === 'failed';
  }

  getPhase(): SimulationPhase {
    return this.phase;
  }

  // ------------------------------------------------------------------ core

  /** Advances exactly one decision step. The only way time moves forward. */
  step(): void {
    if (this.isFinished()) return;
    if (this.phase === 'idle') this.start();

    this.tick += 1;
    const stepMs = this.millisecondsPerStep();
    this.elapsedMs += stepMs;

    this.sense();
    const decision = this.decide();
    this.act(decision.action);
    this.applyIdleCosts();
    this.checkEnd();
  }

  /** A faster rover spends less time per decision. */
  private millisecondsPerStep(): number {
    return clamp(900 / Math.max(0.25, this.stats.speed), 90, 3000);
  }

  private sense(): void {
    const context: SensorContext = {
      world: this.world,
      x: this.rover.x,
      y: this.rover.y,
      heading: this.rover.heading,
      stats: this.stats,
      difficultyNoise: this.modifiers.sensorNoise,
      rng: this.rng,
      timestamp: this.elapsedMs,
    };

    if (this.config.navigator) {
      this.readings = [];
      this.prediction = null;
      this.predictionCorrect = null;
      this.perceived = this.config.navigator.perceive(context);
      return;
    }

    this.readings = readSensors(context);

    this.prediction = null;
    this.predictionCorrect = null;

    if (this.stats.sensorTypes.includes('camera') && this.config.model) {
      const { dx, dy } = HEADING_VECTORS[this.rover.heading];
      const aheadChar = this.world.at(this.rover.x + dx, this.rover.y + dy);
      const trueLabel = tileToLabel(aheadChar);
      const { features } = sampleFeaturesForLabel(trueLabel, this.rng, this.modifiers.aiUncertainty);

      const prediction = classifier.predict(this.config.model.weights, features);
      prediction.timestamp = this.elapsedMs;
      this.prediction = prediction;
      this.predictionCorrect = prediction.label === trueLabel;

      this.telemetry.predictionsMade += 1;
      if (this.predictionCorrect) this.telemetry.correctPredictions += 1;

      if (prediction.confidence < this.config.confidencePolicy.verifyAbove) {
        this.telemetry.lowConfidenceStops += 1;
      }

      this.log(
        'prediction',
        `Camera: "${LABEL_INFO[prediction.label].name}" at ${(prediction.confidence * 100).toFixed(0)}% confidence.`,
        { predicted: prediction.label, actual: trueLabel, correct: this.predictionCorrect },
      );
    }
  }

  private decide(): { action: Action } {
    const navigator = this.config.navigator;
    if (navigator) {
      const decision = navigator.decide({
        x: this.rover.x,
        y: this.rover.y,
        heading: this.rover.heading,
        perceived: this.perceived,
        bumped: this.bumped,
      });
      this.elapsedMs += Math.max(0, decision.computeMs);
      this.activeRule = null;
      this.decisionReason = decision.reason;
      this.log('rule', decision.reason, { action: decision.action.type });
      return decision;
    }

    const match = evaluateProgram(this.config.program, {
      readings: this.readings,
      prediction: this.prediction,
      batteryPercent: (this.rover.energy / this.rover.maxEnergy) * 100,
      carrying: this.rover.carrying,
      elapsedSeconds: this.elapsedMs / 1000,
    });

    this.activeRule = match.rule;
    this.decisionReason = match.reason;
    this.log('rule', match.reason, { action: match.action.type });
    return match;
  }

  // --------------------------------------------------------------- actions

  private act(action: Action): void {
    this.bumped = false;
    // Responsible-AI throttle: a prediction the model is only half-sure about
    // makes the rover move cautiously, even if the student's rule said "go".
    const cautious =
      this.prediction !== null &&
      this.prediction.confidence < this.config.confidencePolicy.actAbove &&
      this.prediction.confidence >= this.config.confidencePolicy.verifyAbove;

    switch (action.type) {
      case 'forward':
        this.move(1, action.speed ?? 100, cautious);
        break;
      case 'reverse':
        this.move(-1, action.speed ?? 60, cautious);
        break;
      case 'turn_left':
        this.rover.heading = turn(this.rover.heading, 'left');
        this.rover.status = 'turning';
        this.spendEnergy(0.15);
        this.log('turn', 'Turned left.');
        break;
      case 'turn_right':
        this.rover.heading = turn(this.rover.heading, 'right');
        this.rover.status = 'turning';
        this.spendEnergy(0.15);
        this.log('turn', 'Turned right.');
        break;
      case 'stop':
        this.rover.status = 'stopped';
        break;
      case 'wait':
        this.rover.status = 'idle';
        break;
      case 'scan':
        this.spendEnergy(0.1);
        this.rover.status = 'idle';
        break;
      case 'deliver_supply':
        this.deliverSupply();
        break;
      case 'pick_up_target':
        this.pickUpTarget();
        break;
      case 'request_human_help':
        this.requestHuman(action.note);
        break;
      case 'return_to_base':
        this.returnToBase(action.speed ?? 70);
        break;
      default:
        this.rover.status = 'stopped';
    }

    this.rover.lastCommand = this.toCommand(action);
  }

  private toCommand(action: Action): RoverState['lastCommand'] {
    switch (action.type) {
      case 'forward':
        return { type: 'forward', speed: action.speed ?? 100 };
      case 'reverse':
        return { type: 'reverse', speed: action.speed ?? 60 };
      case 'turn_left':
        return { type: 'turnLeft' };
      case 'turn_right':
        return { type: 'turnRight' };
      case 'deliver_supply':
        return { type: 'deliverSupply' };
      case 'pick_up_target':
        return { type: 'pickUpTarget' };
      case 'scan':
        return { type: 'scan' };
      case 'request_human_help':
        return { type: 'requestHumanHelp', reason: action.note ?? 'unsure' };
      case 'return_to_base':
        return { type: 'returnToBase' };
      case 'wait':
        return { type: 'wait' };
      default:
        return { type: 'stop' };
    }
  }

  private move(direction: 1 | -1, speed: number, cautious: boolean): void {
    const effectiveSpeed = clamp(speed, 0, 100) * (cautious ? 0.5 : 1);
    if (effectiveSpeed <= 0) {
      this.rover.status = 'stopped';
      return;
    }

    const { dx, dy } = HEADING_VECTORS[this.rover.heading];
    let targetX = this.rover.x + dx * direction;
    let targetY = this.rover.y + dy * direction;

    // Low grip on wet or broken ground can push the rover off its intended line.
    const currentChar = this.world.at(this.rover.x, this.rover.y);
    const slipperyHere = HAZARD_TILES.has(currentChar) || SLOW_TILES.has(currentChar);
    if (slipperyHere && this.rng.chance(clamp(0.3 / this.stats.grip, 0, 0.5))) {
      const slipDirection = this.rng.chance(0.5) ? 'left' : 'right';
      this.rover.heading = turn(this.rover.heading, slipDirection);
      this.log('move', `The rover slipped on ${currentChar === '~' ? 'wet ground' : 'loose debris'} and turned ${slipDirection}.`);
      const slipVector = HEADING_VECTORS[this.rover.heading];
      targetX = this.rover.x + slipVector.dx * direction;
      targetY = this.rover.y + slipVector.dy * direction;
    }

    if (this.world.isSolid(targetX, targetY)) {
      this.rover.collisions += 1;
      this.telemetry.collisions += 1;
      this.bumped = true;
      this.rover.status = 'stopped';
      this.spendEnergy(0.4);
      this.log('collision', 'The rover bumped into something and stopped.', {
        x: targetX,
        y: targetY,
      });
      return;
    }

    this.rover.x = targetX;
    this.rover.y = targetY;
    this.rover.status = 'driving';
    this.rover.distanceTravelled += 1;
    this.telemetry.distanceTravelled += 1;

    const enteredChar = this.world.at(targetX, targetY);
    const terrainCost = HAZARD_TILES.has(enteredChar) ? 2.2 : SLOW_TILES.has(enteredChar) ? 1.5 : 1;
    const speedFactor = 0.5 + (effectiveSpeed / 100) ** 2;
    this.spendEnergy(0.5 * terrainCost * speedFactor);

    if (HAZARD_TILES.has(enteredChar)) {
      this.telemetry.hazardsEntered += 1;
      this.log('hazard', 'The rover entered a hazard zone. That costs energy and safety points.', {
        tile: enteredChar,
      });
    }
  }

  private deliverSupply(): void {
    const { dx, dy } = HEADING_VECTORS[this.rover.heading];
    const candidates = [
      { x: this.rover.x, y: this.rover.y },
      { x: this.rover.x + dx, y: this.rover.y + dy },
    ];
    const station = candidates.find(
      ({ x, y }) => this.world.at(x, y) === 'S' && !this.world.isConsumed(x, y),
    );

    if (!station) {
      this.log('delivery', 'Delivery attempted, but there is no supply station here.');
      this.rover.status = 'stopped';
      return;
    }
    if (this.rover.carrying <= 0) {
      this.log('delivery', 'No packages left to deliver. Fit a bigger storage compartment.');
      return;
    }

    this.world.consume(station.x, station.y);
    this.rover.carrying -= 1;
    this.telemetry.suppliesDelivered += 1;
    this.spendEnergy(0.2);
    this.log('delivery', 'Supplies delivered to the station.', station);
  }

  private pickUpTarget(): void {
    const { dx, dy } = HEADING_VECTORS[this.rover.heading];
    const candidates = [
      { x: this.rover.x, y: this.rover.y },
      { x: this.rover.x + dx, y: this.rover.y + dy },
    ];
    const target = candidates.find(
      ({ x, y }) => this.world.at(x, y) === 'T' && !this.world.isConsumed(x, y),
    );

    if (!target) {
      this.log('target', 'Nothing to pick up here.');
      return;
    }

    this.world.consume(target.x, target.y);
    this.telemetry.targetsFound += 1;
    this.spendEnergy(0.2);
    this.log('target', 'Located and marked a person needing help. Well done.', target);
  }

  private requestHuman(note?: string): void {
    if (!this.stats.hasTelemetry) {
      this.log('human', 'The rover tried to call for help, but it has no communication module.');
      this.rover.status = 'stopped';
      return;
    }
    this.telemetry.humanInterventions += 1;
    this.rover.status = 'waiting-for-human';
    // Asking a human costs time — that is the trade-off, not a free pass.
    this.elapsedMs += 900;
    this.spendEnergy(0.1);
    this.log('human', `Asked the command centre to confirm: "${note ?? 'unsure what I am seeing'}".`);
  }

  private returnToBase(speed: number): void {
    const next = this.world.nextStepTowards(this.rover.x, this.rover.y, 'B');
    if (!next) {
      this.rover.status = 'stopped';
      this.log('move', 'No route back to base could be found.');
      return;
    }
    const dx = next.x - this.rover.x;
    const dy = next.y - this.rover.y;
    const desired =
      dx === 1 ? 'east' : dx === -1 ? 'west' : dy === 1 ? 'south' : ('north' as const);

    if (this.rover.heading !== desired) {
      // Rotate one step towards the target instead of teleporting the heading.
      this.rover.heading = turn(this.rover.heading, 'right');
      this.spendEnergy(0.15);
      this.rover.status = 'turning';
      return;
    }
    this.move(1, speed, false);
  }

  // ---------------------------------------------------------------- energy

  private spendEnergy(units: number): void {
    const cost = units * this.stats.energyDrain * this.modifiers.energyMultiplier;
    this.rover.energy = Math.max(0, this.rover.energy - cost);
    this.telemetry.energyUsed += cost;
    this.telemetry.energyRemaining = this.rover.energy;
  }

  /** Sensors draw a small amount of power every step, even while stationary. */
  private applyIdleCosts(): void {
    const sensorCost = this.stats.sensorTypes.length * 0.03;
    this.spendEnergy(sensorCost);

    if (this.world.at(this.rover.x, this.rover.y) !== 'B') this.hasLeftBase = true;

    const positionKey = `${this.rover.x},${this.rover.y}`;
    if (positionKey === this.lastPositionKey) this.stallTicks += 1;
    else {
      this.stallTicks = 0;
      this.lastPositionKey = positionKey;
    }
  }

  // ------------------------------------------------------------ objectives

  private evaluateObjectives(): ObjectiveResult[] {
    return this.mission.objectives.map((objective) => {
      let progress = 0;

      switch (objective.type) {
        case 'reach_base':
          // Standing on the start pad at tick 1 does not count as "returning".
          progress = this.hasLeftBase && this.world.at(this.rover.x, this.rover.y) === 'B' ? 1 : 0;
          break;
        case 'reach_tile':
          progress =
            objective.tile &&
            this.rover.x === objective.tile.x &&
            this.rover.y === objective.tile.y
              ? 1
              : 0;
          break;
        case 'deliver_supplies':
          progress = this.telemetry.suppliesDelivered;
          break;
        case 'find_targets':
          progress = this.telemetry.targetsFound;
          break;
        case 'avoid_hazards':
          progress = this.telemetry.hazardsEntered <= objective.target ? objective.target : 0;
          break;
        case 'no_collisions':
          progress = this.telemetry.collisions <= objective.target ? objective.target : 0;
          break;
        case 'classify_correctly':
          progress =
            this.telemetry.predictionsMade === 0
              ? 0
              : Math.round(
                  (this.telemetry.correctPredictions / this.telemetry.predictionsMade) * 100,
                );
          break;
        case 'energy_remaining':
          progress = Math.round((this.rover.energy / this.rover.maxEnergy) * 100);
          break;
        default:
          progress = 0;
      }

      return {
        objectiveId: objective.id,
        description: objective.description,
        achieved: progress >= objective.target,
        progress,
        target: objective.target,
      };
    });
  }

  private checkEnd(): void {
    const objectives = this.evaluateObjectives();
    const elapsedSeconds = this.elapsedMs / 1000;

    let failureReason: string | null = null;

    if (this.rover.energy <= 0) {
      const condition = this.mission.failureConditions.find(
        (item) => item.type === 'out_of_energy',
      );
      failureReason = condition?.message ?? 'The rover ran out of battery.';
      this.rover.status = 'disabled';
    } else if (elapsedSeconds >= this.timeLimit) {
      const condition = this.mission.failureConditions.find((item) => item.type === 'time_limit');
      failureReason = condition?.message ?? 'The mission ran out of time.';
    } else {
      const collisionRule = this.mission.failureConditions.find(
        (item) => item.type === 'too_many_collisions',
      );
      if (collisionRule && this.telemetry.collisions > (collisionRule.limit ?? Infinity)) {
        failureReason = collisionRule.message;
      }
      const hazardRule = this.mission.failureConditions.find(
        (item) => item.type === 'entered_hazard',
      );
      if (!failureReason && hazardRule && this.telemetry.hazardsEntered > (hazardRule.limit ?? Infinity)) {
        failureReason = hazardRule.message;
      }
    }

    if (!failureReason && this.tick >= MAX_TICKS) {
      failureReason = 'The rover ran for too long without finishing. Check for a rule loop.';
    }
    if (!failureReason && this.stallTicks >= STALL_LIMIT) {
      failureReason =
        'The rover got stuck in the same spot. One of your rules is probably fighting another one.';
    }

    const requiredMet = objectives
      .filter((objective) =>
        this.mission.objectives.find((item) => item.id === objective.objectiveId)?.required,
      )
      .every((objective) => objective.achieved);

    if (requiredMet && !failureReason) {
      this.finish(true, null, objectives);
    } else if (failureReason) {
      this.finish(false, failureReason, objectives);
    }
  }

  private finish(success: boolean, failureReason: string | null, objectives: ObjectiveResult[]): void {
    this.phase = success ? 'succeeded' : 'failed';
    this.telemetry.ticks = this.tick;
    this.telemetry.elapsedSeconds = round(this.elapsedMs / 1000, 1);
    this.telemetry.energyRemaining = round(this.rover.energy, 1);
    this.telemetry.energyUsed = round(this.telemetry.energyUsed, 1);

    const hasUncertaintyRule = this.config.program.rules.some(
      (rule) =>
        rule.enabled &&
        (rule.condition.type === 'ai_uncertain' || rule.action.type === 'request_human_help'),
    );

    const scoreInput: ScoreInput = {
      mission: this.mission,
      telemetry: this.telemetry,
      objectives,
      success,
      program: this.config.program,
      sensorCount: this.stats.sensorTypes.length,
      modelAccuracy: this.config.model?.metrics.accuracy ?? null,
      hasUncertaintyRule,
      perClassCounts: this.config.model
        ? Object.values(this.config.model.metrics.perClassCount)
        : [],
      previouslyFailed: this.config.previouslyFailed,
    };

    const score = computeScore(scoreInput);

    this.result = {
      missionId: this.mission.id,
      attemptNumber: this.config.attemptNumber,
      success,
      failureReason,
      score,
      telemetry: this.telemetry,
      objectives,
      explanations: this.buildExplanations(success, failureReason),
      suggestions: buildSuggestions(scoreInput, score),
      badgesEarned: awardBadges(scoreInput, score),
      completedAt: Date.now(),
      difficulty: this.config.difficulty,
    };

    this.log('end', success ? `Mission complete. Score ${score.total}/100.` : `Mission failed. ${failureReason}`);
  }

  /**
   * The "why did the rover do that?" narrative. Built from the actual event log
   * rather than from guesses, so it always matches what students watched happen.
   */
  private buildExplanations(success: boolean, failureReason: string | null): string[] {
    const explanations: string[] = [];

    if (!success && failureReason) explanations.push(failureReason);

    const collisions = this.events.filter((event) => event.kind === 'collision');
    if (collisions.length > 0) {
      explanations.push(
        `The rover collided ${collisions.length} time(s). Each time, the rule in charge was the one before the crash in the event log — usually "drive forward" firing when the distance rule had not triggered yet.`,
      );
    }

    const wrongPredictions = this.events.filter(
      (event) => event.kind === 'prediction' && event.data?.correct === false,
    );
    if (wrongPredictions.length > 0) {
      const first = wrongPredictions[0];
      const predicted = String(first.data?.predicted ?? '');
      const actual = String(first.data?.actual ?? '');
      explanations.push(
        `The AI made ${wrongPredictions.length} incorrect prediction(s). For example, it saw a ${LABEL_INFO[actual as keyof typeof LABEL_INFO]?.name ?? actual} but classified it as ${LABEL_INFO[predicted as keyof typeof LABEL_INFO]?.name ?? predicted}.`,
      );
    }

    if (this.config.model) {
      const counts = this.config.model.metrics.perClassCount;
      const entries = Object.entries(counts) as [keyof typeof LABEL_INFO, number][];
      const sorted = [...entries].sort((a, b) => b[1] - a[1]);
      const most = sorted[0];
      const least = sorted[sorted.length - 1];
      if (most && least && most[1] > least[1] * 2.2) {
        explanations.push(
          `Your training data contained ${most[1]} ${LABEL_INFO[most[0]].name} examples but only ${least[1]} ${LABEL_INFO[least[0]].name} examples. Unbalanced data makes the model favour the common label.`,
        );
      }
    }

    if (this.telemetry.humanInterventions > 0) {
      explanations.push(
        `The rover asked a human for confirmation ${this.telemetry.humanInterventions} time(s) because the AI's confidence dropped below your threshold. That is exactly what a responsible autonomous system should do.`,
      );
    }

    if (this.config.build.motorPower >= 90) {
      explanations.push(
        `Motor power stayed at ${this.config.build.motorPower}%, so the rover used energy faster than it gained speed. Energy cost rises much more steeply than speed does.`,
      );
    }

    if (this.telemetry.hazardsEntered > 0) {
      explanations.push(
        `The rover entered flood water or debris ${this.telemetry.hazardsEntered} time(s), which more than doubles energy use per tile.`,
      );
    }

    if (explanations.length === 0) {
      explanations.push(
        'The rover followed your rules from top to bottom on every step and nothing unexpected happened.',
      );
    }

    return explanations;
  }

  // ----------------------------------------------------------------- output

  private log(kind: SimulationEvent['kind'], message: string, data?: Record<string, unknown>): void {
    this.events.push({ tick: this.tick, timeMs: Math.round(this.elapsedMs), kind, message, data });
    // Keep the log bounded — a long run must not grow memory without limit.
    if (this.events.length > 800) this.events.splice(0, 200);
  }

  getSnapshot(): SimulationSnapshot {
    return {
      phase: this.phase,
      tick: this.tick,
      elapsedMs: this.elapsedMs,
      rover: { ...this.rover },
      tiles: this.world.toTiles(),
      readings: this.readings,
      prediction: this.prediction,
      predictionCorrect: this.predictionCorrect,
      activeRule: this.activeRule,
      decisionReason: this.decisionReason,
      objectives: this.evaluateObjectives(),
      events: this.events,
      result: this.result,
      sensedTiles: this.config.navigator
        ? this.perceived.map(({ x, y }) => ({ x, y }))
        : sensedTiles(this.rover.x, this.rover.y, this.rover.heading, this.stats.sensorRange),
      navigation: this.config.navigator?.overlay(),
    };
  }

  getTimeLimit(): number {
    return this.timeLimit;
  }

  getStats() {
    return this.stats;
  }
}
