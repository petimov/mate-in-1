import type { Curriculum } from "@/lib/curriculum";
import type { Puzzle } from "@/lib/types";

export const ADMIN_HISTORY_MAX = 20;

export type AdminSnapshot<TForm> = {
  label: string;
  curriculum: Curriculum;
  puzzles: Puzzle[];
  courseId: string;
  selectedChapterId: string | null;
  form: TForm;
};

export function takeSnapshot<TForm>(input: AdminSnapshot<TForm>): AdminSnapshot<TForm> {
  return {
    label: input.label,
    curriculum: structuredClone(input.curriculum),
    puzzles: structuredClone(input.puzzles),
    courseId: input.courseId,
    selectedChapterId: input.selectedChapterId,
    form: structuredClone(input.form),
  };
}

export function puzzleFingerprint(puzzle: Puzzle): string {
  return JSON.stringify({
    id: puzzle.id,
    title: puzzle.title,
    fen: puzzle.fen,
    moves: puzzle.moves,
    kind: puzzle.kind,
    squares: puzzle.squares,
    theme: puzzle.theme ?? "",
    level: puzzle.level ?? "",
    hint: puzzle.hint ?? "",
    explanation: puzzle.explanation ?? "",
    source: puzzle.source ?? "",
    videoUrl: puzzle.videoUrl ?? "",
    wrongReplies: puzzle.wrongReplies ?? [],
    markup: puzzle.markup ?? null,
    chapterId: puzzle.chapterId ?? null,
    sort: puzzle.sort ?? 0,
  });
}

export function puzzleMap(puzzles: Puzzle[]): Map<string, Puzzle> {
  return new Map(puzzles.map((item) => [item.id, item]));
}

export function puzzlesToRestore(from: Puzzle[], to: Puzzle[]): Puzzle[] {
  const current = puzzleMap(from);
  return to.filter((item) => {
    const existing = current.get(item.id);
    return !existing || puzzleFingerprint(existing) !== puzzleFingerprint(item);
  });
}

export function puzzlesToDrop(from: Puzzle[], to: Puzzle[]): string[] {
  const keep = new Set(to.map((item) => item.id));
  return from.map((item) => item.id).filter((id) => !keep.has(id));
}
