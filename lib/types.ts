import type { BoardMarkup, PuzzleMarkup } from "@/lib/markup";
import type { PracticeTag } from "@/lib/practice-tags";
import type { PuzzleParams } from "@/lib/puzzle-params";

export type PuzzleKind = "move" | "squares";

export type WrongReply = {
  answer: string;
  text: string;
  markup?: BoardMarkup;
};

export interface Puzzle {
  id: string;
  title: string;
  fen: string;
  moves: string[];
  kind: PuzzleKind;
  squares: string[];
  theme?: string;
  level?: string;
  hint?: string;
  explanation?: string;
  source?: string;
  videoUrl?: string;
  wrongReplies?: WrongReply[];
  markup?: PuzzleMarkup;
  chapterId?: string | null;
  sort?: number;
  /** Alias Motivace: role Z|P. Prefer params.role. */
  tags?: PracticeTag[];
  /** Excel parametry A–P (Q–T computed). */
  params?: PuzzleParams;
}

export interface PuzzleInput {
  title: string;
  fen: string;
  moves: string[];
  kind?: PuzzleKind;
  squares?: string[];
  theme?: string;
  level?: string;
  hint?: string;
  explanation?: string;
  source?: string;
  videoUrl?: string;
  wrongReplies?: WrongReply[];
  markup?: PuzzleMarkup;
  chapterId?: string | null;
  sort?: number;
  allowEmptyMoves?: boolean;
  tags?: PracticeTag[];
  params?: PuzzleParams;
}

export interface PuzzleRow {
  id: string;
  title: string;
  fen: string;
  moves: string[];
  kind?: string | null;
  squares?: string[] | null;
  theme?: string | null;
  level?: string | null;
  hint: string | null;
  explanation: string | null;
  source?: string | null;
  video_url: string | null;
  wrong_replies?: unknown;
  markup?: unknown;
  chapter_id?: string | null;
  sort?: number | null;
}
