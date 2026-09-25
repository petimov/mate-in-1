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

export function decodePgnBytes(bytes: Uint8Array): string {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes);
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes);
  }
  if (bytes.length >= 4 && bytes[0] === 0x5b && bytes[1] === 0x00) {
    return new TextDecoder("utf-16le").decode(bytes);
  }
  const utf8 = new TextDecoder("utf-8").decode(bytes);
  if (utf8.includes("\uFFFD")) {
    try {
      return new TextDecoder("windows-1250").decode(bytes);
    } catch {
      /* browser bez 1250 */
    }
  }
  return utf8;
}

export function normalizePgnText(text: string): string {
  let next = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  next = next.replace(/^%.*$/gm, "");
  const start = next.search(/\[/);
  if (start > 0) next = next.slice(start);
  next = next
    .replace(/(?<![0-9/])0-0-0(?![0-9])/g, "O-O-O")
    .replace(/(?<![0-9/])0-0(?![0-9])/g, "O-O");
  return next.trim();
}

function splitPgnGames(text: string): string[] {
  const normalized = normalizePgnText(text);
  if (!normalized) return [];
  const byEvent = normalized
    .split(/(?=\[Event\b)/i)
    .map((game) => game.trim())
    .filter((game) => /\[/.test(game));
  if (byEvent.length > 1) return byEvent;
  const byBlank = normalized
    .split(/\n\s*\n(?=\[)/)
    .map((game) => game.trim())
    .filter(Boolean);
  if (byBlank.length > 1) return byBlank;
  return [normalized];
}

function parseHeaders(pgn: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const re = /\[(\w+)\s+"([^"]*)"\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(pgn))) {
    headers[match[1]] = match[2];
  }
  return headers;
}

function stripNoise(movetext: string): string {
  let next = movetext.replace(/\[[^\]]*\]/g, " ");
  next = next.replace(/\{[^}]*\}/g, " ");
  next = next.replace(/;.*$/gm, " ");
  while (/\([^()]*\)/.test(next)) {
    next = next.replace(/\([^()]*\)/g, " ");
  }
  next = next.replace(/\$\d+/g, " ");
  return next;
}

function moveTokens(pgn: string): string[] {
  return stripNoise(pgn)
    .split(/\s+/)
    .map((token) => token.trim().replace(/^\d+\.+/, ""))
    .filter(
      (token) =>
        token &&
        !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(token),
    );
}

function loadGame(pgn: string): Chess {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn, { strict: false });
    if (chess.history().length > 0) return chess;
  } catch {
    /* fallback */
  }

  const headers = parseHeaders(pgn);
  const fen = headers.FEN?.trim() || headers.Fen?.trim() || "";
  const board = new Chess();
  if (fen) {
    try {
      board.load(fen, { preserveHeaders: true });
    } catch {
      throw new Error("Neplatný FEN v PGN.");
    }
  }
  for (const token of moveTokens(pgn)) {
    try {
      board.move(token, { strict: false });
    } catch {
      try {
        board.move(token.replace(/[+#?!]+$/, ""), { strict: false });
      } catch {
        break;
      }
    }
  }
  return board;
}

function moveToUci(move: VerboseMove): string {
  return normalizeUci(`${move.from}${move.to}${move.promotion ?? ""}`);
}

function pickMateMove(moves: VerboseMove[]): VerboseMove | null {
  for (let i = moves.length - 1; i >= 0; i -= 1) {
    if (moves[i].san.includes("#")) return moves[i];
  }
  return moves.at(-1) ?? null;
}

function headerText(headers: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = headers[key]?.trim();
    if (value && value !== "?") return value;
  }
  return "";
}

function parseGame(pgn: string, index: number): PuzzleInput | PgnSkip {
  let chess: Chess;
  try {
    chess = loadGame(pgn);
  } catch (error) {
    const reason =
      error instanceof Error ? error.message.slice(0, 120) : "PGN se nepodařilo načíst.";
    return { index, reason, event: parseHeaders(pgn).Event };
  }

  const headers = { ...parseHeaders(pgn), ...chess.getHeaders() };
  const event = headerText(headers, "Event") || undefined;
  const moves = chess.history({ verbose: true }) as VerboseMove[];
  const mate = pickMateMove(moves);

  if (!mate) {
    return { index, reason: "V partii nejsou tahy.", event };
  }

  const fen = mate.before?.trim() || headers.FEN?.trim() || "";
  const uci = moveToUci(mate);

  if (!fen || !isValidFen(fen)) {
    return { index, reason: "Neplatný FEN.", event };
  }

  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) {
    return { index, reason: "Nepřečetl se matový tah.", event };
  }

  const title =
    headerText(headers, "PuzzleTitle", "White", "Event") ||
    `Importovaná úloha ${index + 1}`;

  const source =
    [headers.White, headers.Black].filter((name) => name && name !== "?").join(" vs ") ||
    event ||
    undefined;

  return {
    title,
    fen,
    kind: "move",
    moves: [uci],
    theme: event,
    source,
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
