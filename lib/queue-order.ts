import type { ChapterKind } from "@/lib/curriculum";
import { sortPuzzles } from "@/lib/curriculum";
import type { SrsMap } from "@/lib/srs";
import type { Puzzle } from "@/lib/types";

export function shufflePuzzles<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function isFirstPass(ids: string[], map: SrsMap): boolean {
  return ids.every((id) => !map[id] || map[id].reps === 0);
}

export function sessionShouldShuffle(opts: {
  kind: ChapterKind;
  reviewOnly: boolean;
  firstPass: boolean;
}): boolean {
  if (opts.reviewOnly) return true;
  if (opts.kind === "cviceni") return true;
  return !opts.firstPass;
}

export function orderSessionPuzzles(
  puzzles: Puzzle[],
  shuffle: boolean,
): Puzzle[] {
  return shuffle ? shufflePuzzles(puzzles) : sortPuzzles(puzzles);
}
