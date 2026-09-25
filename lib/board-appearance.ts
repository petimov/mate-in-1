import { createElement, type CSSProperties } from "react";
import { defaultPieces, type PieceRenderObject } from "react-chessboard";

export type BoardTheme = {
  id: string;
  name: string;
  light: string;
  dark: string;
  grain?: boolean;
  texture?: string;
  lightTexture?: string;
  darkTexture?: string;
};

export type PieceSet = {
  id: string;
  name: string;
  lichess?: string;
  folder?: string;
};

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: "babinga",
    name: "Babinga",
    light: "#f3e6c8",
    dark: "#c48d4e",
    grain: true,
    texture: "/board/babinga-check.jpg",
    lightTexture: "/board/babinga-light.png",
    darkTexture: "/board/babinga-dark.png",
  },
  { id: "green", name: "Zelená", light: "#e8edc5", dark: "#3d4f3f" },
  { id: "brown", name: "Hnědá", light: "#f0d9b5", dark: "#b58863" },
  { id: "lichess", name: "Lichess", light: "#ffffdd", dark: "#86a666" },
  { id: "blue", name: "Modrá", light: "#dee3e6", dark: "#8ca2ad" },
  { id: "navy", name: "Námořní", light: "#d9e0e6", dark: "#4b7399" },
  { id: "purple", name: "Fialová", light: "#e0d0e8", dark: "#8877a9" },
  { id: "pink", name: "Růžová", light: "#f0d0dd", dark: "#b8879d" },
  { id: "gray", name: "Šedá", light: "#e8e8e8", dark: "#8a8a8a" },
  { id: "olive", name: "Olivová", light: "#d8d8a0", dark: "#6a8f4e" },
  { id: "ic", name: "Ledová", light: "#cfd8dc", dark: "#607d8b" },
];

export const PIECE_SETS: PieceSet[] = [
  { id: "cburnett", name: "Lichess", lichess: "cburnett" },
  { id: "classic", name: "Classic" },
  { id: "fritz", name: "Fritz", folder: "/pieces/fritz" },
  { id: "merida", name: "Merida", lichess: "merida" },
  { id: "alpha", name: "Alpha", lichess: "alpha" },
  { id: "cardinal", name: "Cardinal", lichess: "cardinal" },
  { id: "chessnut", name: "Chessnut", lichess: "chessnut" },
  { id: "companion", name: "Companion", lichess: "companion" },
  { id: "fantasy", name: "Fantasy", lichess: "fantasy" },
  { id: "gioco", name: "Gioco", lichess: "gioco" },
  { id: "horsey", name: "Horsey", lichess: "horsey" },
  { id: "maestro", name: "Maestro", lichess: "maestro" },
  { id: "staunty", name: "Staunty", lichess: "staunty" },
  { id: "shapes", name: "Shapes", lichess: "shapes" },
  { id: "pixel", name: "Pixel", lichess: "pixel" },
  { id: "tatiana", name: "Tatiana", lichess: "tatiana" },
];

export const DEFAULT_BOARD_ID = "babinga";
export const DEFAULT_PIECE_ID = "cburnett";
export const BOARD_THEME_KEY = "mate-board-theme-v2";
export const PIECE_SET_KEY = "mate-piece-set-v3";

const PIECE_KEYS = [
  "wP",
  "wN",
  "wB",
  "wR",
  "wQ",
  "wK",
  "bP",
  "bN",
  "bB",
  "bR",
  "bQ",
  "bK",
] as const;

const pieceCache = new Map<string, PieceRenderObject>();

export function isBoardThemeId(id: string): boolean {
  return BOARD_THEMES.some((theme) => theme.id === id);
}

export function isPieceSetId(id: string): boolean {
  return PIECE_SETS.some((set) => set.id === id);
}

export function getBoardTheme(id: string): BoardTheme {
  return BOARD_THEMES.find((theme) => theme.id === id) ?? BOARD_THEMES[0];
}

export function getPieceSet(id: string): PieceSet {
  return PIECE_SETS.find((set) => set.id === id) ?? PIECE_SETS[0];
}

export function pieceUrl(set: PieceSet, piece: string): string | null {
  if (set.folder) return `${set.folder}/${piece}.svg?v=3`;
  if (set.lichess) return lichessPieceUrl(set.lichess, piece);
  return null;
}

export function piecePreviewUrl(set: PieceSet): string | null {
  return pieceUrl(set, "wN");
}

export function lichessPieceUrl(set: string, piece: string): string {
  return `https://cdn.jsdelivr.net/gh/lichess-org/lila@master/public/piece/${set}/${piece}.svg`;
}

export function woodGrainUrl(hex: string, seed: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><defs><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.035 0.8" numOctaves="3" seed="${seed}"/><feColorMatrix values="0 0 0 0 0.18  0 0 0 0 0.1  0 0 0 0 0.04  0 0 0 0.42 0"/></filter></defs><rect width="64" height="64" fill="${hex}"/><rect width="64" height="64" filter="url(#g)"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function squareCss(
  theme: BoardTheme,
  kind: "light" | "dark",
): CSSProperties {
  const color = kind === "light" ? theme.light : theme.dark;
  const tile =
    kind === "light" ? theme.lightTexture : theme.darkTexture;
  if (tile) {
    return {
      backgroundColor: color,
      backgroundImage: `url(${tile})`,
      backgroundSize: "cover",
    };
  }
  if (!theme.grain) return { backgroundColor: color };
  return {
    backgroundColor: color,
    backgroundImage: woodGrainUrl(color, kind === "dark" ? 4 : 11),
    backgroundSize: "cover",
  };
}

export function woodSquareCss(
  theme: BoardTheme,
  square: string,
): CSSProperties | null {
  if ((!theme.lightTexture && !theme.texture) || square.length < 2) return null;
  const col = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  if (col < 0 || col > 7 || rank < 1 || rank > 8) return null;
  const row = 8 - rank;
  const dark = (col + row) % 2 === 1;
  const tile = dark ? theme.darkTexture : theme.lightTexture;
  if (tile) {
    return {
      backgroundColor: dark ? theme.dark : theme.light,
      backgroundImage: `url(${tile})`,
      backgroundSize: "cover",
    };
  }
  return squareCss(theme, dark ? "dark" : "light");
}

export function woodBoardSquareStyles(
  theme: BoardTheme,
): Record<string, CSSProperties> {
  if (!theme.lightTexture && !theme.texture) return {};
  const styles: Record<string, CSSProperties> = {};
  for (const file of "abcdefgh") {
    for (let rank = 1; rank <= 8; rank += 1) {
      const square = `${file}${rank}`;
      const next = woodSquareCss(theme, square);
      if (next) styles[square] = next;
    }
  }
  return styles;
}

export function mergeSquareStyles(
  theme: BoardTheme,
  extra: Record<string, CSSProperties> = {},
): Record<string, CSSProperties> {
  const base = woodBoardSquareStyles(theme);
  const next: Record<string, CSSProperties> = { ...base };
  for (const [square, style] of Object.entries(extra)) {
    next[square] = { ...base[square], ...style };
  }
  return next;
}

export function boardSquareStyles(theme: BoardTheme) {
  return {
    darkSquareStyle: squareCss(theme, "dark"),
    lightSquareStyle: squareCss(theme, "light"),
    dropSquareStyle: { boxShadow: "none", outline: "none", border: "none" },
    squareStyle: { outline: "none", boxShadow: "none", border: "none" },
    showNotation: false,
    darkSquareNotationStyle: { color: "#f3e4c4" },
    lightSquareNotationStyle: { color: "#5c3a1e" },
    alphaNotationStyle: {
      fontSize: "11px",
      fontWeight: 600,
      position: "absolute" as const,
      bottom: 1,
      left: 3,
      right: "auto",
      userSelect: "none" as const,
    },
    numericNotationStyle: {
      fontSize: "11px",
      fontWeight: 600,
      position: "absolute" as const,
      top: 2,
      left: 3,
      userSelect: "none" as const,
    },
  };
}

export function getPieceRenderers(id: string): PieceRenderObject {
  const cached = pieceCache.get(id);
  if (cached) return cached;

  const set = getPieceSet(id);
  const pieces = Object.fromEntries(
    PIECE_KEYS.map((key) => {
      const src = pieceUrl(set, key);
      if (!src) {
        return [key, defaultPieces[key]];
      }
      return [
        key,
        ({ svgStyle }: { svgStyle?: CSSProperties } = {}) =>
          createElement("img", {
            src,
            alt: "",
            draggable: false,
            style: {
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              ...svgStyle,
            },
          }),
      ];
    }),
  ) as PieceRenderObject;

  pieceCache.set(id, pieces);
  return pieces;
}
