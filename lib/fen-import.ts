import { applyUci, isValidFen, normalizeUci, safeChess } from "@/lib/chess";
import type { PgnParseResult, PgnSkip } from "@/lib/pgn-import";
import type { PuzzleInput } from "@/lib/types";

const UCI_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/i;
const BOARD_RE = /^[1-8prnbqkPRNBQK/]+$/;

/** Doplň chybějící FEN pole (jen deska → w - - 0 1). */
export function completeFen(raw: string): string {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length >= 6) return parts.slice(0, 6).join(" ");
  if (parts.length === 1 && BOARD_RE.test(parts[0]!)) {
    return `${parts[0]} w - - 0 1`;
  }
  const board = parts[0] ?? "";
  const turn = parts[1] === "b" || parts[1] === "w" ? parts[1] : "w";
  const castling = parts[2] ?? "-";
  const ep = parts[3] ?? "-";
  const half = parts[4] ?? "0";
  const full = parts[5] ?? "1";
  return `${board} ${turn} ${castling} ${ep} ${half} ${full}`;
}

function stripLineNoise(line: string): string {
  return line
    .replace(/^\uFEFF/, "")
    .replace(/#.*$/, "")
    .replace(/\/\/.*$/, "")
    .trim();
}

/** Je text spíš seznam FEN než PGN? */
export function looksLikeFenList(text: string): boolean {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (!trimmed) return false;
  if (/\[\s*Event\b/i.test(trimmed) || /\[\s*FEN\b/i.test(trimmed)) {
    return false;
  }
  const lines = trimmed
    .split(/\r?\n/)
    .map(stripLineNoise)
    .filter(Boolean);
  if (lines.length === 0) return false;
  let fenish = 0;
  for (const line of lines.slice(0, 12)) {
    const candidate = extractFenCandidate(line);
    if (candidate && isValidFen(completeFen(candidate))) fenish += 1;
  }
  return fenish > 0 && fenish >= Math.ceil(Math.min(lines.length, 12) / 2);
}

function extractFenCandidate(line: string): string | null {
  // title | fen [| uci]
  // title; fen
  // fen uci
  const pipe = line.split("|").map((part) => part.trim());
  if (pipe.length >= 2) {
    const maybeFen = pipe.find((part) => part.includes("/"));
    if (maybeFen) return maybeFen.split(/\s+/).slice(0, 6).join(" ");
  }
  const semi = line.split(";").map((part) => part.trim());
  if (semi.length >= 2) {
    const maybeFen = semi.find((part) => part.includes("/"));
    if (maybeFen) return maybeFen.split(/\s+/).slice(0, 6).join(" ");
  }
  // "1. fen..." / "1) fen"
  const numbered = line.replace(/^\d+[.)]\s*/, "");
  if (numbered.includes("/")) {
    const tokens = numbered.split(/\s+/);
    const boardIdx = tokens.findIndex((t) => t.includes("/"));
    if (boardIdx >= 0) {
      return tokens.slice(boardIdx, boardIdx + 6).join(" ");
    }
  }
  if (line.includes("/")) {
    const tokens = line.split(/\s+/);
    const boardIdx = tokens.findIndex((t) => t.includes("/"));
    if (boardIdx >= 0) {
      return tokens.slice(boardIdx, boardIdx + 6).join(" ");
    }
  }
  return null;
}

function extractTitle(line: string, fen: string, index: number): string {
  const withoutFen = line
    .replace(fen, " ")
    .replace(/[|;]/g, " ")
    .replace(UCI_RE, " ")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (withoutFen && withoutFen.length <= 48 && !withoutFen.includes("/")) {
    return withoutFen;
  }
  return `FEN ${index + 1}`;
}

function extractUci(line: string, fen: string): string | undefined {
  const tokens = line
    .replace(fen, " ")
    .split(/[\s|;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  for (const token of tokens) {
    const uci = normalizeUci(token);
    if (!UCI_RE.test(uci)) continue;
    const game = safeChess(fen);
    if (!game) continue;
    if (applyUci(game, uci)) return uci;
  }
  return undefined;
}

function parseFenLine(
  line: string,
  index: number,
): PuzzleInput | PgnSkip {
  const candidate = extractFenCandidate(line);
  if (!candidate) {
    return { index, reason: "Řádek bez FEN." };
  }
  const fen = completeFen(candidate);
  if (!isValidFen(fen)) {
    return { index, reason: "Neplatný FEN.", event: candidate.slice(0, 40) };
  }
  const move = extractUci(line, fen);
  return {
    title: extractTitle(line, candidate, index),
    fen,
    kind: "move",
    moves: move ? [move] : [],
    allowEmptyMoves: true,
  };
}

/** Seznam FEN/EPD (řádek = pozice). Volitelně title|fen|uci. */
export function parseFenText(text: string): PgnParseResult {
  const lines = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map(stripLineNoise)
    .filter(Boolean);

  const puzzles: PuzzleInput[] = [];
  const skipped: PgnSkip[] = [];

  lines.forEach((line, index) => {
    const parsed = parseFenLine(line, index);
    if ("fen" in parsed) puzzles.push(parsed);
    else skipped.push(parsed);
  });

  return { puzzles, skipped, total: lines.length };
}
