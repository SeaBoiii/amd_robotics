/**
 * AMD Technology Corner content.
 *
 * Two rules govern everything in this file:
 *  1. No real AMD product benchmark numbers are invented. The comparison
 *     figures below are *illustrative teaching values* and are labelled as
 *     such everywhere they appear in the UI.
 *  2. Analogies are written for 13–16 year olds, not for a datasheet.
 */

import type { EngineerProfile } from '@/types';

export interface ComputeConcept {
  id: string;
  name: string;
  fullName: string;
  icon: string;
  analogy: string;
  whatItDoes: string;
  goodAt: string[];
  lessGoodAt: string[];
  roverExample: string;
}

export const COMPUTE_CONCEPTS: ComputeConcept[] = [
  {
    id: 'cpu',
    name: 'CPU',
    fullName: 'Central Processing Unit',
    icon: '🧠',
    analogy:
      'A brilliant all-rounder student who can solve almost any question, but has to do them one at a time.',
    whatItDoes:
      'Runs the general instructions of a program: reading sensors, checking rules, deciding what to do next.',
    goodAt: ['Following complicated logic', 'Doing many different kinds of job', 'Making decisions quickly'],
    lessGoodAt: ['Doing thousands of identical sums at once'],
    roverExample: 'Your rule engine — "if distance is below 2, turn left" — is CPU work.',
  },
  {
    id: 'gpu',
    name: 'GPU',
    fullName: 'Graphics Processing Unit',
    icon: '🎨',
    analogy:
      'A whole lecture hall of students who each do one simple sum, all at the same instant.',
    whatItDoes:
      'Performs huge numbers of simple calculations in parallel — originally for graphics, now also for training AI models.',
    goodAt: ['Training AI models', 'Image processing', 'Anything repeated thousands of times'],
    lessGoodAt: ['Long chains of decisions that depend on each other'],
    roverExample: 'Training your classifier on thousands of camera samples is GPU-shaped work.',
  },
  {
    id: 'npu',
    name: 'NPU',
    fullName: 'Neural Processing Unit',
    icon: '⚡',
    analogy:
      'A specialist who only does one type of question — but does it faster and using far less energy than anyone else.',
    whatItDoes:
      'Built specifically to run trained AI models efficiently, especially on battery-powered devices.',
    goodAt: ['Running AI models using very little power', 'Fast predictions on a device'],
    lessGoodAt: ['General-purpose programming', 'Jobs it was not designed for'],
    roverExample:
      'A real rescue rover would run your trained model on an NPU so the battery lasts far longer.',
  },
  {
    id: 'fpga',
    name: 'FPGA',
    fullName: 'Field-Programmable Gate Array',
    icon: '🧩',
    analogy:
      'A box of electronic LEGO. You rewire the chip itself into exactly the shape your problem needs.',
    whatItDoes:
      'Hardware that can be reconfigured after it is manufactured, so the circuit matches the task.',
    goodAt: ['Very low, very predictable response times', 'Custom sensor processing', 'Changing as needs change'],
    lessGoodAt: ['Being easy to program', 'Quick experiments'],
    roverExample:
      'An FPGA could process the camera signal before the AI model ever sees it, saving precious milliseconds.',
  },
  {
    id: 'adaptive',
    name: 'Adaptive Computing',
    fullName: 'Adaptive Computing',
    icon: '🔄',
    analogy: 'A team that reorganises itself depending on what today\'s job actually is.',
    whatItDoes:
      'Combines different processor types and hands each job to whichever one suits it best.',
    goodAt: ['Getting the most work from the least energy', 'Handling mixed workloads'],
    lessGoodAt: ['Being simple to design'],
    roverExample:
      'Rules on the CPU, predictions on the NPU, sensor filtering on an FPGA — all in one rover.',
  },
  {
    id: 'edge',
    name: 'Edge AI',
    fullName: 'Edge AI',
    icon: '📍',
    analogy:
      'Doing your homework yourself instead of texting a friend for every single answer.',
    whatItDoes:
      'Runs the AI model on the device itself rather than sending data to a distant server.',
    goodAt: ['Working without internet', 'Fast responses', 'Keeping data private'],
    lessGoodAt: ['Running very large models', 'Devices with tiny batteries'],
    roverExample:
      'Your rover cannot wait 400 ms for a server reply before deciding whether to brake. Edge AI is why.',
  },
];

/**
 * Illustrative comparison values for AMD Performance Mode.
 *
 * These are TEACHING NUMBERS chosen to show the *shape* of the trade-off
 * between processor types. They are not measurements of any real product and
 * the UI states this plainly wherever they are displayed.
 */
export interface ComputeProfile {
  id: string;
  name: string;
  description: string;
  /** Relative, unitless. Higher is faster. */
  inferenceSpeed: number;
  /** Relative energy used per prediction. Lower is better. */
  energyPerPrediction: number;
  /** Relative model size that comfortably fits. */
  modelCapacity: number;
  /** Simulated rover reaction time in milliseconds. */
  reactionTimeMs: number;
  frameRate: number;
  bestFor: string;
}

export const COMPUTE_PROFILES: ComputeProfile[] = [
  {
    id: 'cpu-only',
    name: 'CPU only',
    description: 'Everything runs on the general-purpose processor.',
    inferenceSpeed: 1,
    energyPerPrediction: 1,
    modelCapacity: 1,
    reactionTimeMs: 120,
    frameRate: 30,
    bestFor: 'Simple rules and small models. Easiest to program.',
  },
  {
    id: 'cpu-gpu',
    name: 'CPU + GPU',
    description: 'Predictions are handed to the graphics processor.',
    inferenceSpeed: 4,
    energyPerPrediction: 1.6,
    modelCapacity: 4,
    reactionTimeMs: 45,
    frameRate: 60,
    bestFor: 'Training models and handling bigger images — but it drinks power.',
  },
  {
    id: 'cpu-npu',
    name: 'CPU + NPU',
    description: 'Predictions run on a dedicated AI accelerator.',
    inferenceSpeed: 3.5,
    energyPerPrediction: 0.35,
    modelCapacity: 3,
    reactionTimeMs: 30,
    frameRate: 60,
    bestFor: 'Battery-powered robots. Nearly GPU speed for a fraction of the energy.',
  },
  {
    id: 'adaptive',
    name: 'Adaptive (CPU + NPU + FPGA)',
    description: 'Each job goes to whichever processor suits it best.',
    inferenceSpeed: 5,
    energyPerPrediction: 0.45,
    modelCapacity: 4,
    reactionTimeMs: 18,
    frameRate: 60,
    bestFor: 'Demanding real-world robots where every millisecond matters.',
  },
];

export const PERFORMANCE_DISCLAIMER =
  'These figures are simplified teaching values created for this game. They are NOT benchmarks and do not describe any real AMD product.';

/**
 * Placeholder engineer profiles. AMD volunteers replace these with their own
 * details — see docs/amd-asset-integration.md.
 */
export const ENGINEER_PROFILES: EngineerProfile[] = [
  {
    name: 'Placeholder — Volunteer Engineer',
    role: 'Hardware Engineer',
    team: 'Add your team here',
    journey:
      'Describe the path from school subjects, through further study, to the job you do now. Two or three sentences is plenty.',
    currentProject: 'Describe, at a high level, the kind of problem you work on.',
    advice:
      'The one thing you wish someone had told you at 15. Students remember specific advice far better than general encouragement.',
    linkLabel: 'Add an optional video or slide link',
    linkUrl: '',
    avatar: '👩‍💻',
  },
  {
    name: 'Placeholder — Volunteer Engineer',
    role: 'Software Engineer',
    team: 'Add your team here',
    journey: 'Replace this text with your own story.',
    currentProject: 'Replace this text with your current project area.',
    advice: 'Replace this text with your advice to students.',
    linkLabel: 'Add an optional video or slide link',
    linkUrl: '',
    avatar: '👨‍🔬',
  },
];
