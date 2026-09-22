export const REVIEW_PREFS_KEY = "mate-review-prefs";

export const MINUTE = 1;
export const HOUR = 60;
export const DAY_MIN = 24 * 60;
const MAX_MINUTES = 365 * DAY_MIN;

export type ReviewPrefs = {
  goodIntervals: number[];
  againIntervals: number[];
  againTimes: number;
  intervalUnit: "min";
};

export const DEFAULT_REVIEW_PREFS: ReviewPrefs = {
  goodIntervals: [1 * DAY_MIN, 3 * DAY_MIN, 7 * DAY_MIN, 14 * DAY_MIN, 30 * DAY_MIN],
  againIntervals: [0, 1 * DAY_MIN, 3 * DAY_MIN],
  againTimes: 3,
  intervalUnit: "min",
};

export const GOOD_PRESETS: { label: string; intervals: number[] }[] = [
  { label: "Žádné", intervals: [] },
  { label: "10m · 1h · 1d", intervals: [10, HOUR, DAY_MIN] },
  { label: "1 · 3 · 7 dní", intervals: [DAY_MIN, 3 * DAY_MIN, 7 * DAY_MIN] },
  {
    label: "1 · 3 · 7 · 14 · 30",
    intervals: [DAY_MIN, 3 * DAY_MIN, 7 * DAY_MIN, 14 * DAY_MIN, 30 * DAY_MIN],
  },
];

function clampMinutes(n: number): number | null {
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(MAX_MINUTES, Math.round(n));
}

const UNIT_RE =
  /(\d+)\s*(dní|dny|den|d|hodin[ayu]?|hod|h|minut[ayu]?|min|m)?/gi;

function minutesFromUnit(n: number, unit: string | undefined, bare: "day" | "min") {
  const u = (unit ?? "").toLowerCase();
  if (!u) return bare === "min" ? n : n * DAY_MIN;
  if (u.startsWith("d")) return n * DAY_MIN;
  if (u.startsWith("h") || u.startsWith("hod")) return n * HOUR;
  return n;
}

export function parseOneInterval(raw: string, bare: "day" | "min" = "min"): number | null {
  const text = raw.trim().toLowerCase();
  if (!text) return null;
  if (text === "0" || text === "hned" || text === "now") return 0;
  let total = 0;
  let hits = 0;
  UNIT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = UNIT_RE.exec(text))) {
    const n = Number(match[1]);
    if (!Number.isFinite(n)) continue;
    total += minutesFromUnit(n, match[2], bare);
    hits += 1;
  }
  if (!hits) return null;
  return clampMinutes(total);
}

export function sanitizeIntervals(
  raw: unknown,
  bare: "day" | "min" = "min",
): number[] {
  const parts = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(/[,;]+/)
      : [];
  const nums: number[] = [];
  for (const part of parts) {
    if (typeof part === "number") {
      const minutes = bare === "min" ? part : part * DAY_MIN;
      const clamped = clampMinutes(minutes);
      if (clamped === null) continue;
      nums.push(clamped);
    } else {
      const parsed = parseOneInterval(String(part), bare);
      if (parsed === null) continue;
      nums.push(parsed);
    }
    if (nums.length >= 12) break;
  }
  return nums;
}

export function sanitizeAgainTimes(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_REVIEW_PREFS.againTimes;
  return Math.max(0, Math.min(20, Math.round(n)));
}

export function normalizeReviewPrefs(raw: unknown): ReviewPrefs {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_REVIEW_PREFS };
  const data = raw as Record<string, unknown>;
  const bare = data.intervalUnit === "min" ? "min" : "day";
  return {
    goodIntervals:
      "goodIntervals" in data
        ? sanitizeIntervals(data.goodIntervals, bare)
        : [...DEFAULT_REVIEW_PREFS.goodIntervals],
    againIntervals:
      "againIntervals" in data
        ? sanitizeIntervals(data.againIntervals, bare)
        : [...DEFAULT_REVIEW_PREFS.againIntervals],
    againTimes:
      "againTimes" in data
        ? sanitizeAgainTimes(data.againTimes)
        : DEFAULT_REVIEW_PREFS.againTimes,
    intervalUnit: "min",
  };
}

export function formatOneInterval(minutes: number): string {
  if (minutes <= 0) return "0";
  const days = Math.floor(minutes / DAY_MIN);
  const hours = Math.floor((minutes % DAY_MIN) / HOUR);
  const mins = minutes % HOUR;
  const bits: string[] = [];
  if (days) bits.push(`${days}d`);
  if (hours) bits.push(`${hours}h`);
  if (mins) bits.push(`${mins}m`);
  return bits.join(" ");
}

export function formatIntervals(minutes: number[]): string {
  return minutes.map(formatOneInterval).join(", ");
}

export function formatIntervalLabel(minutes: number): string {
  if (minutes <= 0) return "hned";
  return formatOneInterval(minutes);
}

export function parseIntervalInput(text: string): number[] {
  return sanitizeIntervals(text, "day");
}

let cache: ReviewPrefs = { ...DEFAULT_REVIEW_PREFS };
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function getReviewPrefs(): ReviewPrefs {
  return cache;
}

export function subscribeReviewPrefs(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function writeCache(next: ReviewPrefs) {
  const normalized = normalizeReviewPrefs({ ...next, intervalUnit: "min" });
  cache = normalized;
  try {
    window.localStorage.setItem(REVIEW_PREFS_KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
  emit();
}

export function setReviewPrefs(next: ReviewPrefs) {
  writeCache(next);
}

export function loadReviewPrefsFromStorage(): ReviewPrefs {
  try {
    const raw = window.localStorage.getItem(REVIEW_PREFS_KEY);
    if (!raw) return { ...DEFAULT_REVIEW_PREFS };
    cache = normalizeReviewPrefs(JSON.parse(raw));
    return cache;
  } catch {
    return { ...DEFAULT_REVIEW_PREFS };
  }
}

export function applyReviewPrefsSilent(next: ReviewPrefs) {
  writeCache(next);
}
