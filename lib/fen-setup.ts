const FILES = "abcdefgh";
const START_BOARD = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
export const EMPTY_SETUP_FEN = "8/8/8/8/8/8/8/8 w - - 0 1";
export const START_SETUP_FEN = `${START_BOARD} w KQkq - 0 1`;

const PIECE_LETTER: Record<string, string> = {
  wP: "P",
  wN: "N",
  wB: "B",
  wR: "R",
  wQ: "Q",
  wK: "K",
  bP: "p",
  bN: "n",
  bB: "b",
  bR: "r",
  bQ: "q",
  bK: "k",
};

function fenParts(fen: string): string[] {
  const parts = fen.trim().split(/\s+/);
  return [
    parts[0] || "8/8/8/8/8/8/8/8",
    parts[1] === "b" ? "b" : "w",
    parts[2] || "-",
    parts[3] || "-",
    parts[4] || "0",
    parts[5] || "1",
  ];
}

function joinFen(board: string, rest: string[]): string {
  return [board, rest[1], rest[2], rest[3], rest[4], rest[5]].join(" ");
}

export function fenToMap(fen: string): Record<string, string> {
  const board = fenParts(fen)[0];
  const map: Record<string, string> = {};
  const ranks = board.split("/");
  for (let rankIndex = 0; rankIndex < 8; rankIndex += 1) {
    const rank = ranks[rankIndex] ?? "";
    let file = 0;
    for (const ch of rank) {
      if (file >= 8) break;
      if (/[1-8]/.test(ch)) {
        file += Number(ch);
        continue;
      }
      const square = `${FILES[file]}${8 - rankIndex}`;
      map[square] = ch;
      file += 1;
    }
  }
  return map;
}

export function mapToBoard(map: Record<string, string>): string {
  const ranks: string[] = [];
  for (let rank = 8; rank >= 1; rank -= 1) {
    let empty = 0;
    let row = "";
    for (const file of FILES) {
      const piece = map[`${file}${rank}`];
      if (!piece) {
        empty += 1;
        continue;
      }
      if (empty) {
        row += String(empty);
        empty = 0;
      }
      row += piece;
    }
    if (empty) row += String(empty);
    ranks.push(row || "8");
  }
  return ranks.join("/");
}

function withBoard(fen: string, map: Record<string, string>): string {
  const parts = fenParts(fen);
  return joinFen(mapToBoard(map), parts);
}

export function fenTurn(fen: string): "w" | "b" {
  return fenParts(fen)[1] === "b" ? "b" : "w";
}

export function setFenTurn(fen: string, turn: "w" | "b"): string {
  const parts = fenParts(fen);
  parts[1] = turn;
  return parts.join(" ");
}

export function setFenPiece(
  fen: string,
  square: string,
  pieceType: string | null,
): string {
  const map = fenToMap(fen);
  if (!pieceType) {
    delete map[square];
    return withBoard(fen, map);
  }
  const letter = PIECE_LETTER[pieceType] ?? pieceType;
  if (!/^[prnbqkPRNBQK]$/.test(letter)) return fen;
  map[square] = letter;
  return withBoard(fen, map);
}

export function moveFenPiece(fen: string, from: string, to: string): string {
  if (from === to) return fen;
  const map = fenToMap(fen);
  const piece = map[from];
  if (!piece) return fen;
  delete map[from];
  map[to] = piece;
  return withBoard(fen, map);
}
