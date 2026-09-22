import { Chess, type Square } from "chess.js";

export type DestSquare = {
  square: string;
  capture: boolean;
};

export function orientationFromFen(fen: string): "white" | "black" {
  const side = fen.trim().split(/\s+/)[1];
  return side === "b" ? "black" : "white";
}

export function chessgroundDests(chess: Chess): Map<string, string[]> {
  const dests = new Map<string, string[]>();
  try {
    for (const move of chess.moves({ verbose: true })) {
      const list = dests.get(move.from);
      if (list) {
        if (!list.includes(move.to)) list.push(move.to);
      } else dests.set(move.from, [move.to]);
    }
  } catch {
    /* empty */
  }
  return dests;
}

export function legalDests(chess: Chess, from: string): DestSquare[] {
  try {
    return chess.moves({ square: from as Square, verbose: true }).map((move) => ({
      square: move.to,
      capture: move.isCapture(),
    }));
  } catch {
    return [];
  }
}

export function isSideToMove(chess: Chess, square: string): boolean {
  const piece = chess.get(square as Square);
  return Boolean(piece && piece.color === chess.turn());
}

export function pieceTypeAt(chess: Chess, square: string): string {
  const piece = chess.get(square as Square);
  if (!piece) return "";
  return `${piece.color}${piece.type.toUpperCase()}`;
}

export function isValidFen(fen: string): boolean {
  return safeChess(fen) !== null;
}

export function safeChess(fen: string): Chess | null {
  try {
    return new Chess(fen);
  } catch {
    return null;
  }
}

export function dropToUci(
  sourceSquare: string,
  targetSquare: string,
  pieceType: string,
  solutionUci: string,
): string {
  const base = `${sourceSquare}${targetSquare}`.toLowerCase();
  const solution = solutionUci.toLowerCase();
  const isPawn = pieceType.toUpperCase().endsWith("P");
  const rank = targetSquare[1];
  const promotes = isPawn && (rank === "8" || rank === "1");

  if (!promotes) return base;

  const promo = solution.startsWith(base) && solution.length > 4 ? solution[4] : "q";
  return `${base}${promo}`;
}

export function applyUci(chess: Chess, uci: string): boolean {
  const from = uci.slice(0, 2) as Square;
  const to = uci.slice(2, 4) as Square;
  const promotion = uci.length > 4 ? (uci[4] as "q" | "r" | "b" | "n") : undefined;

  try {
    const move = chess.move({ from, to, promotion });
    return Boolean(move);
  } catch {
    return false;
  }
}

export function normalizeUci(uci: string): string {
  return uci.trim().toLowerCase().replace(/[^a-h1-8qrbn]/g, "");
}

export function uciToSan(fen: string, uci: string): string {
  const chess = safeChess(fen);
  if (!chess) return uci;
  const applied = applyUci(chess, normalizeUci(uci));
  if (!applied) return uci;
  const last = chess.history({ verbose: true }).at(-1);
  return last?.san ?? uci;
}

export type LinePly = {
  san: string;
  uci: string;
  from: string;
  to: string;
  color: "w" | "b";
  number: number;
};

export type LineReplay = {
  fens: string[];
  plies: LinePly[];
  lastMoves: ({ from: string; to: string } | null)[];
};

export function buildLine(startFen: string, ucis: string[]): LineReplay {
  const chess = safeChess(startFen) ?? new Chess();
  const fens = [chess.fen()];
  const lastMoves: ({ from: string; to: string } | null)[] = [null];
  const plies: LinePly[] = [];

  for (const raw of ucis) {
    const uci = normalizeUci(raw);
    const color = chess.turn();
    const number = chess.moveNumber();
    if (!applyUci(chess, uci)) break;
    const last = chess.history({ verbose: true }).at(-1);
    const from = last?.from ?? uci.slice(0, 2);
    const to = last?.to ?? uci.slice(2, 4);
    plies.push({
      san: last?.san ?? uci,
      uci,
      from,
      to,
      color,
      number,
    });
    fens.push(chess.fen());
    lastMoves.push({ from, to });
  }

  return { fens, plies, lastMoves };
}

export function fenAfterUci(fen: string, uci: string): string | null {
  const chess = safeChess(fen);
  if (!chess) return null;
  if (!applyUci(chess, normalizeUci(uci))) return null;
  return chess.fen();
}

export function fenBeforeUci(fen: string, uci: string): string | null {
  const normalized = normalizeUci(uci);
  if (normalized.length < 4) return null;
  if (fenAfterUci(fen, normalized)) return fen;

  const chess = safeChess(fen);
  if (!chess) return null;
  const from = normalized.slice(0, 2) as Square;
  const to = normalized.slice(2, 4) as Square;
  const promo = normalized[4];
  const piece = chess.get(to);
  if (!piece || chess.get(from)) return null;

  chess.remove(to);
  const restored = promo
    ? { type: "p" as const, color: piece.color }
    : { type: piece.type, color: piece.color };
  if (!chess.put(restored, from)) return null;

  const parts = chess.fen().split(" ");
  parts[1] = piece.color;
  const start = parts.join(" ");
  if (!safeChess(start) || !fenAfterUci(start, normalized)) return null;
  return start;
}

export function startFenForLine(fen: string, ucis: string[]): string {
  const first = ucis.map(normalizeUci).find((item) => item.length >= 4);
  if (!first) return fen;
  return fenBeforeUci(fen, first) ?? fen;
}
