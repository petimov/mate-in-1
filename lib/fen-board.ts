const GLYPH: Record<string, string> = {
  K: "♔",
  Q: "♕",
  R: "♖",
  B: "♗",
  N: "♘",
  P: "♙",
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};

export type FenSquare = {
  square: string;
  file: number;
  rank: number;
  light: boolean;
  glyph: string;
};

export function fenSquares(fen: string): FenSquare[] {
  const placement = fen.trim().split(/\s+/)[0] ?? "";
  const ranks = placement.split("/");
  const squares: FenSquare[] = [];

  for (let rankIndex = 0; rankIndex < 8; rankIndex += 1) {
    const rank = 8 - rankIndex;
    const row = ranks[rankIndex] ?? "";
    let file = 0;
    for (const char of row) {
      if (file >= 8) break;
      if (/[1-8]/.test(char)) {
        const empty = Number(char);
        for (let i = 0; i < empty && file < 8; i += 1) {
          squares.push(makeSquare(file, rank, ""));
          file += 1;
        }
      } else {
        squares.push(makeSquare(file, rank, GLYPH[char] ?? ""));
        file += 1;
      }
    }
    while (file < 8) {
      squares.push(makeSquare(file, rank, ""));
      file += 1;
    }
  }

  return squares;
}

function makeSquare(file: number, rank: number, glyph: string): FenSquare {
  return {
    square: `${"abcdefgh"[file]}${rank}`,
    file,
    rank,
    light: (file + rank) % 2 === 1,
    glyph,
  };
}
