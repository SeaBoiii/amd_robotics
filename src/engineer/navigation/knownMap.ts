/** The rover's belief about the maze, built only from what its sensors report. */

export type KnownCell = '?' | '.' | '#' | '~';

export class KnownMap {
  readonly width: number;
  readonly height: number;
  private cells: KnownCell[];
  // Evidence counts so one noisy reading cannot flip a well-observed cell.
  private blockedVotes: Uint16Array;
  private freeVotes: Uint16Array;
  private hazardSeen: Uint8Array;
  /** Cells the rover physically bumped into; sensor noise cannot un-block them. */
  private confirmed = new Set<number>();

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    const size = width * height;
    this.cells = new Array<KnownCell>(size).fill('?');
    this.blockedVotes = new Uint16Array(size);
    this.freeVotes = new Uint16Array(size);
    this.hazardSeen = new Uint8Array(size);
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  get(x: number, y: number): KnownCell {
    if (!this.inBounds(x, y)) return '#';
    return this.cells[y * this.width + x];
  }

  /** Records one observation. Returns true when the belief changed. */
  set(x: number, y: number, observed: Exclude<KnownCell, '?'>): boolean {
    if (!this.inBounds(x, y)) return false;
    const index = y * this.width + x;
    if (this.confirmed.has(index)) return false;

    if (observed === '#') this.blockedVotes[index] = Math.min(65535, this.blockedVotes[index] + 1);
    else this.freeVotes[index] = Math.min(65535, this.freeVotes[index] + 1);
    if (observed === '~') this.hazardSeen[index] = 1;

    const blocked = this.blockedVotes[index];
    const free = this.freeVotes[index];
    // On a tie, trust the most recent reading.
    const isBlocked = blocked === free ? observed === '#' : blocked > free;
    const next: KnownCell = isBlocked ? '#' : this.hazardSeen[index] ? '~' : '.';
    if (next === this.cells[index]) return false;
    this.cells[index] = next;
    return true;
  }

  confirmBlocked(x: number, y: number): void {
    if (!this.inBounds(x, y)) return;
    const index = y * this.width + x;
    this.cells[index] = '#';
    this.confirmed.add(index);
  }

  toString(): string {
    return this.cells.join('');
  }
}
