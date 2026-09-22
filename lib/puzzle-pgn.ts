import { uciToSan } from "@/lib/chess";
import { puzzleKind } from "@/lib/puzzles";
import { SCHOOL } from "@/lib/school";
import type { Puzzle } from "@/lib/types";

export function puzzlesToPgn(puzzles: Puzzle[]): string {
  return puzzles
    .filter((puzzle) => puzzleKind(puzzle) === "move" && puzzle.moves[0])
    .map((puzzle) => {
      const san = uciToSan(puzzle.fen, puzzle.moves[0]);
      return [
        `[Event "${SCHOOL.name}"]`,
        `[Site "${SCHOOL.city}"]`,
        `[White "Bílý"]`,
        `[Black "Černý"]`,
        `[Result "*"]`,
        `[FEN "${puzzle.fen}"]`,
        `[SetUp "1"]`,
        `[PuzzleTitle "${puzzle.title}"]`,
        `[PuzzleTheme "${puzzle.theme ?? ""}"]`,
        "",
        `${san} *`,
        "",
      ].join("\n");
    })
    .join("\n");
}
