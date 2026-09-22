import { orientationFromFen } from "@/lib/chess";
import { puzzleKind } from "@/lib/puzzles";
import type { Puzzle } from "@/lib/types";

export function defaultPrompt(puzzle: Puzzle): string {
  if (puzzleKind(puzzle) === "squares") return "Označ správná pole.";
  const who = orientationFromFen(puzzle.fen) === "black" ? "Černý" : "Bílý";
  return `${who} na tahu dá mat.`;
}

export function puzzlePrompt(puzzle: Puzzle): string {
  const custom = puzzle.hint?.trim();
  return custom || defaultPrompt(puzzle);
}

const SOURCE_KEY = "mate-show-source";

export function readShowSource(): boolean {
  try {
    return localStorage.getItem(SOURCE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeShowSource(on: boolean) {
  try {
    localStorage.setItem(SOURCE_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}
