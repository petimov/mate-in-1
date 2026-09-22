import {
  DEFAULT_BOARD_ID,
  DEFAULT_PIECE_ID,
  isBoardThemeId,
  isPieceSetId,
} from "@/lib/board-appearance";
import {
  DEFAULT_REVIEW_PREFS,
  normalizeReviewPrefs,
  type ReviewPrefs,
} from "@/lib/review-prefs";

export type Prefs = {
  theme: "light" | "dark";
  boardId: string;
  pieceId: string;
} & ReviewPrefs;

export const DEFAULT_PREFS: Prefs = {
  theme: "dark",
  boardId: DEFAULT_BOARD_ID,
  pieceId: DEFAULT_PIECE_ID,
  ...DEFAULT_REVIEW_PREFS,
};

export function prefsFromMetadata(meta: unknown): Partial<Prefs> {
  if (!meta || typeof meta !== "object") return {};
  const data = meta as Record<string, unknown>;
  const next: Partial<Prefs> = {};
  if (data.theme === "light" || data.theme === "dark") next.theme = data.theme;
  if (typeof data.boardId === "string" && isBoardThemeId(data.boardId)) {
    next.boardId = data.boardId;
  }
  if (typeof data.pieceId === "string" && isPieceSetId(data.pieceId)) {
    next.pieceId = data.pieceId;
  }
  const hasReview =
    "goodIntervals" in data ||
    "againIntervals" in data ||
    "againTimes" in data ||
    "intervalUnit" in data;
  if (hasReview) {
    const review = normalizeReviewPrefs(data);
    next.goodIntervals = review.goodIntervals;
    next.againIntervals = review.againIntervals;
    next.againTimes = review.againTimes;
    next.intervalUnit = "min";
  }
  return next;
}

export function serializePrefs(prefs: Prefs): string {
  return JSON.stringify(prefs);
}
