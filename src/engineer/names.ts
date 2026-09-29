/** Friendly auto-generated engineer names, unique against the current leaderboard. */

import { nameKey } from './leaderboard';

const ADJECTIVES = [
  'Turbo', 'Quantum', 'Silent', 'Rapid', 'Crimson', 'Atomic', 'Nimble', 'Stellar', 'Iron', 'Neon',
  'Swift', 'Lunar', 'Plasma', 'Vector', 'Photon', 'Cobalt', 'Hyper', 'Binary', 'Solar', 'Zen',
];

const NOUNS = [
  'Falcon', 'Rover', 'Circuit', 'Otter', 'Comet', 'Gecko', 'Piston', 'Lynx', 'Tensor', 'Kernel',
  'Raptor', 'Beacon', 'Sprocket', 'Mantis', 'Pixel', 'Nebula', 'Cheetah', 'Voltage', 'Axiom', 'Drone',
];

export function generateEngineerName(taken: Iterable<string> = [], random: () => number = Math.random): string {
  const used = new Set(Array.from(taken, nameKey));
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  let candidate = '';
  for (let attempt = 0; attempt < 50; attempt++) {
    candidate = `${pick(ADJECTIVES)} ${pick(NOUNS)} ${10 + Math.floor(random() * 90)}`;
    if (!used.has(nameKey(candidate))) return candidate;
  }
  return candidate;
}
