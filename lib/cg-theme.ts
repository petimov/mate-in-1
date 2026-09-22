import {
  getPieceSet,
  lichessPieceUrl,
  pieceUrl,
  type BoardTheme,
} from "@/lib/board-appearance";

const ROLES = [
  ["pawn", "P"],
  ["knight", "N"],
  ["bishop", "B"],
  ["rook", "R"],
  ["queen", "Q"],
  ["king", "K"],
] as const;

export function pieceSetCss(pieceId: string): string {
  const set = getPieceSet(pieceId);
  const rules: string[] = [];
  for (const [color, prefix] of [
    ["white", "w"],
    ["black", "b"],
  ] as const) {
    for (const [role, letter] of ROLES) {
      const src =
        pieceUrl(set, `${prefix}${letter}`) ??
        lichessPieceUrl("cburnett", `${prefix}${letter}`);
      rules.push(
        `.cg-board-host piece.${role}.${color}{background-image:url("${src}")}`,
      );
    }
  }
  return rules.join("");
}

export function boardSvgUrl(theme: BoardTheme): string {
  const rects: string[] = [];
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const fill = (row + col) % 2 === 0 ? theme.light : theme.dark;
      rects.push(
        `<rect x="${col}" y="${row}" width="1" height="1" fill="${fill}"/>`,
      );
    }
  }
  const grain = theme.grain
    ? `<defs><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.65 0.18" numOctaves="3" seed="6"/><feColorMatrix values="0 0 0 0 0.25  0 0 0 0 0.12  0 0 0 0 0.04  0 0 0 0.55 0"/></filter></defs>`
    : "";
  const overlay = theme.grain
    ? `<rect x="0" y="0" width="8" height="8" filter="url(#g)" opacity="0.32"/>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8">${grain}${rects.join("")}${overlay}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function applyBoardBackground(boardEl: HTMLElement, theme: BoardTheme) {
  if (theme.texture) {
    boardEl.style.backgroundImage = `url("${theme.texture}")`;
    boardEl.style.backgroundSize = "100% 100%";
    boardEl.style.backgroundPosition = "0 0";
    boardEl.style.backgroundBlendMode = "";
    return;
  }
  boardEl.style.backgroundImage = boardSvgUrl(theme);
  boardEl.style.backgroundSize = "cover";
  boardEl.style.backgroundPosition = "";
  boardEl.style.backgroundBlendMode = "";
}
