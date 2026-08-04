/** The rover build a team has assembled in the Rover Workshop. */

import { create } from 'zustand';
import type { RoverBuild } from '@/types';
import { createDefaultBuild } from '@/robotics/components';
import { persisted } from './persisted';

interface RoverState {
  build: RoverBuild;
  toggleComponent(componentId: string): void;
  setComponents(componentIds: string[]): void;
  setMotorPower(power: number): void;
  setColour(colour: string): void;
  resetBuild(): void;
}

export const useRoverStore = create<RoverState>()(
  persisted(
    (set, get) => ({
      build: createDefaultBuild(),

      toggleComponent: (componentId) => {
        const { componentIds } = get().build;
        const next = componentIds.includes(componentId)
          ? componentIds.filter((id) => id !== componentId)
          : [...componentIds, componentId];
        set({ build: { ...get().build, componentIds: next } });
      },

      setComponents: (componentIds) => set({ build: { ...get().build, componentIds } }),
      setMotorPower: (power) =>
        set({ build: { ...get().build, motorPower: Math.round(Math.min(100, Math.max(10, power))) } }),
      setColour: (colour) => set({ build: { ...get().build, colour } }),
      resetBuild: () => set({ build: createDefaultBuild(get().build.colour) }),
    }),
    { key: 'rover', partialize: ({ build }) => ({ build }) },
  ),
);
