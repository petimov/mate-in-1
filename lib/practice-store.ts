import { createBrowserSupabase } from "@/lib/supabase";
import { getReviewPrefs } from "@/lib/review-prefs";

export const PRACTICE_STORAGE_KEY = "mate-practice-state";

export type WrongPoolEntry = {
  fails: number;
  clears: number;
};

export type ChapterAnswer = {
  puzzleId: string;
  failed: boolean;
  elapsedMs: number;
};

export type PracticeWip = {
  chapterId: string;
  puzzleIds: string[];
  index: number;
  elapsedMs: number;
  penaltyMs: number;
  answers: ChapterAnswer[];
};

export type ChapterBest = {
  correct: number;
  wrong: number;
  elapsedMs: number;
  penaltyMs: number;
  finishedAt: number;
  perfect: boolean;
};

export type PracticeState = {
  wrongPool: Record<string, WrongPoolEntry>;
  wip: PracticeWip | null;
  chapterBest: Record<string, ChapterBest>;
};

const EMPTY: PracticeState = {
  wrongPool: {},
  wip: null,
  chapterBest: {},
};

let cache: PracticeState = { ...EMPTY, wrongPool: {}, chapterBest: {} };
let hydrated = false;
let currentUserId: string | null = null;
const listeners = new Set<() => void>();

function ensureLocalHydrated() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  cache = readLocal();
}

function emit() {
  for (const listener of listeners) listener();
}

export function subscribePractice(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPracticeSnapshot(): PracticeState {
  ensureLocalHydrated();
  return cache;
}

export function getPracticeUserId() {
  return currentUserId;
}

function cloneState(state: PracticeState): PracticeState {
  return {
    wrongPool: { ...state.wrongPool },
    wip: state.wip
      ? {
          ...state.wip,
          puzzleIds: [...state.wip.puzzleIds],
          answers: state.wip.answers.map((item) => ({ ...item })),
        }
      : null,
    chapterBest: { ...state.chapterBest },
  };
}

function normalizeState(raw: unknown): PracticeState {
  if (!raw || typeof raw !== "object") return cloneState(EMPTY);
  const data = raw as Record<string, unknown>;
  const wrongPool: Record<string, WrongPoolEntry> = {};
  if (data.wrongPool && typeof data.wrongPool === "object") {
    for (const [id, value] of Object.entries(
      data.wrongPool as Record<string, unknown>,
    )) {
      if (!value || typeof value !== "object") continue;
      const row = value as Record<string, unknown>;
      const fails = Number(row.fails) || 0;
      const clears = Number(row.clears) || 0;
      if (fails <= 0 && clears <= 0) continue;
      wrongPool[id] = { fails: Math.max(0, fails), clears: Math.max(0, clears) };
    }
  }
  let wip: PracticeWip | null = null;
  if (data.wip && typeof data.wip === "object") {
    const row = data.wip as Record<string, unknown>;
    const chapterId = String(row.chapterId ?? "").trim();
    const puzzleIds = Array.isArray(row.puzzleIds)
      ? row.puzzleIds.map((item) => String(item)).filter(Boolean)
      : [];
    if (chapterId && puzzleIds.length) {
      wip = {
        chapterId,
        puzzleIds,
        index: Math.max(0, Math.min(Number(row.index) || 0, puzzleIds.length - 1)),
        elapsedMs: Math.max(0, Number(row.elapsedMs) || 0),
        penaltyMs: Math.max(0, Number(row.penaltyMs) || 0),
        answers: Array.isArray(row.answers)
          ? row.answers
              .filter((item) => item && typeof item === "object")
              .map((item) => {
                const answer = item as Record<string, unknown>;
                return {
                  puzzleId: String(answer.puzzleId ?? ""),
                  failed: Boolean(answer.failed),
                  elapsedMs: Math.max(0, Number(answer.elapsedMs) || 0),
                };
              })
              .filter((item) => item.puzzleId)
          : [],
      };
    }
  }
  const chapterBest: Record<string, ChapterBest> = {};
  if (data.chapterBest && typeof data.chapterBest === "object") {
    for (const [id, value] of Object.entries(
      data.chapterBest as Record<string, unknown>,
    )) {
      if (!value || typeof value !== "object") continue;
      const row = value as Record<string, unknown>;
      const correct = Math.max(0, Number(row.correct) || 0);
      const wrong = Math.max(0, Number(row.wrong) || 0);
      chapterBest[id] = {
        correct,
        wrong,
        elapsedMs: Math.max(0, Number(row.elapsedMs) || 0),
        penaltyMs: Math.max(0, Number(row.penaltyMs) || 0),
        finishedAt: Math.max(0, Number(row.finishedAt) || 0),
        perfect: Boolean(row.perfect) || (correct > 0 && wrong === 0),
      };
    }
  }
  return { wrongPool, wip, chapterBest };
}

function readLocal(): PracticeState {
  try {
    const raw = window.localStorage.getItem(PRACTICE_STORAGE_KEY);
    if (!raw) return cloneState(EMPTY);
    return normalizeState(JSON.parse(raw));
  } catch {
    return cloneState(EMPTY);
  }
}

function writeLocal(state: PracticeState) {
  try {
    window.localStorage.setItem(PRACTICE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

async function persistRemote(state: PracticeState) {
  if (!currentUserId) return;
  const supabase = createBrowserSupabase();
  if (!supabase) return;
  await supabase.from("practice_state").upsert(
    {
      user_id: currentUserId,
      wrong_pool: state.wrongPool,
      wip: state.wip,
      chapter_best: state.chapterBest,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

function commit(next: PracticeState) {
  cache = next;
  writeLocal(next);
  emit();
  void persistRemote(next);
}

export async function setPracticeUser(userId: string | null) {
  currentUserId = userId;
  if (!userId) {
    cache = readLocal();
    emit();
    return;
  }
  const local = readLocal();
  const supabase = createBrowserSupabase();
  if (!supabase) {
    cache = local;
    emit();
    return;
  }
  const { data, error } = await supabase
    .from("practice_state")
    .select("wrong_pool,wip,chapter_best")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) {
    cache = local;
    emit();
    if (!error) void persistRemote(local);
    return;
  }
  const remote = normalizeState({
    wrongPool: data.wrong_pool,
    wip: data.wip,
    chapterBest: data.chapter_best,
  });
  const merged = mergePractice(local, remote);
  cache = merged;
  writeLocal(merged);
  emit();
  void persistRemote(merged);
}

function mergePractice(local: PracticeState, remote: PracticeState): PracticeState {
  const wrongPool = { ...remote.wrongPool };
  for (const [id, entry] of Object.entries(local.wrongPool)) {
    const other = wrongPool[id];
    if (!other) {
      wrongPool[id] = entry;
      continue;
    }
    wrongPool[id] = {
      fails: Math.max(other.fails, entry.fails),
      clears: Math.max(other.clears, entry.clears),
    };
  }
  const chapterBest = { ...remote.chapterBest };
  for (const [id, entry] of Object.entries(local.chapterBest)) {
    const other = chapterBest[id];
    if (!other || isBetterChapterBest(entry, other)) {
      chapterBest[id] = entry;
    }
  }
  const wip =
    local.wip && (!remote.wip || local.wip.elapsedMs >= remote.wip.elapsedMs)
      ? local.wip
      : remote.wip;
  return { wrongPool, wip, chapterBest };
}

export function isBetterChapterBest(next: ChapterBest, prev: ChapterBest): boolean {
  const nextTotal = next.correct + next.wrong;
  const prevTotal = prev.correct + prev.wrong;
  const nextPct = nextTotal ? next.correct / nextTotal : 0;
  const prevPct = prevTotal ? prev.correct / prevTotal : 0;
  if (nextPct !== prevPct) return nextPct > prevPct;
  if (next.perfect !== prev.perfect) return next.perfect;
  const nextPen = next.elapsedMs + next.penaltyMs;
  const prevPen = prev.elapsedMs + prev.penaltyMs;
  return nextPen < prevPen;
}

export function startChapterWip(
  chapterId: string,
  puzzleIds: string[],
): PracticeWip {
  const wip: PracticeWip = {
    chapterId,
    puzzleIds: [...puzzleIds],
    index: 0,
    elapsedMs: 0,
    penaltyMs: 0,
    answers: [],
  };
  commit({ ...cache, wip });
  return wip;
}

export function updateChapterWip(patch: Partial<PracticeWip>) {
  if (!cache.wip) return;
  commit({
    ...cache,
    wip: {
      ...cache.wip,
      ...patch,
      puzzleIds: patch.puzzleIds ?? cache.wip.puzzleIds,
      answers: patch.answers ?? cache.wip.answers,
    },
  });
}

export function clearChapterWip(chapterId?: string) {
  if (!cache.wip) return;
  if (chapterId && cache.wip.chapterId !== chapterId) return;
  commit({ ...cache, wip: null });
}

export function recordChapterFail(penaltySeconds?: number) {
  if (!cache.wip) return;
  const seconds =
    penaltySeconds ?? getReviewPrefs().penaltySeconds;
  commit({
    ...cache,
    wip: {
      ...cache.wip,
      penaltyMs: cache.wip.penaltyMs + Math.max(0, seconds) * 1000,
    },
  });
}

export function finishChapterRun(input: {
  chapterId: string;
  answers: ChapterAnswer[];
  elapsedMs: number;
  penaltyMs: number;
}): ChapterBest {
  const correct = input.answers.filter((item) => !item.failed).length;
  const wrong = input.answers.filter((item) => item.failed).length;
  const best: ChapterBest = {
    correct,
    wrong,
    elapsedMs: Math.max(0, input.elapsedMs),
    penaltyMs: Math.max(0, input.penaltyMs),
    finishedAt: Date.now(),
    perfect: wrong === 0 && correct > 0,
  };
  const prev = cache.chapterBest[input.chapterId];
  const chapterBest = { ...cache.chapterBest };
  if (!prev || isBetterChapterBest(best, prev)) {
    chapterBest[input.chapterId] = best;
  }

  const wrongPool = { ...cache.wrongPool };
  for (const answer of input.answers) {
    if (answer.failed) {
      const current = wrongPool[answer.puzzleId] ?? { fails: 0, clears: 0 };
      wrongPool[answer.puzzleId] = {
        fails: current.fails + 1,
        clears: 0,
      };
    } else if (wrongPool[answer.puzzleId]) {
      delete wrongPool[answer.puzzleId];
    }
  }

  commit({
    wrongPool,
    wip: null,
    chapterBest,
  });
  return chapterBest[input.chapterId] ?? best;
}

export function noteWrongTrainResult(puzzleId: string, failed: boolean) {
  const need = getReviewPrefs().wrongClearCount;
  const wrongPool = { ...cache.wrongPool };
  const current = wrongPool[puzzleId] ?? { fails: 1, clears: 0 };
  if (failed) {
    wrongPool[puzzleId] = { fails: current.fails + 1, clears: 0 };
  } else {
    const clears = current.clears + 1;
    if (clears >= need) delete wrongPool[puzzleId];
    else wrongPool[puzzleId] = { ...current, clears };
  }
  commit({ ...cache, wrongPool });
}

export function wrongPoolIds(state: PracticeState = cache): string[] {
  return Object.keys(state.wrongPool);
}

export function formatPracticeDuration(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min <= 0) return `${sec} s`;
  return `${min} min ${sec.toString().padStart(2, "0")} s`;
}

export function summarizeChapterBests(bests: Record<string, ChapterBest>) {
  const list = Object.values(bests);
  let finished = 0;
  let correct = 0;
  let wrong = 0;
  let elapsedMs = 0;
  let penaltyMs = 0;
  let perfectChapters = 0;
  let perfectPuzzles = 0;
  let perfectElapsed = 0;
  for (const item of list) {
    finished += item.correct + item.wrong;
    correct += item.correct;
    wrong += item.wrong;
    elapsedMs += item.elapsedMs;
    penaltyMs += item.penaltyMs;
    if (item.perfect) {
      perfectChapters += 1;
      perfectPuzzles += item.correct;
      perfectElapsed += item.elapsedMs;
    }
  }
  return {
    finished,
    correct,
    wrong,
    elapsedMs,
    penaltyMs,
    pct: finished ? Math.round((correct / finished) * 100) : 0,
    avgCorrectMs: correct ? elapsedMs / correct : 0,
    avgPenaltyMs: finished ? (elapsedMs + penaltyMs) / finished : 0,
    perfectChapters,
    perfectPuzzles,
    avgPerfectMs: perfectPuzzles ? perfectElapsed / perfectPuzzles : 0,
  };
}
