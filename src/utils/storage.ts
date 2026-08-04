/**
 * LocalStorage helpers that never throw.
 *
 * Classroom machines have quota limits, privacy modes and half-written data
 * from crashed tabs. A corrupt value must degrade to "start fresh with a
 * notice", never to a blank screen.
 */

const PREFIX = 'amd-rover:';
export const STORAGE_VERSION = 1;

interface Envelope<T> {
  version: number;
  savedAt: number;
  data: T;
}

let memoryFallback: Record<string, string> = {};
let storageAvailable: boolean | null = null;

function getStorage(): Storage | null {
  if (storageAvailable === false) return null;
  try {
    const probe = `${PREFIX}__probe__`;
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    storageAvailable = true;
    return window.localStorage;
  } catch {
    storageAvailable = false;
    return null;
  }
}

/** True when we had to fall back to in-memory storage (private mode, quota). */
export function isPersistenceAvailable(): boolean {
  return getStorage() !== null;
}

export function loadState<T>(key: string, fallback: T): T {
  const storage = getStorage();
  const raw = storage ? storage.getItem(PREFIX + key) : memoryFallback[PREFIX + key];
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as Envelope<T>;
    if (typeof parsed !== 'object' || parsed === null || !('data' in parsed)) {
      throw new Error('Saved data is not in the expected format');
    }
    if (parsed.version !== STORAGE_VERSION) {
      // Future migrations hook in here. For now, start fresh rather than risk
      // feeding a half-understood shape into the game.
      console.warn(`[storage] Discarding "${key}" saved by an older version.`);
      return fallback;
    }
    return parsed.data;
  } catch (error) {
    console.warn(`[storage] Could not read "${key}". Starting fresh.`, error);
    removeState(key);
    return fallback;
  }
}

export function saveState<T>(key: string, data: T): boolean {
  const envelope: Envelope<T> = { version: STORAGE_VERSION, savedAt: Date.now(), data };
  const raw = JSON.stringify(envelope);
  const storage = getStorage();
  try {
    if (storage) storage.setItem(PREFIX + key, raw);
    else memoryFallback[PREFIX + key] = raw;
    return true;
  } catch (error) {
    console.warn(`[storage] Could not save "${key}".`, error);
    return false;
  }
}

export function removeState(key: string): void {
  const storage = getStorage();
  try {
    if (storage) storage.removeItem(PREFIX + key);
    else delete memoryFallback[PREFIX + key];
  } catch {
    /* ignore */
  }
}

/** Wipes every value this game owns. Used by "Delete all local data". */
export function clearAllState(): void {
  const storage = getStorage();
  if (!storage) {
    memoryFallback = {};
    return;
  }
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(PREFIX)) keys.push(key);
    }
    keys.forEach((key) => storage.removeItem(key));
  } catch (error) {
    console.warn('[storage] Could not clear saved data.', error);
  }
}

/** Approximate size of this game's saved data, in kilobytes. */
export function getStorageUsageKb(): number {
  const storage = getStorage();
  if (!storage) return 0;
  let bytes = 0;
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && key.startsWith(PREFIX)) bytes += key.length + (storage.getItem(key)?.length ?? 0);
  }
  return Math.round((bytes / 1024) * 10) / 10;
}
