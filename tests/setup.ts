import '@testing-library/jest-dom/vitest';

/**
 * Node 25 exposes an experimental `localStorage` global that shadows the jsdom
 * one and is unusable without `--localstorage-file`. Install a small, spec-shaped
 * in-memory Storage so the game's persistence layer behaves exactly as it does
 * in a browser.
 */
class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.data.set(String(key), String(value));
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }

  [name: string]: unknown;
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  writable: true,
  value: storage,
});
Object.defineProperty(window, 'localStorage', {
  configurable: true,
  writable: true,
  value: storage,
});

/** Phaser and the RAF-driven runner are never exercised in unit tests. */
if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) =>
    setTimeout(() => callback(Date.now()), 16) as unknown as number) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((handle: number) =>
    clearTimeout(handle)) as typeof cancelAnimationFrame;
}
