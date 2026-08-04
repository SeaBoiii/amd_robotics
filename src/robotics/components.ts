/**
 * The Rover Workshop catalogue.
 *
 * Every part is a real trade-off: nothing is strictly better than everything
 * else, and the budget is always too small to buy the whole shop. That tension
 * is the engineering lesson.
 */

import type { RoverBuild, RoverComponent, RoverStats, SensorType } from '@/types';

export const COMPONENTS: RoverComponent[] = [
  // ---------------------------------------------------------------- sensors
  {
    id: 'sensor-distance-basic',
    name: 'Basic Distance Sensor',
    category: 'sensor',
    sensorType: 'distance',
    cost: 20,
    explanation:
      'Sends out a pulse and times the echo to work out how far away the next object is.',
    advantages: ['Cheap and reliable', 'Works in the dark', 'Very fast readings'],
    limitations: ['Only sees straight ahead', 'Short range', 'Confused by soft or angled surfaces'],
    effects: { range: 3, noise: 1 },
    icon: '📡',
  },
  {
    id: 'sensor-distance-long',
    name: 'Long-Range Distance Sensor',
    category: 'sensor',
    sensorType: 'distance',
    cost: 45,
    explanation: 'A laser time-of-flight sensor that sees much further ahead with less noise.',
    advantages: ['Sees 6 tiles ahead', 'Low noise', 'Gives the rover more time to react'],
    limitations: ['Expensive', 'Uses more energy', 'Struggles through heavy rain'],
    effects: { range: 6, noise: 0.6, energyDrain: 1.05 },
    icon: '🔭',
  },
  {
    id: 'sensor-line',
    name: 'Line Sensor',
    category: 'sensor',
    sensorType: 'line',
    cost: 15,
    explanation: 'Looks down at the ground and reports whether it is over a road marking or edge.',
    advantages: ['Very cheap', 'Great for following roads', 'Almost no energy use'],
    limitations: ['Only sees the tile underneath', 'Useless on flooded roads'],
    effects: { range: 1 },
    icon: '➖',
  },
  {
    id: 'sensor-camera',
    name: 'AI Camera',
    category: 'sensor',
    sensorType: 'camera',
    cost: 60,
    explanation:
      'Captures a snapshot each step and feeds it to your trained AI model for classification.',
    advantages: ['Required for every AI rule', 'Recognises five different categories'],
    limitations: ['Costly', 'Uses real energy', 'Accuracy depends on your training data'],
    effects: { range: 4, energyDrain: 1.12 },
    icon: '📷',
  },
  {
    id: 'sensor-colour',
    name: 'Colour Sensor',
    category: 'sensor',
    sensorType: 'colour',
    cost: 25,
    explanation: 'Reads the dominant colour of the tile ahead — handy for spotting green supplies.',
    advantages: ['Cheaper than a camera', 'Simple, predictable output'],
    limitations: ['Fooled by poor lighting', 'Cannot tell shapes apart'],
    effects: { range: 2 },
    icon: '🎨',
  },
  {
    id: 'sensor-temperature',
    name: 'Temperature Sensor',
    category: 'sensor',
    sensorType: 'temperature',
    cost: 18,
    explanation: 'Measures how warm the surroundings are. Flood water reads noticeably cooler.',
    advantages: ['Very low energy', 'Works when the camera cannot see'],
    limitations: ['Slow to respond', 'Only useful in a few situations'],
    effects: { range: 2 },
    icon: '🌡️',
  },
  {
    id: 'sensor-light',
    name: 'Light Sensor',
    category: 'sensor',
    sensorType: 'light',
    cost: 12,
    explanation: 'Measures brightness so the rover knows when the camera will struggle.',
    advantages: ['Extremely cheap', 'Helps you slow down in dim areas'],
    limitations: ['Gives no information about objects'],
    effects: { range: 1 },
    icon: '💡',
  },
  {
    id: 'sensor-sound',
    name: 'Sound Sensor',
    category: 'sensor',
    sensorType: 'sound',
    cost: 22,
    explanation: 'Listens for calls for help nearby, even around a corner.',
    advantages: ['Detects targets the camera cannot see', 'Works in the dark'],
    limitations: ['Noisy readings', 'Cannot tell you the exact direction'],
    effects: { range: 3, noise: 1.4 },
    icon: '🔊',
  },

  // ----------------------------------------------------------------- wheels
  {
    id: 'wheel-standard',
    name: 'Standard Wheels',
    category: 'wheel',
    cost: 10,
    explanation: 'Balanced rubber wheels that work fine on ordinary roads.',
    advantages: ['Cheap', 'Balanced speed and grip'],
    limitations: ['Slips on wet or broken surfaces'],
    effects: { speed: 1, grip: 1 },
    icon: '⚙️',
  },
  {
    id: 'wheel-allterrain',
    name: 'All-Terrain Wheels',
    category: 'wheel',
    cost: 30,
    explanation: 'Deep-tread wheels that hold on to rubble and wet ground.',
    advantages: ['Much better grip', 'Fewer slips near hazards'],
    limitations: ['Slower', 'Heavier, so more energy per tile'],
    effects: { speed: 0.8, grip: 1.8, energyDrain: 1.15 },
    icon: '🛞',
  },
  {
    id: 'wheel-speed',
    name: 'Racing Wheels',
    category: 'wheel',
    cost: 28,
    explanation: 'Smooth, light wheels built purely for speed on clear roads.',
    advantages: ['Fastest option', 'Light, so low energy use'],
    limitations: ['Poor grip', 'Slips often on damaged roads'],
    effects: { speed: 1.5, grip: 0.6, energyDrain: 0.92 },
    icon: '🏎️',
  },

  // ----------------------------------------------------------------- motors
  {
    id: 'motor-standard',
    name: 'Standard Motor',
    category: 'motor',
    cost: 15,
    explanation: 'A dependable motor with a sensible balance of power and efficiency.',
    advantages: ['Affordable', 'Predictable'],
    limitations: ['Nothing special'],
    effects: { speed: 0.4, energyDrain: 1 },
    icon: '🔧',
  },
  {
    id: 'motor-efficient',
    name: 'Efficient Motor',
    category: 'motor',
    cost: 35,
    explanation: 'A brushless motor that turns more of the battery into movement.',
    advantages: ['Uses about 25% less energy', 'Runs cooler'],
    limitations: ['Less top speed', 'Costs more'],
    effects: { speed: 0.25, energyDrain: 0.75 },
    icon: '🔋',
  },
  {
    id: 'motor-power',
    name: 'High-Torque Motor',
    category: 'motor',
    cost: 40,
    explanation: 'Plenty of pulling power for climbing over debris.',
    advantages: ['Fast', 'Handles rough ground'],
    limitations: ['Drinks energy', 'Expensive'],
    effects: { speed: 0.9, energyDrain: 1.35 },
    icon: '⚡',
  },

  // --------------------------------------------------------------- batteries
  {
    id: 'battery-standard',
    name: 'Standard Battery',
    category: 'battery',
    cost: 15,
    explanation: 'A basic pack. Enough for short missions if you drive carefully.',
    advantages: ['Cheap', 'Light'],
    limitations: ['Runs out on long missions'],
    effects: { capacity: 140 },
    icon: '🔋',
  },
  {
    id: 'battery-extended',
    name: 'Extended Battery',
    category: 'battery',
    cost: 40,
    explanation: 'A bigger pack for long rescue routes.',
    advantages: ['80% more capacity'],
    limitations: ['Heavy, so slightly slower', 'Expensive'],
    effects: { capacity: 260, speed: -0.15 },
    icon: '🔌',
  },
  {
    id: 'battery-solar',
    name: 'Solar Top-Up Panel',
    category: 'battery',
    cost: 32,
    explanation: 'A rooftop panel that trickles a little charge back while driving in daylight.',
    advantages: ['Slowly recharges', 'Great for long missions'],
    limitations: ['Adds no capacity on its own', 'Useless in dim areas'],
    effects: { capacity: 60, energyDrain: 0.9 },
    icon: '☀️',
  },

  // ---------------------------------------------------------------- storage
  {
    id: 'storage-small',
    name: 'Small Compartment',
    category: 'storage',
    cost: 10,
    explanation: 'Holds two supply packages.',
    advantages: ['Cheap', 'Light'],
    limitations: ['Only two packages'],
    effects: { cargo: 2 },
    icon: '📦',
  },
  {
    id: 'storage-large',
    name: 'Large Compartment',
    category: 'storage',
    cost: 28,
    explanation: 'Holds four supply packages so you can serve more stations per run.',
    advantages: ['Four packages', 'Fewer trips'],
    limitations: ['Heavy, so slightly slower'],
    effects: { cargo: 4, speed: -0.1 },
    icon: '🗃️',
  },

  // ---------------------------------------------------------- communication
  {
    id: 'comms-radio',
    name: 'Radio Link',
    category: 'communication',
    cost: 25,
    explanation:
      'Lets the rover call the command centre when the AI is unsure, instead of guessing.',
    advantages: ['Enables "Ask a human"', 'Protects your Responsible AI score'],
    limitations: ['Costs budget', 'Each request costs mission time'],
    effects: { telemetry: true },
    icon: '📶',
  },
];

export const COMPONENTS_BY_ID = new Map(COMPONENTS.map((component) => [component.id, component]));

export function getComponent(id: string): RoverComponent | undefined {
  return COMPONENTS_BY_ID.get(id);
}

const BASE_SPEED = 1.2;
const BASE_CAPACITY = 60;

/** Turns a chosen loadout into the numbers the simulator actually uses. */
export function computeStats(build: RoverBuild): RoverStats {
  const components = build.componentIds
    .map((id) => COMPONENTS_BY_ID.get(id))
    .filter((component): component is RoverComponent => Boolean(component));

  let speed = BASE_SPEED;
  let energyDrain = 1;
  let capacity = BASE_CAPACITY;
  let noise = 1;
  let range = 1;
  let grip = 1;
  let cargo = 0;
  let hasTelemetry = false;
  let totalCost = 0;

  for (const component of components) {
    const effects = component.effects;
    totalCost += component.cost;
    if (effects.speed !== undefined) speed += effects.speed;
    if (effects.energyDrain !== undefined) energyDrain *= effects.energyDrain;
    if (effects.capacity !== undefined) capacity += effects.capacity;
    if (effects.noise !== undefined) noise *= effects.noise;
    if (effects.range !== undefined) range = Math.max(range, effects.range);
    if (effects.grip !== undefined) grip = Math.max(grip, effects.grip);
    if (effects.cargo !== undefined) cargo += effects.cargo;
    if (effects.telemetry) hasTelemetry = true;
  }

  // Motor power is the student's live throttle: more speed, disproportionately
  // more energy. This is what makes "leave it at 100%" a losing strategy.
  const powerFactor = build.motorPower / 100;
  speed *= 0.4 + powerFactor * 0.9;
  energyDrain *= 0.5 + powerFactor * powerFactor * 1.1;

  const sensorTypes = Array.from(
    new Set(
      components
        .filter((component) => component.category === 'sensor' && component.sensorType)
        .map((component) => component.sensorType as SensorType),
    ),
  );

  return {
    totalCost,
    speed: Math.max(0.2, speed),
    energyDrain: Math.max(0.15, energyDrain),
    batteryCapacity: capacity,
    sensorNoise: noise,
    sensorRange: range,
    grip,
    cargoCapacity: cargo,
    hasTelemetry,
    sensorTypes,
  };
}

/** A safe, affordable starting rover so no team is ever stuck at zero. */
export function createDefaultBuild(colour = '#22d3ee'): RoverBuild {
  return {
    componentIds: ['sensor-distance-basic', 'wheel-standard', 'motor-standard', 'battery-standard'],
    motorPower: 70,
    colour,
  };
}

export interface BuildProblem {
  severity: 'error' | 'warning';
  message: string;
  hint: string;
}

/**
 * Prevents impossible rovers. Workshop Safe Mode relies on this so that a team
 * can never build something that cannot move and then blame the software.
 */
export function checkBuild(build: RoverBuild, budget: number): BuildProblem[] {
  const problems: BuildProblem[] = [];
  const components = build.componentIds
    .map((id) => COMPONENTS_BY_ID.get(id))
    .filter((component): component is RoverComponent => Boolean(component));

  const has = (category: RoverComponent['category']) =>
    components.some((component) => component.category === category);

  if (!has('wheel')) {
    problems.push({
      severity: 'error',
      message: 'Your rover has no wheels, so it cannot move.',
      hint: 'Add one set of wheels.',
    });
  }
  if (!has('motor')) {
    problems.push({
      severity: 'error',
      message: 'Your rover has no motor.',
      hint: 'Add a motor to turn the wheels.',
    });
  }
  if (!has('battery')) {
    problems.push({
      severity: 'error',
      message: 'Your rover has no battery.',
      hint: 'Add a battery to power everything.',
    });
  }
  if (!has('sensor')) {
    problems.push({
      severity: 'warning',
      message: 'Your rover has no sensors, so it is driving blind.',
      hint: 'A Basic Distance Sensor is cheap and stops most crashes.',
    });
  }

  const stats = computeStats(build);
  if (stats.totalCost > budget) {
    problems.push({
      severity: 'error',
      message: `You are ${stats.totalCost - budget} credits over budget.`,
      hint: 'Remove a part, or swap an expensive one for a cheaper alternative.',
    });
  }

  return problems;
}
