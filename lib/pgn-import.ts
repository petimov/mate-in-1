import { Chess } from "chess.js";

import { isValidFen, normalizeUci } from "@/lib/chess";
import type { PuzzleInput } from "@/lib/types";

export type PgnSkip = {
  index: number;
  reason: string;
  event?: string;
};

export type PgnParseResult = {
  puzzles: PuzzleInput[];
  skipped: PgnSkip[];
  total: number;
};

type VerboseMove = {
  from: string;
  to: string;
  promotion?: string;
  san: string;
  before: string;
};

function splitPgnGames(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) return [];
  return normalized
    .split(/\n\s*\n(?=\[)/)
    .map((game) => game.trim())
    .filter(Boolean);
}

function moveToUci(move: VerboseMove): string {
  return normalizeUci(`${move.from}${move.to}${move.promotion ?? ""}`);
}

function pickMateMove(moves: VerboseMove[]): VerboseMove | null {
  for (let i = moves.length - 1; i >= 0; i -= 1) {
    if (moves[i].san.includes("#")) return moves[i];
  }
  return moves[0] ?? null;
}

function parseGame(pgn: string, index: number): PuzzleInput | PgnSkip {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn, { strict: false });
  } catch {
    return { index, reason: "Could not parse PGN game." };
  }

  const headers = chess.getHeaders();
  const event = headers.Event?.trim() || undefined;
  const moves = chess.history({ verbose: true }) as VerboseMove[];
  const mate = pickMateMove(moves);

  if (!mate) {
    return { index, reason: "No moves in game.", event };
  }

  const fen = mate.before?.trim() || headers.FEN?.trim() || "";
  const uci = moveToUci(mate);

  if (!fen || !isValidFen(fen)) {
    return { index, reason: "Invalid FEN.", event };
  }

  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) {
    return { index, reason: "Could not read mating move.", event };
  }

  const title =
    event ||
    [headers.White, headers.Black].filter(Boolean).join(" vs ") ||
    `Imported puzzle ${index + 1}`;

  const source =
    [headers.White, headers.Black].filter(Boolean).join(" vs ") ||
    (typeof event === "string" ? event : "") ||
    undefined;

  return {
    title,
    fen,
    kind: "move",
    moves: [uci],
    source: source || undefined,
  };
}

export function parsePgnText(text: string): PgnParseResult {
  const games = splitPgnGames(text);
  const puzzles: PuzzleInput[] = [];
  const skipped: PgnSkip[] = [];

  games.forEach((game, index) => {
    const parsed = parseGame(game, index);
    if ("fen" in parsed) {
      puzzles.push(parsed);
    } else {
      skipped.push(parsed);
    }
  });

  return { puzzles, skipped, total: games.length };
}
