/**
 * Accessible fallback renderer.
 *
 * Used when Phaser cannot start, and always available behind a toggle. It is a
 * real table with row/column headers, so a screen-reader user can navigate the
 * world tile by tile — something a canvas can never offer.
 */

import type { SimulationSnapshot } from '@/types';
import { TILE_MEANING } from '@/game/engine/world';

const TILE_GLYPH: Record<string, string> = {
  '.': '·',
  '#': '▓',
  o: '▒',
  '~': '≈',
  '!': '⚠',
  S: '✚',
  T: '★',
  B: '⌂',
  g: '❋',
};

const HEADING_GLYPH: Record<string, string> = {
  north: '▲',
  east: '▶',
  south: '▼',
  west: '◀',
};

export function TextGrid({
  snapshot,
  width,
  height,
}: {
  snapshot: SimulationSnapshot;
  width: number;
  height: number;
}) {
  const byKey = new Map(snapshot.tiles.map((tile) => [`${tile.x},${tile.y}`, tile]));
  const sensed = new Set(snapshot.sensedTiles.map((tile) => `${tile.x},${tile.y}`));

  return (
    <table className="text-grid">
      <caption className="sr-only">
        Mission map. The rover is at column {snapshot.rover.x + 1}, row {snapshot.rover.y + 1},
        facing {snapshot.rover.heading}.
      </caption>
      <tbody>
        {Array.from({ length: height }, (_, y) => (
          <tr key={y}>
            {Array.from({ length: width }, (_, x) => {
              const tile = byKey.get(`${x},${y}`);
              const char = tile && tile.active ? tile.char : '.';
              const isRover = snapshot.rover.x === x && snapshot.rover.y === y;
              return (
                <td
                  key={x}
                  className={`text-grid__cell${sensed.has(`${x},${y}`) ? ' text-grid__cell--sensed' : ''}${
                    isRover ? ' text-grid__cell--rover' : ''
                  }`}
                  title={
                    isRover
                      ? `Rover, facing ${snapshot.rover.heading}`
                      : (TILE_MEANING[char] ?? 'Road')
                  }
                >
                  <span aria-hidden="true">
                    {isRover ? HEADING_GLYPH[snapshot.rover.heading] : (TILE_GLYPH[char] ?? '·')}
                  </span>
                  <span className="sr-only">
                    {isRover ? `Rover facing ${snapshot.rover.heading}` : (TILE_MEANING[char] ?? 'Road')}
                  </span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
