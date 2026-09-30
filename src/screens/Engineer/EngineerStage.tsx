/**
 * Canvas host for the third-person maze view.
 *
 * React owns the element and the animation loop; snapshots are pushed into the
 * scene through a ref so a running simulation never re-renders the screen.
 */

import { useEffect, useRef } from 'react';
import type { SimulationSnapshot } from '@/types';
import { MazeScene } from '@/engineer/render/mazeScene';

export interface EngineerStageProps {
  mapWidth: number;
  mapHeight: number;
  roverColour: string;
  reducedMotion: boolean;
  onReady: (push: (snapshot: SimulationSnapshot) => void) => void;
  onFailure: (message: string) => void;
}

export function EngineerStage({
  mapWidth,
  mapHeight,
  roverColour,
  reducedMotion,
  onReady,
  onFailure,
}: EngineerStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<MazeScene | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let scene: MazeScene;
    try {
      scene = new MazeScene(canvas, mapWidth, mapHeight, { roverColour, reducedMotion });
    } catch (cause) {
      onFailure(cause instanceof Error ? cause.message : 'The 3D view could not start.');
      return;
    }
    sceneRef.current = scene;

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width < 2 || height < 2) return;
      // Capped so a 4K wall display does not quadruple the fill cost.
      scene.resize(width, height, Math.min(window.devicePixelRatio || 1, 1.5));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      scene.render(delta);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    onReady((snapshot) => sceneRef.current?.applySnapshot(snapshot));

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      sceneRef.current = null;
    };
    // The scene is rebuilt only for a different map; options are pushed below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapWidth, mapHeight]);

  useEffect(() => {
    sceneRef.current?.setOptions({ roverColour, reducedMotion });
  }, [roverColour, reducedMotion]);

  return (
    <div ref={containerRef} className="engineer-stage">
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  );
}
