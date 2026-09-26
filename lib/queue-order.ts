import {
  chapterKindOf,
  chapterSideOf,
  sortPuzzles,
  type Chapter,
  type ChapterKind,
} from "@/lib/curriculum";
import type { LessonMode } from "@/lib/review-prefs";
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
  lessonMode: LessonMode;
}): boolean {
  if (opts.lessonMode === "colors") return false;
  if (opts.reviewOnly || opts.lessonMode === "chaos") return true;
  return false;
}

export function filterLessonPuzzles(
  puzzles: Puzzle[],
  chapters: Chapter[],
  mode: LessonMode,
): Puzzle[] {
  if (mode !== "chaos") return puzzles;
  const kinds = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  return puzzles.filter((puzzle) => {
    if (!puzzle.chapterId) return false;
    return chapterKindOf(kinds.get(puzzle.chapterId)) === "cviceni";
  });
}

export function orderPuzzlesBySide(
  puzzles: Puzzle[],
  chapters: Chapter[],
): Puzzle[] {
  const white: Puzzle[] = [];
  const black: Puzzle[] = [];
  for (const puzzle of sortPuzzles(puzzles)) {
    if (chapterSideOf(chapters, puzzle.chapterId) === "black") {
      black.push(puzzle);
    } else {
      white.push(puzzle);
    }
  }
  return [...white, ...black];
}

export function orderSessionPuzzles(
  puzzles: Puzzle[],
  shuffle: boolean,
  chapters?: Chapter[],
  mode?: LessonMode,
): Puzzle[] {
  if (mode === "colors" && chapters) {
    return orderPuzzlesBySide(puzzles, chapters);
  }
  return shuffle ? shufflePuzzles(puzzles) : sortPuzzles(puzzles);
}
