import { it } from 'vitest';
import { Simulation } from '@/game/engine/simulation';
import { computeEngineerStats, createDefaultEngineerBuild } from '@/engineer/catalogue';
import { DEFAULT_NAVIGATION, createEngineerSimulationConfig } from '@/engineer/maze';
import type { EngineerBuild, NavigationConfig } from '@/engineer/types';

function run(build: EngineerBuild, nav: NavigationConfig) {
  const sim = new Simulation(createEngineerSimulationConfig(build, nav));
  sim.start();
  for (let i = 0; i < 4000 && !sim.isFinished(); i++) sim.step();
  const s = sim.getSnapshot();
  const st = computeEngineerStats(build);
  return `${s.result?.success ? 'OK ' : 'FAIL'} t=${s.result?.telemetry.elapsedSeconds}s steps=${s.tick} col=${s.rover.collisions} E=${s.result?.telemetry.energyUsed}/${st.batteryCapacity} haz=${s.result?.telemetry.hazardsEntered} compute=${s.navigation?.totalComputeMs} stepMs=${st.stepMs.toFixed(0)} ${s.result?.failureReason ?? ''}`;
}

it('scratch', () => {
  const d = createDefaultEngineerBuild();
  const variants: [string, EngineerBuild, NavigationConfig][] = [
    ['default astar', d, DEFAULT_NAVIGATION],
    ['astar turnAware', d, { ...DEFAULT_NAVIGATION, turnAware: true }],
    ['astar every_step', d, { ...DEFAULT_NAVIGATION, replan: 'every_step' }],
    ['dijkstra', d, { ...DEFAULT_NAVIGATION, planner: 'dijkstra' }],
    ['greedy', d, { ...DEFAULT_NAVIGATION, planner: 'greedy' }],
    ['wall L batt', { ...d, partIds: d.partIds.map((p) => (p === 'battery-m' ? 'battery-l' : p)) }, { ...DEFAULT_NAVIGATION, planner: 'wall_follower' }],
    ['wall left L', { ...d, partIds: d.partIds.map((p) => (p === 'battery-m' ? 'battery-l' : p)) }, { ...DEFAULT_NAVIGATION, planner: 'wall_follower', hand: 'left' }],
    ['bumper only', { ...d, partIds: ['chassis-aluminium', 'drive-150', 'battery-m', 'sensor-bumper', 'compute-npu'] }, DEFAULT_NAVIGATION],
    ['tof only', { ...d, partIds: ['chassis-aluminium', 'drive-150', 'battery-m', 'sensor-tof', 'compute-npu'] }, DEFAULT_NAVIGATION],
    ['racer 500 L', { ...d, throttle: 100, partIds: ['chassis-carbon', 'drive-500', 'battery-l', 'sensor-lidar-360', 'compute-fpga'] }, { ...DEFAULT_NAVIGATION, turnAware: true }],
    ['racer 500 M', { ...d, throttle: 100, partIds: ['chassis-carbon', 'drive-500', 'battery-m', 'sensor-lidar-360', 'compute-fpga'] }, { ...DEFAULT_NAVIGATION, turnAware: true }],
    ['300 M carbon', { ...d, throttle: 100, partIds: ['chassis-carbon', 'drive-300', 'battery-m', 'sensor-lidar-360', 'compute-fpga'] }, { ...DEFAULT_NAVIGATION, turnAware: true }],
    ['300 M 3d lidar', { ...d, throttle: 100, partIds: ['chassis-carbon', 'drive-300', 'battery-m', 'sensor-lidar-3d', 'compute-fpga'] }, { ...DEFAULT_NAVIGATION, turnAware: true }],
    ['300 M stereo+lidar', { ...d, throttle: 100, partIds: ['chassis-carbon', 'drive-300', 'battery-m', 'sensor-lidar-360', 'sensor-stereo', 'compute-fpga'] }, { ...DEFAULT_NAVIGATION, turnAware: true }],
    ['cpu every step TA', { ...d, partIds: ['chassis-aluminium', 'drive-150', 'battery-m', 'sensor-lidar-360', 'compute-cpu'] }, { ...DEFAULT_NAVIGATION, turnAware: true, replan: 'every_step' }],
    ['gpu every step TA', { ...d, partIds: ['chassis-aluminium', 'drive-150', 'battery-m', 'sensor-lidar-360', 'compute-gpu'] }, { ...DEFAULT_NAVIGATION, turnAware: true, replan: 'every_step' }],
    ['500 L 85%', { ...d, throttle: 85, partIds: ['chassis-carbon', 'drive-500', 'battery-l', 'sensor-lidar-360', 'compute-fpga'] }, DEFAULT_NAVIGATION],
    ['300 L carbon 100', { ...d, throttle: 100, partIds: ['chassis-carbon', 'drive-300', 'battery-l', 'sensor-lidar-360', 'compute-fpga'] }, DEFAULT_NAVIGATION],
    ['300 M carbon 80', { ...d, throttle: 80, partIds: ['chassis-carbon', 'drive-300', 'battery-m', 'sensor-lidar-360', 'compute-fpga'] }, DEFAULT_NAVIGATION],
    ['300 L 3d 100', { ...d, throttle: 100, partIds: ['chassis-carbon', 'drive-300', 'battery-l', 'sensor-lidar-3d', 'compute-fpga'] }, DEFAULT_NAVIGATION],
    ['300 L 2d 100', { ...d, throttle: 100, partIds: ['chassis-carbon', 'drive-300', 'battery-l', 'sensor-lidar-2d', 'compute-fpga'] }, DEFAULT_NAVIGATION],
    ['300 L laser 100', { ...d, throttle: 100, partIds: ['chassis-carbon', 'drive-300', 'battery-l', 'sensor-laser', 'sensor-lidar-2d', 'compute-fpga'] }, DEFAULT_NAVIGATION],
    ['300 L 360 greedy', { ...d, throttle: 100, partIds: ['chassis-carbon', 'drive-300', 'battery-l', 'sensor-lidar-360', 'compute-fpga'] }, { ...DEFAULT_NAVIGATION, planner: 'greedy' }],
    ['300 L 360 unk2', { ...d, throttle: 100, partIds: ['chassis-carbon', 'drive-300', 'battery-l', 'sensor-lidar-360', 'compute-fpga'] }, { ...DEFAULT_NAVIGATION, unknownCost: 2 }],
    ['300 L 360 hz1', { ...d, throttle: 100, partIds: ['chassis-carbon', 'drive-300', 'battery-l', 'sensor-lidar-360', 'sensor-stereo', 'compute-fpga'] }, { ...DEFAULT_NAVIGATION, hazardPenalty: 1 }],
    ['300 L 360 hz1 track', { ...d, throttle: 100, partIds: ['chassis-tracked', 'drive-300', 'battery-l', 'sensor-lidar-360', 'sensor-stereo', 'compute-fpga'] }, { ...DEFAULT_NAVIGATION, hazardPenalty: 1 }],
  ];
  for (const [name, b, n] of variants) console.log(name.padEnd(20), run(b, n));
});
