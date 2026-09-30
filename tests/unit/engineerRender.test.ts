import { describe, expect, it } from 'vitest';
import { minimapLayout } from '@/engineer/render/mazeScene';
import {
  clipNear,
  lerpAngle,
  lookAt,
  project,
  toView,
  vec,
  type Viewport,
} from '@/engineer/render/projection';

const viewport: Viewport = { width: 800, height: 600, fov: Math.PI / 3 };

describe('chase camera projection', () => {
  const view = lookAt(vec(0, -3, 2), vec(0, 0, 0.4));

  it('puts what the camera looks at in the centre of the screen', () => {
    const screen = project(toView(view, vec(0, 0, 0.4)), viewport)!;
    expect(screen.x).toBeCloseTo(400, 6);
    expect(screen.y).toBeCloseTo(300, 6);
  });

  it('keeps left of the rover on the left of the screen', () => {
    const left = project(toView(view, vec(-1, 0, 0.4)), viewport)!;
    const right = project(toView(view, vec(1, 0, 0.4)), viewport)!;
    expect(left.x).toBeLessThan(400);
    expect(right.x).toBeGreaterThan(400);
  });

  it('draws higher things higher up and distant things smaller', () => {
    const low = project(toView(view, vec(0, 0, 0)), viewport)!;
    const high = project(toView(view, vec(0, 0, 1)), viewport)!;
    expect(high.y).toBeLessThan(low.y);

    const spread = (y: number) =>
      project(toView(view, vec(1, y, 0.4)), viewport)!.x -
      project(toView(view, vec(-1, y, 0.4)), viewport)!.x;
    expect(spread(6)).toBeLessThan(spread(0));
  });

  it('rejects anything behind the camera', () => {
    expect(project(toView(view, vec(0, -6, 2)), viewport)).toBeNull();
  });
});

describe('near-plane clipping', () => {
  it('cuts a wall the camera is halfway inside instead of dropping it', () => {
    const clipped = clipNear([vec(-1, -1, -1), vec(1, -1, -1), vec(1, 1, 1), vec(-1, 1, 1)]);
    expect(clipped.length).toBeGreaterThanOrEqual(3);
    expect(clipped.every((point) => point.z > 0)).toBe(true);
  });

  it('leaves a fully visible face untouched and discards one fully behind', () => {
    const visible = [vec(0, 0, 1), vec(1, 0, 1), vec(1, 1, 1)];
    expect(clipNear(visible)).toEqual(visible);
    expect(clipNear([vec(0, 0, -1), vec(1, 0, -1), vec(1, 1, -1)])).toEqual([]);
  });
});

describe('heading interpolation', () => {
  const angleBetween = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

  it('turns the short way around the wrap point', () => {
    // Halfway from just under +π to just over -π is the wrap point itself, not 0.
    const wrapped = lerpAngle(Math.PI - 0.1, -Math.PI + 0.1, 0.5);
    expect(angleBetween(wrapped, Math.PI)).toBeCloseTo(0, 6);
    expect(lerpAngle(0, Math.PI / 2, 0.5)).toBeCloseTo(Math.PI / 4, 6);
  });
});

describe('minimap layout', () => {
  const map = { width: 31, height: 21 };

  it('sits inside the bottom-right corner with square cells', () => {
    const viewport = { width: 1200, height: 700 };
    const layout = minimapLayout(viewport, map.width, map.height);
    expect(layout.width).toBeCloseTo(layout.cell * map.width, 6);
    expect(layout.height).toBeCloseTo(layout.cell * map.height, 6);
    expect(layout.x + layout.width).toBeLessThan(viewport.width);
    expect(layout.y + layout.height).toBeLessThan(viewport.height);
    expect(layout.x).toBeGreaterThan(viewport.width / 2);
  });

  it('stays short enough not to swamp a letterboxed stage', () => {
    const viewport = { width: 1800, height: 320 };
    const layout = minimapLayout(viewport, map.width, map.height);
    expect(layout.height).toBeLessThanOrEqual(viewport.height / 3);
    expect(layout.y).toBeGreaterThan(0);
  });
});
