/**
 * The one place React and Phaser touch.
 *
 * Rules of this boundary:
 *  - React owns the DOM container and the Phaser lifecycle.
 *  - Snapshots are pushed *into* Phaser imperatively via a ref. They never pass
 *    through React state, so a 3-times-a-second simulation does not trigger a
 *    reconciliation of the whole screen.
 *  - Phaser never calls back into React and never reads a store.
 *
 * If Phaser fails to start (no canvas, blocked WebGL, ancient browser), the
 * component reports it and the simulator falls back to the accessible
 * text-and-grid view, so the workshop continues.
 */

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import type { SimulationSnapshot } from '@/types';
import { MissionScene, TILE_SIZE, type SceneOptions } from '@/game/scenes/MissionScene';

export interface PhaserStageProps {
  mapWidth: number;
  mapHeight: number;
  roverColour: string;
  reducedMotion: boolean;
  showSensorOverlay: boolean;
  showDebug: boolean;
  /** Called once with a push function the parent can use each frame. */
  onReady: (push: (snapshot: SimulationSnapshot) => void) => void;
  onFailure: (message: string) => void;
}

export function PhaserStage({
  mapWidth,
  mapHeight,
  roverColour,
  reducedMotion,
  showSensorOverlay,
  showDebug,
  onReady,
  onFailure,
}: PhaserStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<MissionScene | null>(null);

  // Create the game exactly once per map size. Options are pushed separately.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = mapWidth * TILE_SIZE;
    const height = mapHeight * TILE_SIZE;

    const options: SceneOptions = {
      width,
      height,
      roverColour,
      reducedMotion,
      showSensorOverlay,
      showDebug,
    };

    let scene: MissionScene;
    let game: Phaser.Game;

    try {
      scene = new MissionScene(options);
      game = new Phaser.Game({
        // AUTO falls back to Canvas when WebGL is unavailable, which is common
        // on locked-down school machines and old integrated drivers.
        type: Phaser.AUTO,
        parent: container,
        width,
        height,
        backgroundColor: '#0a0f1a',
        scene: [scene],
        banner: false,
        audio: { noAudio: true },
        scale: {
          mode: Phaser.Scale.FIT,
          // The stage element centres the canvas with CSS grid. Letting Phaser
          // also apply its own centring margins offsets the map twice.
          autoCenter: Phaser.Scale.NO_CENTER,
          max: { width, height },
        },
        render: { pixelArt: false, antialias: true },
      });
    } catch (cause) {
      onFailure(cause instanceof Error ? cause.message : 'Phaser could not start.');
      return;
    }

    gameRef.current = game;
    sceneRef.current = scene;

    onReady((snapshot) => sceneRef.current?.applySnapshot(snapshot));

    return () => {
      sceneRef.current = null;
      gameRef.current = null;
      game.destroy(true);
    };
    // Recreating on map size change is correct: it is a different world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapWidth, mapHeight]);

  // Cosmetic options can change mid-run without rebuilding the game.
  useEffect(() => {
    sceneRef.current?.setOptions({
      roverColour,
      reducedMotion,
      showSensorOverlay,
      showDebug,
    });
  }, [roverColour, reducedMotion, showSensorOverlay, showDebug]);

  return <div ref={containerRef} className="phaser-stage" aria-hidden="true" />;
}
