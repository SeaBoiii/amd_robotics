/**
 * The Phaser rendering layer.
 *
 * This scene is a *pure renderer*. It never imports a React hook, never reads a
 * Zustand store and never mutates the simulation. It receives immutable
 * `SimulationSnapshot` objects through `applySnapshot()` and draws them.
 * Deleting this file entirely would leave the game logic fully intact.
 *
 * All artwork is drawn procedurally with `Phaser.Graphics`, so the game ships
 * with zero image assets: nothing to download, nothing to license, and it works
 * from a USB stick with no network.
 */

import Phaser from 'phaser';
import type { SimulationSnapshot, WorldTile } from '@/types';

export interface SceneOptions {
  width: number;
  height: number;
  roverColour: string;
  reducedMotion: boolean;
  showSensorOverlay: boolean;
  showDebug: boolean;
}

const TILE = 40;

/** Singapore-inspired palette: rain-washed concrete, park green, canal blue. */
const TILE_COLOURS: Record<string, number> = {
  '.': 0x1d2735,
  '#': 0x334155,
  o: 0x475569,
  '~': 0x0e4f6b,
  '!': 0x7c2d12,
  g: 0x14532d,
  S: 0x14532d,
  T: 0x3b1d5e,
  B: 0x0f3d52,
};

const HEADING_ANGLE: Record<string, number> = {
  north: -90,
  east: 0,
  south: 90,
  west: 180,
};

export class MissionScene extends Phaser.Scene {
  private options: SceneOptions;
  private terrain!: Phaser.GameObjects.Graphics;
  private decor!: Phaser.GameObjects.Graphics;
  private overlay!: Phaser.GameObjects.Graphics;
  private rover!: Phaser.GameObjects.Container;
  private roverBody!: Phaser.GameObjects.Graphics;
  private trail!: Phaser.GameObjects.Graphics;
  private trailPoints: { x: number; y: number }[] = [];
  private lastSnapshot: SimulationSnapshot | null = null;
  private terrainSignature = '';
  private ready = false;

  constructor(options: SceneOptions) {
    super('mission');
    this.options = options;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x0a0f1a);
    this.terrain = this.add.graphics();
    this.decor = this.add.graphics();
    this.trail = this.add.graphics();
    this.overlay = this.add.graphics();

    this.roverBody = this.add.graphics();
    this.drawRoverBody();
    this.rover = this.add.container(TILE / 2, TILE / 2, [this.roverBody]);
    this.rover.setDepth(10);

    this.ready = true;
    if (this.lastSnapshot) this.applySnapshot(this.lastSnapshot);
  }

  setOptions(options: Partial<SceneOptions>): void {
    this.options = { ...this.options, ...options };
    if (this.ready) {
      this.drawRoverBody();
      if (this.lastSnapshot) this.render(this.lastSnapshot);
    }
  }

  /** The single entry point React uses. Cheap, and safe to call every frame. */
  applySnapshot(snapshot: SimulationSnapshot): void {
    this.lastSnapshot = snapshot;
    if (!this.ready) return;
    this.render(snapshot);
  }

  private render(snapshot: SimulationSnapshot): void {
    this.renderTerrain(snapshot.tiles);
    this.renderOverlay(snapshot);
    this.renderRover(snapshot);
  }

  // ------------------------------------------------------------- terrain

  private renderTerrain(tiles: WorldTile[]): void {
    // Terrain only changes when a supply or target is consumed, so hash the
    // active flags and skip the redraw the other 99% of frames.
    const signature = tiles.map((tile) => (tile.active ? tile.char : '.')).join('');
    if (signature === this.terrainSignature) return;
    this.terrainSignature = signature;

    this.terrain.clear();
    this.decor.clear();

    for (const tile of tiles) {
      const char = tile.active ? tile.char : '.';
      const px = tile.x * TILE;
      const py = tile.y * TILE;

      this.terrain.fillStyle(TILE_COLOURS[char] ?? TILE_COLOURS['.'], 1);
      this.terrain.fillRect(px, py, TILE, TILE);
      this.terrain.lineStyle(1, 0x0a0f1a, 0.6);
      this.terrain.strokeRect(px, py, TILE, TILE);

      this.decorateTile(char, px, py);
    }
  }

  /** Procedural details that make the grid read as a flooded HDB district. */
  private decorateTile(char: string, px: number, py: number): void {
    const g = this.decor;

    switch (char) {
      case '#': {
        // HDB block: a lighter face plus a lattice of lit windows.
        g.fillStyle(0x475569, 1);
        g.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
        g.fillStyle(0xfbbf24, 0.55);
        for (let row = 0; row < 3; row += 1) {
          for (let col = 0; col < 3; col += 1) {
            if ((row * 3 + col + px + py) % 4 === 0) continue;
            g.fillRect(px + 8 + col * 9, py + 8 + row * 9, 5, 5);
          }
        }
        break;
      }
      case 'o': {
        g.fillStyle(0x64748b, 1);
        g.fillCircle(px + TILE / 2, py + TILE / 2, TILE * 0.3);
        break;
      }
      case '~': {
        // Drainage canal water: three offset ripples.
        g.lineStyle(2, 0x38bdf8, 0.45);
        for (let i = 0; i < 3; i += 1) {
          g.beginPath();
          g.moveTo(px + 4, py + 10 + i * 10);
          g.lineTo(px + TILE - 4, py + 10 + i * 10);
          g.strokePath();
        }
        break;
      }
      case '!': {
        g.fillStyle(0xf97316, 0.9);
        g.fillTriangle(px + TILE / 2, py + 8, px + TILE - 8, py + TILE - 8, px + 8, py + TILE - 8);
        break;
      }
      case 'g': {
        // Park connector greenery.
        g.fillStyle(0x22c55e, 0.6);
        g.fillCircle(px + 12, py + 14, 6);
        g.fillCircle(px + 26, py + 24, 7);
        break;
      }
      case 'S': {
        g.fillStyle(0x22c55e, 1);
        g.fillRect(px + 14, py + 8, 12, 24);
        g.fillRect(px + 8, py + 14, 24, 12);
        break;
      }
      case 'T': {
        g.fillStyle(0xa855f7, 1);
        g.fillCircle(px + TILE / 2, py + 14, 6);
        g.fillRect(px + TILE / 2 - 5, py + 20, 10, 13);
        break;
      }
      case 'B': {
        g.lineStyle(2, 0x22d3ee, 0.9);
        g.strokeRect(px + 6, py + 6, TILE - 12, TILE - 12);
        g.fillStyle(0x22d3ee, 0.25);
        g.fillRect(px + 6, py + 6, TILE - 12, TILE - 12);
        break;
      }
      default:
        break;
    }
  }

  // ------------------------------------------------------------- overlay

  private renderOverlay(snapshot: SimulationSnapshot): void {
    this.overlay.clear();
    if (snapshot.navigation) this.renderNavigation(snapshot);
    if (!this.options.showSensorOverlay) return;

    this.overlay.fillStyle(0x22d3ee, 0.16);
    for (const tile of snapshot.sensedTiles) {
      this.overlay.fillRect(tile.x * TILE, tile.y * TILE, TILE, TILE);
    }

    if (this.options.showDebug && snapshot.prediction) {
      const ahead = snapshot.sensedTiles[0];
      if (ahead) {
        const correct = snapshot.predictionCorrect;
        this.overlay.lineStyle(2, correct === false ? 0xef4444 : 0x22c55e, 0.9);
        this.overlay.strokeRect(ahead.x * TILE + 2, ahead.y * TILE + 2, TILE - 4, TILE - 4);
      }
    }
  }

  /** Fog over unexplored cells, the current plan, and the exit marker. */
  private renderNavigation(snapshot: SimulationSnapshot): void {
    const navigation = snapshot.navigation!;
    const width = Math.round(this.options.width / TILE);
    const g = this.overlay;

    g.fillStyle(0x05080f, 0.82);
    for (let index = 0; index < navigation.known.length; index++) {
      if (navigation.known[index] !== '?') continue;
      g.fillRect((index % width) * TILE, Math.floor(index / width) * TILE, TILE, TILE);
    }

    const { goal } = navigation;
    g.lineStyle(3, 0x22c55e, 1);
    g.strokeRect(goal.x * TILE + 4, goal.y * TILE + 4, TILE - 8, TILE - 8);
    g.fillStyle(0x22c55e, 0.35);
    g.fillRect(goal.x * TILE + 4, goal.y * TILE + 4, TILE - 8, TILE - 8);

    const path = navigation.plannedPath;
    if (path.length > 1) {
      g.lineStyle(3, 0xfbbf24, 0.85);
      g.beginPath();
      g.moveTo(path[0].x * TILE + TILE / 2, path[0].y * TILE + TILE / 2);
      for (const point of path.slice(1)) g.lineTo(point.x * TILE + TILE / 2, point.y * TILE + TILE / 2);
      g.strokePath();
    }
  }

  // --------------------------------------------------------------- rover

  private drawRoverBody(): void {
    const colour = Phaser.Display.Color.HexStringToColor(this.options.roverColour).color;
    const g = this.roverBody;
    g.clear();

    // Chassis
    g.fillStyle(colour, 1);
    g.fillRoundedRect(-13, -10, 26, 20, 5);
    // Wheels
    g.fillStyle(0x0f172a, 1);
    g.fillRect(-11, -13, 8, 4);
    g.fillRect(3, -13, 8, 4);
    g.fillRect(-11, 9, 8, 4);
    g.fillRect(3, 9, 8, 4);
    // Sensor mast, pointing along +x which is the rover's facing direction.
    g.fillStyle(0xffffff, 0.95);
    g.fillTriangle(13, 0, 4, -6, 4, 6);
    // Camera eye
    g.fillStyle(0x0f172a, 1);
    g.fillCircle(-3, 0, 4);
    g.fillStyle(0x22d3ee, 1);
    g.fillCircle(-3, 0, 2);
  }

  private renderRover(snapshot: SimulationSnapshot): void {
    const targetX = snapshot.rover.x * TILE + TILE / 2;
    const targetY = snapshot.rover.y * TILE + TILE / 2;
    const targetAngle = HEADING_ANGLE[snapshot.rover.heading] ?? 0;

    if (this.options.reducedMotion || snapshot.tick <= 1) {
      this.rover.setPosition(targetX, targetY);
      this.rover.setAngle(targetAngle);
    } else {
      // Ease towards the authoritative position. The tween is cosmetic only;
      // the simulation has already committed to the new tile.
      this.rover.setPosition(
        Phaser.Math.Linear(this.rover.x, targetX, 0.35),
        Phaser.Math.Linear(this.rover.y, targetY, 0.35),
      );
      this.rover.setAngle(
        Phaser.Math.Angle.RotateTo(
          Phaser.Math.DegToRad(this.rover.angle),
          Phaser.Math.DegToRad(targetAngle),
          0.25,
        ) *
          Phaser.Math.RAD_TO_DEG,
      );
    }

    this.rover.setAlpha(snapshot.rover.status === 'disabled' ? 0.35 : 1);

    // Breadcrumb trail so students can see the path their program produced.
    const last = this.trailPoints[this.trailPoints.length - 1];
    if (!last || last.x !== snapshot.rover.x || last.y !== snapshot.rover.y) {
      this.trailPoints.push({ x: snapshot.rover.x, y: snapshot.rover.y });
      if (this.trailPoints.length > 400) this.trailPoints.shift();
    }
    if (snapshot.tick === 0) this.trailPoints = [];

    this.trail.clear();
    this.trail.fillStyle(0x22d3ee, 0.18);
    for (const point of this.trailPoints) {
      this.trail.fillCircle(point.x * TILE + TILE / 2, point.y * TILE + TILE / 2, 3);
    }
  }

  update(): void {
    // Keep easing towards the last known snapshot between simulation steps.
    if (this.lastSnapshot && !this.options.reducedMotion) {
      this.renderRover(this.lastSnapshot);
    }
  }
}

export const TILE_SIZE = TILE;
