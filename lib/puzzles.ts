import { isValidFen, normalizeUci, startFenForLine } from "@/lib/chess";
import {
  emptyPuzzleMarkup,
  isEmptyPuzzleMarkup,
  serializePuzzleMarkup,
} from "@/lib/markup";
import { CH_MAT_DAMOU_1, CH_MAT_VEZI_1, sortPuzzles, themeChapterId } from "@/lib/curriculum";
import { parseSquares } from "@/lib/squares";
import type { Puzzle, PuzzleInput, PuzzleKind, PuzzleRow } from "@/lib/types";
import { cleanWrongReplies, mergeWrongSources, packExplanation } from "@/lib/wrong-replies";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | undefined | null): value is string {
  return Boolean(value && UUID.test(value));
}

const DEMO_PUZZLES_RAW: Puzzle[] = [
  {
    id: "demo-back-rank",
    title: "Mat na poslední řadě",
    fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
    moves: ["e1e8"],
    kind: "move",
    squares: [],
    theme: "Mat v 1",
    chapterId: CH_MAT_VEZI_1,
    level: "Začátečník",
    hint: "Černý král je zamčený na poslední řadě. Použij věž.",
    explanation:
      "Ve8# je klasický mat na poslední řadě. Král nemá únik, protože vlastní pěšci blokují f7, g7 a h7.",
    wrongReplies: [
      {
        answer: "e1e7",
        text: "Ve7 není mat. Král utekne na f8 nebo h8.",
      },
      {
        answer: "e1e5",
        text: "Šach po sloupci e, ale král má únik. Potřebuješ poslední řadu.",
      },
      {
        answer: "e1a1",
        text: "Věž zůstává na první řadě. Mat je na osmé.",
      },
    ],
    markup: {
      before: {
        colors: {},
        circles: { g8: "yellow" },
        arrows: [],
      },
      after: {
        colors: { e8: "green" },
        circles: {},
        arrows: [{ from: "e1", to: "e8", color: "green" }],
      },
    },
  },
  {
    id: "demo-fools-mate",
    title: "Mat bláznů",
    fen: "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2",
    moves: ["d8h4"],
    kind: "move",
    squares: [],
    theme: "Mat v 1",
    chapterId: CH_MAT_DAMOU_1,
    level: "Začátečník",
    hint: "Bílý zeslabil diagonálu e1–h4. Podívej se na dámu.",
    explanation:
      "Dh4# je nejrychlejší mat v šachu. Tahy f3 a g4 otevřely cestu k bílému králi.",
    wrongReplies: [
      {
        answer: "d8g5",
        text: "Dg5 je šach, bílý ale může krýt. Mat je jen Dh4.",
      },
      {
        answer: "d8f6",
        text: "Df6 nic nedává. Diagonála k bílému králi je e1–h4.",
      },
    ],
  },
  {
    id: "demo-scholars",
    title: "Školní mat",
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
    moves: ["h5f7"],
    kind: "move",
    squares: [],
    theme: "Mat v 1",
    chapterId: CH_MAT_DAMOU_1,
    level: "Začátečník",
    hint: "Dáma a střelec už míří na f7.",
    explanation:
      "Dxf7# je školní mat. Střelec na c4 kryje dámu, král nemá braní ani únik.",
    wrongReplies: [
      {
        answer: "h5h7",
        text: "Dxh7 není kryté. Černý král dámu vezme.",
      },
      {
        answer: "h5e5",
        text: "Dxe5 bere pěšce, ale není to mat. Cíl je f7.",
      },
      {
        answer: "c4f7",
        text: "Sxf7+ je šach, král ale může utéct nebo brát. Mat dává dáma.",
      },
    ],
  },
  {
    id: "demo-knight-hops",
    title: "Kam skočí jezdec",
    fen: "4k3/8/8/8/3N4/8/8/4K3 w - - 0 1",
    moves: [],
    kind: "squares",
    squares: ["b3", "b5", "c2", "c6", "e2", "e6", "f3", "f5"],
    theme: "Tahy figur",
    level: "Začátečník",
    hint: "Jezdec skáče do L: dvě pole rovně, jedno stranou.",
    explanation:
      "Jezdec na d4 má osm skoků: b3, b5, c2, c6, e2, e6, f3, f5. Prázdná šachovnice, nic neblokuje.",
    wrongReplies: [
      {
        answer: "d5",
        text: "Jezdec neskáče rovně jako věž. Z d4 na d5 nejde.",
      },
      {
        answer: "e5",
        text: "e5 je pole střelce/dámy, ne jezdce. Jezdec skáče do L.",
      },
      {
        answer: "c4",
        text: "c4 je vedle jezdce. Jezdec vždy dvě + jedno, ne o jedno pole.",
      },
    ],
  },
  {
    id: "demo-rook-rays",
    title: "Kam může věž",
    fen: "4k3/8/8/8/8/8/8/R3K3 w - - 0 1",
    moves: [],
    kind: "squares",
    squares: ["a2", "a3", "a4", "a5", "a6", "a7", "a8", "b1", "c1", "d1"],
    theme: "Tahy figur",
    level: "Začátečník",
    hint: "Věž jezdí rovně. Vlastní král na e1 jí cestu uzavře.",
    explanation:
      "Věž na a1 vidí sloupec a a řadu 1 až po krále. Pole e1 je obsazené, f1–h1 už ne.",
    wrongReplies: [
      {
        answer: "e1",
        text: "Na e1 stojí vlastní král. Věž tam nemůže.",
      },
      {
        answer: "b2",
        text: "b2 je šikmo. Věž jezdí jen rovně.",
      },
      {
        answer: "f1",
        text: "Cestu na f1 zavírá král na e1.",
      },
    ],
  },
  {
    id: "demo-king-flights",
    title: "Úniková pole krále",
    fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 b - - 0 1",
    moves: [],
    kind: "squares",
    squares: ["f8", "h8"],
    theme: "Šach a krytí",
    level: "Začátečník",
    hint: "Černý je na tahu. Kam král ještě může ustoupit?",
    explanation:
      "Pěšci na f7, g7, h7 berou vlastnímu králi pole. Zbývají f8 a h8. Věž na e1 poslední řadu ještě nekryje.",
    wrongReplies: [
      {
        answer: "g8",
        text: "Na g8 král už stojí. Hledáš, kam může ustoupit.",
      },
      {
        answer: "f7",
        text: "f7 je vlastní pěšec. Král ho v úniku nesejme.",
      },
      {
        answer: "g7",
        text: "g7 blokuje vlastní pěšec.",
      },
    ],
  },
  {
    id: "demo-bishop-rays",
    title: "Kam může střelec",
    fen: "4k3/8/8/8/8/8/8/2B1K3 w - - 0 1",
    moves: [],
    kind: "squares",
    squares: ["a3", "b2", "d2", "e3", "f4", "g5", "h6"],
    theme: "Tahy figur",
    level: "Začátečník",
    hint: "Střelec jezdí šikmo. Vlastní král mu druhou diagonálu nesežere.",
    explanation:
      "Střelec na c1 vidí a3, b2 a d2–h6. Pole e1 drží král, druhá diagonála z c1 neexistuje.",
  },
  {
    id: "demo-queen-star",
    title: "Kam může dáma",
    fen: "4k3/8/8/8/3Q4/8/8/4K3 w - - 0 1",
    moves: [],
    kind: "squares",
    squares: [
      "a1",
      "a4",
      "a7",
      "b2",
      "b4",
      "b6",
      "c3",
      "c4",
      "c5",
      "d1",
      "d2",
      "d3",
      "d5",
      "d6",
      "d7",
      "d8",
      "e3",
      "e4",
      "e5",
      "f2",
      "f4",
      "f6",
      "g1",
      "g4",
      "g7",
      "h4",
      "h8",
    ],
    theme: "Tahy figur",
    level: "Začátečník",
    hint: "Dáma = věž + střelec. Označ všechna volná pole, kam smí.",
    explanation:
      "Z d4 dáma vidí řadu, sloupec i obě diagonály. Pole d4 neoznačuj — dáma tam už stojí.",
  },
  {
    id: "demo-check-ray",
    title: "Kudy jde šach",
    fen: "4k3/8/8/8/8/8/4R3/4K3 w - - 0 1",
    moves: [],
    kind: "squares",
    squares: ["e3", "e4", "e5", "e6", "e7", "e8"],
    theme: "Šach a krytí",
    level: "Začátečník",
    hint: "Věž na e2 útočí na krále. Označ pole na linii útoku včetně krále.",
    explanation:
      "Šach jde po sloupci e: e3–e8. Král na e8 nemá kam uhnout z linie, dokud ji neblokuje nebo nesejme věž.",
  },
];

export const DEMO_PUZZLES: Puzzle[] = DEMO_PUZZLES_RAW.map((puzzle, index) => ({
  ...puzzle,
  chapterId: puzzle.chapterId ?? themeChapterId(puzzle.theme) ?? null,
  sort: puzzle.sort ?? index,
}));

export function puzzleKind(puzzle: Pick<Puzzle, "kind" | "squares" | "moves">): PuzzleKind {
  if (puzzle.kind === "squares" || puzzle.kind === "move") return puzzle.kind;
  return (puzzle.squares?.length ?? 0) > 0 ? "squares" : "move";
}

export function mapPuzzleRow(row: PuzzleRow): Puzzle {
  const packed = mergeWrongSources(
    row.wrong_replies,
    row.explanation,
    row.markup,
  );
  const squares = parseSquares(
    (row.squares && row.squares.length > 0 ? row.squares : packed.squares) ?? [],
  );
  const kind: PuzzleKind =
    row.kind === "squares" || packed.kind === "squares" || squares.length > 0
      ? "squares"
      : "move";
  const chapterId =
    (typeof row.chapter_id === "string" && row.chapter_id.trim()) ||
    packed.placement.chapterId ||
    themeChapterId(row.theme ?? undefined) ||
    null;
  const sort =
    typeof row.sort === "number" ? row.sort : packed.placement.sort;
  return {
    id: row.id,
    title: row.title,
    fen: row.fen,
    moves: row.moves ?? [],
    kind,
    squares,
    theme: row.theme ?? undefined,
    level: row.level ?? undefined,
    hint: row.hint ?? undefined,
    explanation: packed.explanation,
    source: row.source?.trim() || undefined,
    videoUrl: row.video_url ?? undefined,
    wrongReplies: packed.wrongReplies,
    markup: isEmptyPuzzleMarkup(packed.markup)
      ? undefined
      : packed.markup,
    chapterId,
    sort,
  };
}

export function isPuzzleComplete(puzzle: Puzzle): boolean {
  if (!puzzle.title || !puzzle.fen) return false;
  return puzzleKind(puzzle) === "squares"
    ? puzzle.squares.length > 0
    : Boolean(puzzle.moves[0]);
}

export function validatePuzzleInput(input: PuzzleInput): string | null {
  const title = input.title.trim();
  const fen = input.fen.trim();
  const kind: PuzzleKind = input.kind === "squares" ? "squares" : "move";
  const squares = parseSquares(input.squares);
  const moves = input.moves.map(normalizeUci).filter(Boolean);

  if (!title || !fen) {
    return "Název a FEN jsou povinné.";
  }
  if (!isValidFen(fen)) {
    return "Neplatný FEN.";
  }
  if (kind === "squares") {
    if (squares.length === 0) {
      return "Úloha na pole potřebuje aspoň jedno správné pole.";
    }
    return null;
  }
  if (moves.length === 0) {
    return "Úloha na tah potřebuje řešení v UCI, např. e1e8.";
  }
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(moves[0])) {
    return "Řešení musí být UCI, např. e1e8.";
  }
  return null;
}

export function puzzleRowPayload(input: PuzzleInput) {
  const kind: PuzzleKind = input.kind === "squares" ? "squares" : "move";
  const replies = cleanWrongReplies(input.wrongReplies);
  const markup = input.markup ?? emptyPuzzleMarkup();
  const chapterId = input.chapterId?.trim() || null;
  const sort = input.sort ?? 0;
  const moves = kind === "move" ? input.moves.map(normalizeUci).filter(Boolean) : [];
  const fen =
    kind === "move"
      ? startFenForLine(input.fen.trim(), moves)
      : input.fen.trim();
  return {
    title: input.title.trim(),
    fen,
    moves,
    kind,
    squares: kind === "squares" ? parseSquares(input.squares) : [],
    theme: input.theme?.trim() || null,
    level: input.level?.trim() || null,
    hint: input.hint?.trim() || null,
    source: input.source?.trim() || null,
    explanation: packExplanation(input.explanation, replies, markup, {
      chapterId,
      sort,
    }, { kind, squares: kind === "squares" ? parseSquares(input.squares) : [] }),
    video_url: input.videoUrl?.trim() || null,
    wrong_replies: replies,
    markup: serializePuzzleMarkup(markup),
    chapter_id: chapterId,
    sort,
  };
}

export function puzzleToSaveBody(puzzle: Puzzle) {
  return {
    id: puzzle.id,
    title: puzzle.title,
    fen: puzzle.fen,
    kind: puzzle.kind,
    moves: puzzle.moves,
    squares: puzzle.squares,
    theme: puzzle.theme,
    level: puzzle.level,
    hint: puzzle.hint,
    source: puzzle.source,
    explanation: puzzle.explanation,
    videoUrl: puzzle.videoUrl,
    wrongReplies: puzzle.wrongReplies,
    markup: puzzle.markup,
    chapterId: puzzle.chapterId ?? null,
    sort: puzzle.sort ?? 0,
  };
}

export function mergePuzzleBank(loaded: Puzzle[]): Puzzle[] {
  return loaded.length > 0 ? sortPuzzles(loaded) : DEMO_PUZZLES;
}
