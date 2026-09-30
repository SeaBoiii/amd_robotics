/**
 * Minimal 3D vector maths for the chase-camera maze view.
 *
 * Pure functions, no canvas and no engine: the projection is unit-testable and
 * the renderer stays a thin drawing layer on top.
 *
 * World axes: +x east, +y south (matching tile coordinates), +z up.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Point2 {
  x: number;
  y: number;
}

export interface Viewport {
  width: number;
  height: number;
  /** Vertical field of view in radians. */
  fov: number;
}

/** Camera basis in world space, built once per frame. */
export interface View {
  eye: Vec3;
  right: Vec3;
  up: Vec3;
  forward: Vec3;
}

const NEAR = 0.08;

export function vec(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function normalise(v: Vec3): Vec3 {
  const length = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

export function lookAt(eye: Vec3, target: Vec3): View {
  const forward = normalise(sub(target, eye));
  const worldUp = vec(0, 0, 1);
  // Degenerate only if the camera looks straight down, which the chase rig never does.
  const right = normalise(cross(forward, worldUp));
  const up = cross(right, forward);
  return { eye, right, up, forward };
}

/** World space → camera space, where +z is distance in front of the camera. */
export function toView(view: View, point: Vec3): Vec3 {
  const d = sub(point, view.eye);
  return { x: dot(d, view.right), y: dot(d, view.up), z: dot(d, view.forward) };
}

/** Camera space → pixels. Returns null for anything at or behind the near plane. */
export function project(point: Vec3, viewport: Viewport): Point2 | null {
  if (point.z <= NEAR) return null;
  const scale = viewport.height / 2 / Math.tan(viewport.fov / 2);
  return {
    x: viewport.width / 2 + (point.x / point.z) * scale,
    y: viewport.height / 2 - (point.y / point.z) * scale,
  };
}

/**
 * Sutherland–Hodgman clip against the near plane. Without this, a wall the
 * camera is inside of smears across the screen instead of being cut off.
 */
export function clipNear(polygon: Vec3[]): Vec3[] {
  if (polygon.length === 0) return polygon;
  const out: Vec3[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i];
    const previous = polygon[(i + polygon.length - 1) % polygon.length];
    const currentIn = current.z > NEAR;
    const previousIn = previous.z > NEAR;
    if (currentIn !== previousIn) {
      const t = (NEAR - previous.z) / (current.z - previous.z);
      out.push({
        x: previous.x + (current.x - previous.x) * t,
        y: previous.y + (current.y - previous.y) * t,
        z: NEAR,
      });
    }
    if (currentIn) out.push(current);
  }
  return out;
}

/** Shortest-arc interpolation, so a rover turning west→north never spins the long way. */
export function lerpAngle(from: number, to: number, t: number): number {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * t;
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}
