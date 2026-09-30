/**
 * Third-person vector renderer for the Engineer Challenge maze.
 *
 * Flat-shaded polygons on a plain 2D canvas with a painter's-algorithm depth
 * sort — no 3D engine, no assets, no new dependency. It draws only what the
 * rover has discovered, so the fog of war is literal: unexplored ground is void.
 */

import type { SimulationSnapshot } from '@/types';
import { clamp } from '@/utils/format';
import {
  clipNear,
  cross,
  dot,
  lerp,
  lerpAngle,
  lookAt,
  normalise,
  project,
  sub,
  toView,
  vec,
  type Point2,
  type Vec3,
  type View,
  type Viewport,
} from './projection';

export interface MazeSceneOptions {
  roverColour: string;
  reducedMotion: boolean;
}

interface Face {
  points: Vec3[];
  depth: number;
  fill: string;
  stroke: string;
}

/** Only cells this close to the rover are drawn; the rest fade into the dark. */
const DRAW_RADIUS = 10;
const FOG_START = 4.5;
const WALL_HEIGHT = 1;
const FOV = (58 * Math.PI) / 180;

const LIGHT = normalise(vec(0.35, -0.55, 0.75));
const SKY_TOP = '#070d1a';
const SKY_HORIZON = '#122238';

type Rgb = [number, number, number];

const VOID: Rgb = [6, 9, 16];
const FLOOR: Rgb = [32, 48, 78];
const FLOOR_HAZARD: Rgb = [14, 79, 107];
const WALL: Rgb = [58, 78, 112];
const WALL_TOP: Rgb = [92, 116, 158];
const GOAL: Rgb = [34, 197, 94];
const PATH: Rgb = [251, 191, 36];
const BACKDROP: Rgb = [7, 13, 26];

function hexToRgb(hex: string): Rgb {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.replace(/./g, (c) => c + c) : value;
  const int = Number.parseInt(full, 16);
  return Number.isNaN(int) ? [34, 211, 238] : [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function css(colour: Rgb, brightness: number, fog: number): string {
  const mixed = colour.map((channel, index) =>
    Math.round(clamp(channel * brightness * (1 - fog) + BACKDROP[index] * fog, 0, 255)),
  );
  return `rgb(${mixed[0]} ${mixed[1]} ${mixed[2]})`;
}

export class MazeScene {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly width: number;
  private readonly height: number;
  private options: MazeSceneOptions;
  private roverRgb: Rgb;

  private snapshot: SimulationSnapshot | null = null;
  /** Smoothed pose, so the camera glides between simulation steps. */
  private pose = { x: 0, y: 0, yaw: 0, started: false };
  private viewport: Viewport = { width: 1, height: 1, fov: FOV };

  constructor(
    canvas: HTMLCanvasElement,
    mapWidth: number,
    mapHeight: number,
    options: MazeSceneOptions,
  ) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser cannot draw on a 2D canvas.');
    this.canvas = canvas;
    this.context = context;
    this.width = mapWidth;
    this.height = mapHeight;
    this.options = options;
    this.roverRgb = hexToRgb(options.roverColour);
  }

  setOptions(options: Partial<MazeSceneOptions>): void {
    this.options = { ...this.options, ...options };
    if (options.roverColour) this.roverRgb = hexToRgb(options.roverColour);
  }

  applySnapshot(snapshot: SimulationSnapshot): void {
    this.snapshot = snapshot;
  }

  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    this.canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    this.canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.viewport = { width: cssWidth, height: cssHeight, fov: FOV };
  }

  /** `delta` is seconds since the last frame; drives only cosmetic smoothing. */
  render(delta: number): void {
    const snapshot = this.snapshot;
    const { context } = this;
    this.drawSky();
    if (!snapshot) return;

    const targetX = snapshot.rover.x + 0.5;
    const targetY = snapshot.rover.y + 0.5;
    const targetYaw = headingYaw(snapshot.rover.heading);

    if (!this.pose.started || this.options.reducedMotion) {
      this.pose = { x: targetX, y: targetY, yaw: targetYaw, started: true };
    } else {
      const t = clamp(delta * 9, 0, 1);
      this.pose.x = lerp(this.pose.x, targetX, t);
      this.pose.y = lerp(this.pose.y, targetY, t);
      this.pose.yaw = lerpAngle(this.pose.yaw, targetYaw, t);
    }

    const forward = vec(Math.cos(this.pose.yaw), Math.sin(this.pose.yaw), 0);
    const rover = vec(this.pose.x, this.pose.y, 0);
    const eye = vec(
      rover.x - forward.x * 3 + LIGHT.x * 0.05,
      rover.y - forward.y * 3,
      2.15,
    );
    const view = lookAt(eye, vec(rover.x + forward.x * 1.6, rover.y + forward.y * 1.6, 0.4));

    const faces: Face[] = [];
    this.collectTerrain(snapshot, view, faces);
    this.collectGoal(snapshot, view, faces);
    this.collectPath(snapshot, view, faces);
    this.collectRover(view, rover, this.pose.yaw, faces);

    faces.sort((a, b) => b.depth - a.depth);

    context.lineJoin = 'round';
    for (const face of faces) {
      const screen = this.toScreen(face.points);
      if (screen.length < 3) continue;
      context.beginPath();
      context.moveTo(screen[0].x, screen[0].y);
      for (let i = 1; i < screen.length; i++) context.lineTo(screen[i].x, screen[i].y);
      context.closePath();
      context.fillStyle = face.fill;
      context.fill();
      context.strokeStyle = face.stroke;
      context.lineWidth = 1;
      context.stroke();
    }

    this.drawMinimap(snapshot);
  }

  /** Flat overview in the corner: the chase camera alone hides overall progress. */
  private drawMinimap(snapshot: SimulationSnapshot): void {
    const known = snapshot.navigation?.known;
    if (!known) return;

    const { context, viewport } = this;
    const layout = minimapLayout(viewport, this.width, this.height);
    const { cell, x: originX, y: originY, width, height } = layout;

    context.save();
    context.fillStyle = 'rgb(4 7 14 / 82%)';
    context.strokeStyle = 'rgb(148 163 184 / 45%)';
    context.lineWidth = 1;
    context.beginPath();
    context.rect(originX - 6, originY - 6, width + 12, height + 12);
    context.fill();
    context.stroke();

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const state = known[y * this.width + x];
        if (state === '?') continue;
        context.fillStyle =
          state === '#' ? 'rgb(90 114 154)' : state === '~' ? 'rgb(14 79 107)' : 'rgb(32 48 78)';
        context.fillRect(originX + x * cell, originY + y * cell, cell, cell);
      }
    }

    context.fillStyle = 'rgb(251 191 36 / 85%)';
    for (const step of snapshot.navigation?.plannedPath ?? []) {
      context.fillRect(
        originX + (step.x + 0.25) * cell,
        originY + (step.y + 0.25) * cell,
        Math.max(1, cell * 0.5),
        Math.max(1, cell * 0.5),
      );
    }

    const goal = snapshot.navigation?.goal;
    if (goal) {
      context.fillStyle = 'rgb(34 197 94)';
      context.fillRect(originX + goal.x * cell, originY + goal.y * cell, cell, cell);
    }

    const size = Math.max(3, cell * 0.9);
    context.translate(originX + this.pose.x * cell, originY + this.pose.y * cell);
    context.rotate(this.pose.yaw);
    context.fillStyle = this.options.roverColour;
    context.beginPath();
    context.moveTo(size, 0);
    context.lineTo(-size * 0.7, size * 0.7);
    context.lineTo(-size * 0.7, -size * 0.7);
    context.closePath();
    context.fill();
    context.restore();
  }

  private toScreen(points: Vec3[]): Point2[] {
    const clipped = clipNear(points);
    const screen: Point2[] = [];
    for (const point of clipped) {
      const projected = project(point, this.viewport);
      if (projected) screen.push(projected);
    }
    return screen;
  }

  private drawSky(): void {
    const { context, viewport } = this;
    const gradient = context.createLinearGradient(0, 0, 0, viewport.height);
    gradient.addColorStop(0, SKY_TOP);
    gradient.addColorStop(1, SKY_HORIZON);
    context.fillStyle = gradient;
    context.fillRect(0, 0, viewport.width, viewport.height);
  }

  /** Pushes a world-space quad, shaded by its normal and faded by distance. */
  private addQuad(
    faces: Face[],
    view: View,
    corners: Vec3[],
    colour: Rgb,
    distance: number,
    edge = 0.45,
  ): void {
    const points = corners.map((corner) => toView(view, corner));
    if (points.every((point) => point.z <= 0)) return;

    const normal = normalise(
      cross(sub(corners[1], corners[0]), sub(corners[2], corners[0])),
    );
    const brightness = 0.55 + 0.45 * Math.abs(dot(normal, LIGHT));
    const fog = clamp((distance - FOG_START) / (DRAW_RADIUS - FOG_START), 0, 0.92);

    faces.push({
      points,
      depth: points.reduce((sum, point) => sum + point.z, 0) / points.length,
      fill: css(colour, brightness, fog),
      stroke: css(colour, brightness * (1 + edge), fog),
    });
  }

  private collectTerrain(snapshot: SimulationSnapshot, view: View, faces: Face[]): void {
    const known = snapshot.navigation?.known ?? '';
    const cx = Math.round(this.pose.x);
    const cy = Math.round(this.pose.y);

    for (let y = cy - DRAW_RADIUS; y <= cy + DRAW_RADIUS; y++) {
      if (y < 0 || y >= this.height) continue;
      for (let x = cx - DRAW_RADIUS; x <= cx + DRAW_RADIUS; x++) {
        if (x < 0 || x >= this.width) continue;
        const distance = Math.hypot(x + 0.5 - this.pose.x, y + 0.5 - this.pose.y);
        if (distance > DRAW_RADIUS) continue;

        const cell = known[y * this.width + x] ?? '?';
        if (cell === '?') {
          this.addQuad(faces, view, floorQuad(x, y, -0.02), VOID, distance, 0.15);
          continue;
        }
        if (cell === '#') {
          this.addWall(faces, view, known, x, y, distance);
          continue;
        }
        this.addQuad(faces, view, floorQuad(x, y, 0), cell === '~' ? FLOOR_HAZARD : FLOOR, distance);
      }
    }
  }

  /** Draws only the faces of a wall block that a neighbouring open cell can see. */
  private addWall(
    faces: Face[],
    view: View,
    known: string,
    x: number,
    y: number,
    distance: number,
  ): void {
    const solid = (nx: number, ny: number) =>
      nx < 0 || ny < 0 || nx >= this.width || ny >= this.height
        ? true
        : known[ny * this.width + nx] === '#';

    const h = WALL_HEIGHT;
    this.addQuad(
      faces,
      view,
      [vec(x, y, h), vec(x + 1, y, h), vec(x + 1, y + 1, h), vec(x, y + 1, h)],
      WALL_TOP,
      distance,
      0.35,
    );
    if (!solid(x, y - 1)) {
      this.addQuad(faces, view, [vec(x, y, 0), vec(x + 1, y, 0), vec(x + 1, y, h), vec(x, y, h)], WALL, distance);
    }
    if (!solid(x, y + 1)) {
      this.addQuad(faces, view, [vec(x + 1, y + 1, 0), vec(x, y + 1, 0), vec(x, y + 1, h), vec(x + 1, y + 1, h)], WALL, distance);
    }
    if (!solid(x - 1, y)) {
      this.addQuad(faces, view, [vec(x, y + 1, 0), vec(x, y, 0), vec(x, y, h), vec(x, y + 1, h)], WALL, distance);
    }
    if (!solid(x + 1, y)) {
      this.addQuad(faces, view, [vec(x + 1, y, 0), vec(x + 1, y + 1, 0), vec(x + 1, y + 1, h), vec(x + 1, y, h)], WALL, distance);
    }
  }

  private collectGoal(snapshot: SimulationSnapshot, view: View, faces: Face[]): void {
    const goal = snapshot.navigation?.goal;
    if (!goal) return;
    const distance = Math.hypot(goal.x + 0.5 - this.pose.x, goal.y + 0.5 - this.pose.y);
    // The exit is always drawn, even unexplored: it is the one coordinate the rover starts with.
    const fade = Math.min(distance, DRAW_RADIUS - 0.5);
    this.addQuad(faces, view, floorQuad(goal.x, goal.y, 0.015), GOAL, fade, 0.6);
    for (const corner of [
      [0.28, 0.28],
      [0.72, 0.28],
      [0.72, 0.72],
      [0.28, 0.72],
    ] as const) {
      const [ox, oy] = corner;
      this.addQuad(
        faces,
        view,
        [
          vec(goal.x + ox - 0.04, goal.y + oy, 0),
          vec(goal.x + ox + 0.04, goal.y + oy, 0),
          vec(goal.x + ox + 0.04, goal.y + oy, 1.5),
          vec(goal.x + ox - 0.04, goal.y + oy, 1.5),
        ],
        GOAL,
        fade,
        0.7,
      );
    }
  }

  private collectPath(snapshot: SimulationSnapshot, view: View, faces: Face[]): void {
    const path = snapshot.navigation?.plannedPath ?? [];
    for (let i = 1; i < path.length; i++) {
      const from = path[i - 1];
      const to = path[i];
      const distance = Math.hypot(to.x + 0.5 - this.pose.x, to.y + 0.5 - this.pose.y);
      if (distance > DRAW_RADIUS) continue;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      // Half-width across the direction of travel.
      const nx = -dy * 0.09;
      const ny = dx * 0.09;
      this.addQuad(
        faces,
        view,
        [
          vec(from.x + 0.5 + nx, from.y + 0.5 + ny, 0.02),
          vec(to.x + 0.5 + nx, to.y + 0.5 + ny, 0.02),
          vec(to.x + 0.5 - nx, to.y + 0.5 - ny, 0.02),
          vec(from.x + 0.5 - nx, from.y + 0.5 - ny, 0.02),
        ],
        PATH,
        distance,
        0.5,
      );
    }
  }

  private collectRover(view: View, centre: Vec3, yaw: number, faces: Face[]): void {
    const body = this.roverRgb;
    const dark: Rgb = [18, 24, 38];
    const light: Rgb = [235, 245, 255];

    this.addBox(faces, view, centre, yaw, 0, 0, 0.26, 0.66, 0.46, 0.2, body);
    this.addBox(faces, view, centre, yaw, -0.04, 0, 0.44, 0.3, 0.3, 0.16, dark);
    this.addBox(faces, view, centre, yaw, 0.3, 0, 0.3, 0.12, 0.22, 0.1, light);    for (const [ox, oy] of [
      [0.22, 0.25],
      [0.22, -0.25],
      [-0.22, 0.25],
      [-0.22, -0.25],
    ] as const) {
      this.addBox(faces, view, centre, yaw, ox, oy, 0.13, 0.22, 0.08, 0.22, dark);
    }
  }

  /** Box in rover-local space (x forward, y left, z up), placed at `centre`. */
  private addBox(
    faces: Face[],
    view: View,
    centre: Vec3,
    yaw: number,
    ox: number,
    oy: number,
    oz: number,
    length: number,
    width: number,
    height: number,
    colour: Rgb,
  ): void {
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const place = (fx: number, fy: number, fz: number): Vec3 => {
      const lx = ox + fx;
      const ly = oy + fy;
      return vec(centre.x + lx * cos - ly * sin, centre.y + lx * sin + ly * cos, oz + fz);
    };

    const hl = length / 2;
    const hw = width / 2;
    const hh = height / 2;
    const corners = {
      a: place(-hl, -hw, -hh),
      b: place(hl, -hw, -hh),
      c: place(hl, hw, -hh),
      d: place(-hl, hw, -hh),
      e: place(-hl, -hw, hh),
      f: place(hl, -hw, hh),
      g: place(hl, hw, hh),
      h: place(-hl, hw, hh),
    };
    const distance = 0;
    this.addQuad(faces, view, [corners.e, corners.f, corners.g, corners.h], colour, distance, 0.5);
    this.addQuad(faces, view, [corners.b, corners.a, corners.d, corners.c], colour, distance, 0.5);
    this.addQuad(faces, view, [corners.a, corners.b, corners.f, corners.e], colour, distance, 0.5);
    this.addQuad(faces, view, [corners.c, corners.d, corners.h, corners.g], colour, distance, 0.5);
    this.addQuad(faces, view, [corners.b, corners.c, corners.g, corners.f], colour, distance, 0.5);
    this.addQuad(faces, view, [corners.d, corners.a, corners.e, corners.h], colour, distance, 0.5);
  }
}

export interface MinimapLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  cell: number;
}

/** Bottom-right, square cells, never taller than a third of the stage. */
export function minimapLayout(
  viewport: { width: number; height: number },
  mapWidth: number,
  mapHeight: number,
): MinimapLayout {
  const margin = Math.max(10, Math.round(viewport.width * 0.012));
  const maxWidth = clamp(viewport.width * 0.24, 110, 420);
  const maxHeight = clamp(viewport.height * 0.32, 80, 300);
  const cell = Math.max(1, Math.min(maxWidth / mapWidth, maxHeight / mapHeight));
  const width = cell * mapWidth;
  const height = cell * mapHeight;
  return {
    x: viewport.width - width - margin,
    y: viewport.height - height - margin,
    width,
    height,
    cell,
  };
}

function floorQuad(x: number, y: number, z: number): Vec3[] {
  return [vec(x, y, z), vec(x + 1, y, z), vec(x + 1, y + 1, z), vec(x, y + 1, z)];
}

function headingYaw(heading: string): number {
  switch (heading) {
    case 'east':
      return 0;
    case 'south':
      return Math.PI / 2;
    case 'west':
      return Math.PI;
    default:
      return -Math.PI / 2;
  }
}
