import type { Curriculum } from "@/lib/curriculum";
import type { Puzzle } from "@/lib/types";

const LIVE_KEY = "mate-ulohy-live";
const DATA_KEY = "mate-ulohy-data";

export type UlohyLive = { userId: string; live: boolean };
export type UlohyDataCache = { curriculum: Curriculum; puzzles: Puzzle[] };

export function readLiveCache(): UlohyLive | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(LIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UlohyLive;
    if (!parsed?.userId || typeof parsed.live !== "boolean") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLiveCache(next: UlohyLive | null) {
  if (typeof window === "undefined") return;
  try {
    if (!next) sessionStorage.removeItem(LIVE_KEY);
    else sessionStorage.setItem(LIVE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function readUlohyCache(): UlohyDataCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DATA_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UlohyDataCache;
    if (!parsed?.curriculum?.courses || !Array.isArray(parsed.puzzles)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeUlohyCache(next: UlohyDataCache) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DATA_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
