import { createBrowserSupabase } from "@/lib/supabase";

import { getReviewPrefs, type ReviewPrefs } from "@/lib/review-prefs";

export type SrsGrade = "good" | "again";

export type SrsCard = {
  ease: number;
  interval: number;
  due: number;
  reps: number;
  lapses: number;
};

export type SrsMap = Record<string, SrsCard>;

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const DONE_INTERVAL = -1;
const AGAIN_EASE = 1;
const GOOD_EASE = 2.5;
const FAR = 10 * 365 * DAY_MS;
const EMPTY: SrsMap = {};

let cache: SrsMap = {};
let currentUserId: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeSrs(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSrsSnapshot(): SrsMap {
  return cache;
}

export function getSrsUserId() {
  return currentUserId;
}

type SrsRow = {
  puzzle_id: string;
  ease: number;
  interval: number;
  due: string;
  reps: number;
  lapses: number;
};

function rowToCard(row: SrsRow): SrsCard {
  return {
    ease: row.ease,
    interval: row.interval,
    due: new Date(row.due).getTime(),
    reps: row.reps,
    lapses: row.lapses,
  };
}

export async function setSrsUser(userId: string | null) {
  currentUserId = userId;
  if (!userId) {
    cache = {};
    emit();
    return;
  }
  const supabase = createBrowserSupabase();
  if (!supabase) {
    cache = {};
    emit();
    return;
  }
  const { data, error } = await supabase
    .from("srs_cards")
    .select("puzzle_id,ease,interval,due,reps,lapses")
    .eq("user_id", userId);
  if (error || !data) {
    cache = {};
    emit();
    return;
  }
  const next: SrsMap = {};
  for (const row of data as SrsRow[]) {
    next[row.puzzle_id] = rowToCard(row);
  }
  cache = next;
  emit();
}

function blankCard(): SrsCard {
  return { ease: GOOD_EASE, interval: 0, due: 0, reps: 0, lapses: 0 };
}

function inAgainTrack(card: SrsCard): boolean {
  return card.ease <= AGAIN_EASE + 0.05 && card.lapses > 0;
}

function schedule(now: number, minutes: number): { interval: number; due: number } {
  if (minutes <= 0) return { interval: 0, due: now };
  return { interval: minutes, due: now + minutes * MINUTE_MS };
}

function doneCard(card: SrsCard, now: number): SrsCard {
  return {
    ease: GOOD_EASE,
    interval: DONE_INTERVAL,
    due: now + FAR,
    reps: card.reps,
    lapses: 0,
  };
}

export function applyGrade(
  card: SrsCard | undefined,
  grade: SrsGrade,
  now = Date.now(),
  prefs: ReviewPrefs = getReviewPrefs(),
): SrsCard {
  const current = card ?? blankCard();
  const good = prefs.goodIntervals;
  const again =
    prefs.againIntervals.length > 0 ? prefs.againIntervals : [0];
  const times = Math.max(0, Math.min(20, Math.round(prefs.againTimes)));

  if (grade === "again") {
    if (times <= 0) return doneCard({ ...current, reps: 0 }, now);
    const { interval, due } = schedule(now, again[0] ?? 0);
    return {
      ease: AGAIN_EASE,
      interval,
      due,
      reps: 0,
      lapses: times,
    };
  }

  if (inAgainTrack(current)) {
    const left = current.lapses - 1;
    if (left > 0) {
      const step = Math.min(times - left, again.length - 1);
      const { interval, due } = schedule(now, again[Math.max(0, step)] ?? 0);
      return {
        ease: AGAIN_EASE,
        interval,
        due,
        reps: current.reps + 1,
        lapses: left,
      };
    }
    if (good.length === 0) {
      return doneCard({ ...current, reps: current.reps + 1 }, now);
    }
    const { interval, due } = schedule(now, good[0] ?? 24 * 60);
    return {
      ease: GOOD_EASE,
      interval,
      due,
      reps: 0,
      lapses: 0,
    };
  }

  if (good.length === 0) {
    return doneCard({ ...current, reps: current.reps + 1 }, now);
  }
  const idx = Math.min(current.reps, good.length - 1);
  const { interval, due } = schedule(now, good[idx] ?? 24 * 60);
  return {
    ease: GOOD_EASE,
    interval,
    due,
    reps: current.reps + 1,
    lapses: 0,
  };
}

export async function gradePuzzle(
  puzzleId: string,
  grade: SrsGrade,
): Promise<SrsCard | null> {
  if (!currentUserId) return null;
  const next = applyGrade(cache[puzzleId], grade);
  cache = { ...cache, [puzzleId]: next };
  emit();
  const supabase = createBrowserSupabase();
  if (supabase) {
    await supabase.from("srs_cards").upsert(
      {
        user_id: currentUserId,
        puzzle_id: puzzleId,
        ease: next.ease,
        interval: next.interval,
        due: new Date(next.due).toISOString(),
        reps: next.reps,
        lapses: next.lapses,
      },
      { onConflict: "user_id,puzzle_id" },
    );
  }
  return next;
}

export function bucketOf(
  puzzleId: string,
  map: SrsMap = getSrsSnapshot(),
  now = Date.now(),
): "due" | "new" | "later" {
  const card = map[puzzleId];
  if (!card) return "new";
  if (card.interval === DONE_INTERVAL) return "later";
  if (card.due <= now) return "due";
  return "later";
}

export function summarizeSrs(
  puzzleIds: string[],
  map: SrsMap = getSrsSnapshot(),
  now = Date.now(),
) {
  let due = 0;
  let fresh = 0;
  let later = 0;
  for (const id of puzzleIds) {
    const bucket = bucketOf(id, map, now);
    if (bucket === "due") due += 1;
    else if (bucket === "new") fresh += 1;
    else later += 1;
  }
  return { due, new: fresh, later };
}

export function buildTrainQueue<T extends { id: string }>(
  puzzles: T[],
  map: SrsMap = getSrsSnapshot(),
  now = Date.now(),
  dueOnly = false,
): T[] {
  const due: T[] = [];
  const fresh: T[] = [];
  for (const puzzle of puzzles) {
    const bucket = bucketOf(puzzle.id, map, now);
    if (bucket === "due") due.push(puzzle);
    else if (bucket === "new" && !dueOnly) fresh.push(puzzle);
  }
  due.sort((a, b) => (map[a.id]?.due ?? 0) - (map[b.id]?.due ?? 0));
  return [...due, ...fresh];
}

export function formatIntervalDays(days: number): string {
  if (days <= 0) return "teď";
  if (days === 1) return "zítra";
  if (days < 5) return `za ${days} dny`;
  if (days < 7) return `za ${days} dní`;
  const weeks = Math.round(days / 7);
  if (weeks === 1) return "za týden";
  if (weeks < 8) return `za ${weeks} týd.`;
  const months = Math.max(1, Math.round(days / 30));
  if (months === 1) return "za měsíc";
  return `za ${months} měs.`;
}

export function formatDueWait(due: number, now = Date.now()): string {
  const ms = due - now;
  if (ms <= 0) return "teď";
  const minutes = Math.max(1, Math.round(ms / MINUTE_MS));
  if (minutes < 60) return minutes === 1 ? "za minutu" : `za ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "za hodinu" : `za ${hours} h`;
  return formatIntervalDays(Math.max(1, Math.round(minutes / (24 * 60))));
}

export function formatSrsCard(card: SrsCard | undefined, now = Date.now()): string | null {
  if (!card) return null;
  if (card.interval === DONE_INTERVAL) return "už ne";
  if (card.due <= now) return "znovu teď";
  return formatDueWait(card.due, now);
}
