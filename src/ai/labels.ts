/**
 * Label metadata for the rover's vision task.
 *
 * Colour is never the only signal: every label also carries a `shape` token and
 * an icon so the UI stays readable for colour-blind students and on washed-out
 * classroom projectors.
 */

import type { LabelId, LabelInfo } from '@/types';
import { LABELS } from '@/types';

export const LABEL_INFO: Record<LabelId, LabelInfo> = {
  clear_path: {
    id: 'clear_path',
    name: 'Clear Path',
    description: 'Open road with nothing in the way. Safe to drive at normal speed.',
    colour: '#38bdf8',
    shape: 'circle',
    icon: '▬',
  },
  obstacle: {
    id: 'obstacle',
    name: 'Obstacle',
    description: 'Fallen debris or a blocked lane. The rover must steer around it.',
    colour: '#f59e0b',
    shape: 'square',
    icon: '▲',
  },
  person_target: {
    id: 'person_target',
    name: 'Person or Target',
    description: 'Someone waiting for help, or an important item to locate.',
    colour: '#a855f7',
    shape: 'triangle',
    icon: '★',
  },
  hazard_zone: {
    id: 'hazard_zone',
    name: 'Hazard Zone',
    description: 'Flood water or an unsafe area. Driving in costs energy and points.',
    colour: '#ef4444',
    shape: 'diamond',
    icon: '⚠',
  },
  supply_station: {
    id: 'supply_station',
    name: 'Supply Station',
    description: 'A drop-off point where emergency supplies are delivered.',
    colour: '#22c55e',
    shape: 'hexagon',
    icon: '✚',
  },
};

export const LABEL_LIST: LabelInfo[] = LABELS.map((id) => LABEL_INFO[id]);

/**
 * Feature names, in vector order. These are shown to students in the AI Lab so
 * that "features" stops being a magic word and becomes six numbers they can
 * actually read off a camera snapshot.
 */
export const FEATURE_NAMES = [
  'Brightness',
  'Edges',
  'Green',
  'Blue',
  'Warm colour',
  'Roughness',
] as const;

export const FEATURE_DESCRIPTIONS: Record<string, string> = {
  Brightness: 'How light or dark the snapshot is overall.',
  Edges: 'How many sharp lines the camera can see. Flat roads have few edges.',
  Green: 'How much greenery or green packaging is in view.',
  Blue: 'How much water or blue surface is in view.',
  'Warm colour': 'How much orange, red or yellow is in view, like safety vests and tape.',
  Roughness: 'How bumpy and uneven the surface texture looks.',
};

export const FEATURE_COUNT = FEATURE_NAMES.length;
