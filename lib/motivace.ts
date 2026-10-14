import {
  chapterKindOf,
  chapterSideOf,
  childChapters,
  puzzlesInChapter,
  type Chapter,
  type ChapterSide,
} from "@/lib/curriculum";
import { BRUSH_HEX, type Brush } from "@/lib/markup";
import { hasPracticeMotivaceTag } from "@/lib/practice-tags";
import type { ChapterBest } from "@/lib/practice-store";
import type { Puzzle } from "@/lib/types";

export type MotivacePiece =
  | "king"
  | "queen"
  | "rook"
  | "bishop"
  | "knight"
  | "pawn";

export const MOTIVACE_PIECE_ORDER: MotivacePiece[] = [
  "rook",
  "queen",
  "bishop",
  "knight",
  "pawn",
  "king",
];

export const MOTIVACE_PIECE_BRUSH: Record<MotivacePiece, Brush> = {
  king: "orange",
  queen: "rose",
  rook: "blue",
  bishop: "green",
  knight: "brown",
  pawn: "yellow",
};

export const MOTIVACE_PIECE_LABEL: Record<MotivacePiece, string> = {
  king: "Král",
  queen: "Dáma",
  rook: "Věž",
  bishop: "Střelec",
  knight: "Kůň",
  pawn: "Pěšec",
};

export function motivacePieceColor(piece: MotivacePiece): string {
  return BRUSH_HEX[MOTIVACE_PIECE_BRUSH[piece]];
}

export function detectMotivacePiece(title: string): MotivacePiece | null {
  const t = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (/dam/.test(t)) return "queen";
  if (/vez/.test(t)) return "rook";
  if (/strel/.test(t)) return "bishop";
  if (/kun|jezd/.test(t)) return "knight";
  if (/pes/.test(t)) return "pawn";
  if (/kral/.test(t) && !/dam/.test(t)) return "king";
  return null;
}

export function detectPieceFromChain(
  chapter: Chapter,
  chapters: Chapter[],
): MotivacePiece | null {
  let current: Chapter | undefined = chapter;
  while (current) {
    const piece = detectMotivacePiece(current.title);
    if (piece) return piece;
    current = current.parentId
      ? chapters.find((item) => item.id === current!.parentId)
      : undefined;
  }
  return null;
}

export type MotivaceColumn = {
  chapter: Chapter;
  piece: MotivacePiece;
  side: ChapterSide;
  puzzles: Puzzle[];
  best?: ChapterBest;
  wip: boolean;
};

export type MotivaceSection = {
  parent: Chapter;
  side: ChapterSide;
  sideLabel: string;
  columns: MotivaceColumn[];
};

/**
 * Úlohy do motivace: preferuj tagy Z/P.
 * Když kapitola nemá žádný tag, ber všechny přímé úlohy (cvičení).
 */
export function puzzleCountsForMotivace(
  puzzles: Puzzle[],
  chapterId: string,
  chapters: Chapter[],
): Puzzle[] {
  const direct = puzzlesInChapter(puzzles, chapterId, false, chapters);
  const tagged = direct.filter((puzzle) =>
    hasPracticeMotivaceTag(puzzle.tags),
  );
  return tagged.length > 0 ? tagged : direct;
}

/** Cvičení kapitoly s úlohami → sloupce podle figurky (i z nadkapitoly). */
export function buildMotivaceSections(
  chapters: Chapter[],
  puzzles: Puzzle[],
  courseId: string,
  chapterBest: Record<string, ChapterBest>,
  wipChapterId: string | null,
): MotivaceSection[] {
  const roots = childChapters(chapters, null, courseId);
  const sections: MotivaceSection[] = [];

  function walk(node: Chapter) {
    const kids = childChapters(chapters, node.id, courseId);
    const leafPuzzles = puzzleCountsForMotivace(puzzles, node.id, chapters);
    const isCviceni = chapterKindOf(node) === "cviceni";
    const piece = detectPieceFromChain(node, chapters) ?? "pawn";

    // List cvičení (nebo jakákoli kapitola s Z/P úlohami) s přímými úlohami.
    const hasTagged = leafPuzzles.some((puzzle) =>
      hasPracticeMotivaceTag(puzzle.tags),
    );
    if (
      leafPuzzles.length > 0 &&
      kids.length === 0 &&
      (isCviceni || hasTagged)
    ) {
      const side = node.side ?? chapterSideOf(chapters, node.id);
      const sectionParent = node.parentId
        ? chapters.find((item) => item.id === node.parentId) ?? node
        : node;
      let section = sections.find(
        (item) => item.parent.id === sectionParent.id && item.side === side,
      );
      if (!section) {
        section = {
          parent: sectionParent,
          side,
          sideLabel: side === "black" ? "černými" : "bílými",
          columns: [],
        };
        sections.push(section);
      }
      section.columns.push({
        chapter: node,
        piece,
        side,
        puzzles: leafPuzzles,
        best: chapterBest[node.id],
        wip: wipChapterId === node.id,
      });
    }

    for (const kid of kids) walk(kid);
  }

  for (const root of roots) walk(root);

  for (const section of sections) {
    section.columns.sort(
      (a, b) =>
        MOTIVACE_PIECE_ORDER.indexOf(a.piece) -
          MOTIVACE_PIECE_ORDER.indexOf(b.piece) ||
        a.chapter.sort - b.chapter.sort,
    );
  }

  return sections.sort(
    (a, b) =>
      a.parent.sort - b.parent.sort ||
      (a.side === "white" ? 0 : 1) - (b.side === "white" ? 0 : 1),
  );
}
