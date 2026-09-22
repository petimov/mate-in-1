import type { PuzzleMarkup } from "@/lib/markup";

export type PuzzleKind = "move" | "squares";

export type WrongReply = {
  answer: string;
  text: string;
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
