export const BRUSHES = ["green", "red", "yellow", "blue"] as const;
export type Brush = (typeof BRUSHES)[number];

export type MarkupArrow = {
  from: string;
  to: string;
  color: Brush;
};

export type BoardMarkup = {
  colors: Record<string, Brush>;
  circles: Record<string, Brush>;
  arrows: MarkupArrow[];
};

export type PuzzleMarkup = {
  before: BoardMarkup;
  after: BoardMarkup;
};

export type MarkupTool = "color" | "circle" | "arrow";
export type MarkupPhase = "before" | "after";

export const BRUSH_HEX: Record<Brush, string> = {
  green: "#15781B",
  red: "#882020",
  yellow: "#e68f00",
  blue: "#003088",
};

export const BRUSH_FILL: Record<Brush, string> = {
  green: "rgba(21, 120, 27, 0.55)",
  red: "rgba(136, 32, 32, 0.55)",
  yellow: "rgba(230, 143, 0, 0.5)",
  blue: "rgba(0, 48, 136, 0.45)",
};

export const BRUSH_LABEL: Record<Brush, string> = {
  green: "Zelená",
  red: "Červená",
  yellow: "Žlutá",
  blue: "Modrá",
};

const WSM = /\n?<!--wsm:([\s\S]*?)-->/;
const SQUARE = /^[a-h][1-8]$/;
const BRUSH_SET = new Set<string>(BRUSHES);

export const EMPTY_BOARD_MARKUP: BoardMarkup = {
  colors: {},
  circles: {},
  arrows: [],
};

export function emptyBoardMarkup(): BoardMarkup {
  return { colors: {}, circles: {}, arrows: [] };
}

export function emptyPuzzleMarkup(): PuzzleMarkup {
  return { before: emptyBoardMarkup(), after: emptyBoardMarkup() };
}

export function cloneBoardMarkup(markup?: BoardMarkup | null): BoardMarkup {
  const source = markup ?? emptyBoardMarkup();
  return {
    colors: { ...source.colors },
    circles: { ...source.circles },
    arrows: source.arrows.map((arrow) => ({ ...arrow })),
  };
}

export function clonePuzzleMarkup(markup?: PuzzleMarkup | null): PuzzleMarkup {
  return {
    before: cloneBoardMarkup(markup?.before),
    after: cloneBoardMarkup(markup?.after),
  };
}

export function isEmptyBoardMarkup(markup?: BoardMarkup | null): boolean {
  if (!markup) return true;
  return (
    Object.keys(markup.colors).length === 0 &&
    Object.keys(markup.circles).length === 0 &&
    markup.arrows.length === 0
  );
}

export function isEmptyPuzzleMarkup(markup?: PuzzleMarkup | null): boolean {
  if (!markup) return true;
  return isEmptyBoardMarkup(markup.before) && isEmptyBoardMarkup(markup.after);
}

export function visibleMarkup(
  markup: PuzzleMarkup | undefined,
  atEnd: boolean,
): BoardMarkup {
  const layer = atEnd ? markup?.after : markup?.before;
  return layer ?? EMPTY_BOARD_MARKUP;
}

export function toChessgroundShapes(markup?: BoardMarkup | null) {
  const shapes: { orig: string; dest?: string; brush: string }[] = [];
  if (!markup) return shapes;
  for (const [square, brush] of Object.entries(markup.circles)) {
    shapes.push({ orig: square, brush });
  }
  for (const arrow of markup.arrows) {
    shapes.push({ orig: arrow.from, dest: arrow.to, brush: arrow.color });
  }
  return shapes;
}

export function toChessboardArrows(markup?: BoardMarkup | null) {
  return (markup?.arrows ?? []).map((arrow) => ({
    startSquare: arrow.from,
    endSquare: arrow.to,
    color: BRUSH_HEX[arrow.color],
  }));
}

export function markupFillStyles(markup?: BoardMarkup | null) {
  const styles: Record<string, { backgroundColor: string }> = {};
  if (!markup) return styles;
  for (const [square, brush] of Object.entries(markup.colors)) {
    styles[square] = { backgroundColor: BRUSH_FILL[brush] };
  }
  return styles;
}

export function markupCircleColor(
  square: string,
  markup?: BoardMarkup | null,
): string | undefined {
  const brush = markup?.circles[square];
  return brush ? BRUSH_HEX[brush] : undefined;
}

function parseBrush(value: unknown): Brush | null {
  if (typeof value !== "string") return null;
  return BRUSH_SET.has(value) ? (value as Brush) : null;
}

function parseSquare(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const square = value.trim().toLowerCase();
  return SQUARE.test(square) ? square : null;
}

function parseBrushMap(raw: unknown): Record<string, Brush> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, Brush> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const square = parseSquare(key);
    const brush = parseBrush(value);
    if (!square || !brush) continue;
    out[square] = brush;
  }
  return out;
}

function parseArrows(raw: unknown): MarkupArrow[] {
  if (!Array.isArray(raw)) return [];
  const out: MarkupArrow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as {
      from?: unknown;
      to?: unknown;
      startSquare?: unknown;
      endSquare?: unknown;
      color?: unknown;
    };
    const from = parseSquare(row.from ?? row.startSquare);
    const to = parseSquare(row.to ?? row.endSquare);
    const color = parseBrush(row.color) ?? "green";
    if (!from || !to || from === to) continue;
    out.push({ from, to, color });
  }
  return out;
}

export function parseBoardMarkup(raw: unknown): BoardMarkup {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyBoardMarkup();
  }
  const row = raw as {
    colors?: unknown;
    circles?: unknown;
    arrows?: unknown;
  };
  return {
    colors: parseBrushMap(row.colors),
    circles: parseBrushMap(row.circles),
    arrows: parseArrows(row.arrows),
  };
}

export function parsePuzzleMarkup(raw: unknown): PuzzleMarkup {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyPuzzleMarkup();
  }
  const row = raw as { before?: unknown; after?: unknown };
  return {
    before: parseBoardMarkup(row.before),
    after: parseBoardMarkup(row.after),
  };
}

function serializeBoardMarkup(markup: BoardMarkup) {
  const out: Record<string, unknown> = {};
  if (Object.keys(markup.colors).length > 0) out.colors = markup.colors;
  if (Object.keys(markup.circles).length > 0) out.circles = markup.circles;
  if (markup.arrows.length > 0) out.arrows = markup.arrows;
  return out;
}

export function serializePuzzleMarkup(markup?: PuzzleMarkup | null) {
  if (!markup || isEmptyPuzzleMarkup(markup)) return {};
  const out: Record<string, unknown> = {};
  const before = serializeBoardMarkup(markup.before);
  const after = serializeBoardMarkup(markup.after);
  if (Object.keys(before).length > 0) out.before = before;
  if (Object.keys(after).length > 0) out.after = after;
  return out;
}

export function stripMarkupComment(text: string): string {
  return text.replace(WSM, "").trim();
}

export function unpackMarkupComment(raw: string | null | undefined): {
  text: string;
  markup: PuzzleMarkup;
} {
  if (!raw) return { text: "", markup: emptyPuzzleMarkup() };
  const match = raw.match(WSM);
  if (!match) return { text: raw, markup: emptyPuzzleMarkup() };
  let markup = emptyPuzzleMarkup();
  try {
    markup = parsePuzzleMarkup(JSON.parse(match[1] ?? "{}"));
  } catch {
    markup = emptyPuzzleMarkup();
  }
  return { text: raw.replace(WSM, "").trimEnd(), markup };
}

export function packMarkupComment(markup?: PuzzleMarkup | null): string {
  const payload = serializePuzzleMarkup(markup);
  if (Object.keys(payload).length === 0) return "";
  return `\n<!--wsm:${JSON.stringify(payload)}-->`;
}

export function toggleBrushOnSquare(
  map: Record<string, Brush>,
  square: string,
  brush: Brush,
): Record<string, Brush> {
  const next = { ...map };
  if (next[square] === brush) delete next[square];
  else next[square] = brush;
  return next;
}

export function upsertArrow(
  arrows: MarkupArrow[],
  from: string,
  to: string,
  color: Brush,
): MarkupArrow[] {
  const index = arrows.findIndex(
    (arrow) => arrow.from === from && arrow.to === to,
  );
  if (index === -1) return [...arrows, { from, to, color }];
  if (arrows[index].color === color) {
    return arrows.filter((_, itemIndex) => itemIndex !== index);
  }
  return arrows.map((arrow, itemIndex) =>
    itemIndex === index ? { ...arrow, color } : arrow,
  );
}

export function markupSummary(markup: BoardMarkup): string {
  const colors = Object.keys(markup.colors).length;
  const circles = Object.keys(markup.circles).length;
  const arrows = markup.arrows.length;
  if (colors + circles + arrows === 0) return "Prázdné";
  const parts: string[] = [];
  if (colors) parts.push(`${colors}× barva`);
  if (circles) parts.push(`${circles}× kroužek`);
  if (arrows) parts.push(`${arrows}× šipka`);
  return parts.join(" · ");
}
