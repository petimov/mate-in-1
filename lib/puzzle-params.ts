/** Excel parametry A–T pro jednotažky (cvicení). */

export const PARAM_PIECES = ["V", "D", "S", "J", "P", "K"] as const;
export type ParamPiece = (typeof PARAM_PIECES)[number];

export const PARAM_COLORS = ["B", "C"] as const;
export type ParamColor = (typeof PARAM_COLORS)[number];

export const PARAM_KINGS = ["8", "1", "ah", "o", "u"] as const;
export type ParamKing = (typeof PARAM_KINGS)[number];

/** D: V=výklad, Z=procvičení, P=poctivě vybrané, D=další */
export const PARAM_ROLES = ["V", "Z", "P", "D"] as const;
export type ParamRole = (typeof PARAM_ROLES)[number];

/** E: T=tahy, P=políčka, S=šipky */
export const PARAM_MODES = ["T", "P", "S"] as const;
export type ParamMode = (typeof PARAM_MODES)[number];

export const PARAM_DISTANCES = ["V", "D"] as const;
export type ParamDistance = (typeof PARAM_DISTANCES)[number];

export const PARAM_FLAG_KEYS = [
  "U",
  "B",
  "P",
  "Z",
  "V",
  "O",
  "L",
  "CH",
] as const;
export type ParamFlagKey = (typeof PARAM_FLAG_KEYS)[number];

export type PuzzleParams = {
  piece?: ParamPiece;
  color?: ParamColor;
  king?: ParamKing;
  role?: ParamRole;
  mode?: ParamMode;
  distance?: ParamDistance;
  flags?: Partial<Record<ParamFlagKey, boolean>>;
};

export const PARAM_PIECE_LABEL: Record<ParamPiece, string> = {
  V: "Věž",
  D: "Dáma",
  S: "Střelec",
  J: "Jezdec",
  P: "Pěšec",
  K: "Král",
};

export const PARAM_ROLE_LABEL: Record<ParamRole, string> = {
  V: "výklad",
  Z: "procvičení",
  P: "poctivě vybrané",
  D: "další",
};

export const PARAM_MODE_LABEL: Record<ParamMode, string> = {
  T: "tahy",
  P: "políčka",
  S: "šipky",
};

export const PARAM_FLAG_LABEL: Record<ParamFlagKey, string> = {
  U: "útěky krále",
  B: "braní jinou figurou",
  P: "představení",
  Z: "zakrytí",
  V: "vazba",
  O: "odtah",
  L: "vypadá jako odtah",
  CH: "proměna",
};

export const PARAM_KING_LABEL: Record<ParamKing, string> = {
  "8": "8. řada",
  "1": "1. řada",
  ah: "a/h",
  o: "opačný kraj",
  u: "uprostřed",
};

const WPT = /\n?<!--wpt:([\s\S]*?)-->/;

function asPiece(raw: unknown): ParamPiece | undefined {
  const v = String(raw ?? "").trim().toUpperCase();
  return (PARAM_PIECES as readonly string[]).includes(v)
    ? (v as ParamPiece)
    : undefined;
}

function asColor(raw: unknown): ParamColor | undefined {
  const v = String(raw ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (v === "B") return "B";
  if (v === "C") return "C"; // Č → C after NFD strip
  return undefined;
}

function asKing(raw: unknown): ParamKing | undefined {
  const v = String(raw ?? "").trim().toLowerCase();
  return (PARAM_KINGS as readonly string[]).includes(v)
    ? (v as ParamKing)
    : undefined;
}

function asRole(raw: unknown): ParamRole | undefined {
  const v = String(raw ?? "").trim().toUpperCase();
  return (PARAM_ROLES as readonly string[]).includes(v)
    ? (v as ParamRole)
    : undefined;
}

function asMode(raw: unknown): ParamMode | undefined {
  const v = String(raw ?? "").trim().toUpperCase();
  if (v === "S" || v === "Š") return "S";
  return (PARAM_MODES as readonly string[]).includes(v)
    ? (v as ParamMode)
    : undefined;
}

function asDistance(raw: unknown): ParamDistance | undefined {
  const v = String(raw ?? "").trim().toUpperCase();
  return (PARAM_DISTANCES as readonly string[]).includes(v)
    ? (v as ParamDistance)
    : undefined;
}

function parseFlags(raw: unknown): PuzzleParams["flags"] {
  if (!raw || typeof raw !== "object") return undefined;
  const out: NonNullable<PuzzleParams["flags"]> = {};
  let any = false;
  for (const key of PARAM_FLAG_KEYS) {
    if ((raw as Record<string, unknown>)[key] === true) {
      out[key] = true;
      any = true;
    }
  }
  return any ? out : undefined;
}

/** Normalize unknown JSON / partial into PuzzleParams. */
export function parsePuzzleParams(raw: unknown): PuzzleParams {
  if (Array.isArray(raw)) {
    // Legacy tags: ["Z","P"] → role (prefer Z if both)
    const roles = raw
      .map((item) => asRole(item))
      .filter((item): item is ParamRole => Boolean(item));
    const motivace = roles.find((r) => r === "Z" || r === "P");
    return motivace ? { role: motivace } : {};
  }
  if (!raw || typeof raw !== "object") return {};
  const row = raw as Record<string, unknown>;
  const params: PuzzleParams = {};
  const piece = asPiece(row.piece);
  const color = asColor(row.color);
  const king = asKing(row.king);
  const role = asRole(row.role);
  const mode = asMode(row.mode);
  const distance = asDistance(row.distance);
  const flags = parseFlags(row.flags);
  if (piece) params.piece = piece;
  if (color) params.color = color;
  if (king) params.king = king;
  if (role) params.role = role;
  if (mode) params.mode = mode;
  if (distance) params.distance = distance;
  if (flags) params.flags = flags;
  return params;
}

export function isEmptyParams(params?: PuzzleParams | null): boolean {
  if (!params) return true;
  if (params.piece || params.color || params.king || params.role || params.mode || params.distance) {
    return false;
  }
  return !params.flags || !Object.values(params.flags).some(Boolean);
}

export function mergeParams(
  base?: PuzzleParams | null,
  patch?: PuzzleParams | null,
): PuzzleParams {
  const a = parsePuzzleParams(base ?? {});
  const b = parsePuzzleParams(patch ?? {});
  const flags = { ...a.flags, ...b.flags };
  const cleanedFlags = parseFlags(flags);
  const out: PuzzleParams = {
    ...a,
    ...b,
  };
  if (cleanedFlags) out.flags = cleanedFlags;
  else delete out.flags;
  return out;
}

export function paramsToMotivaceTags(params?: PuzzleParams | null): ("Z" | "P")[] {
  const role = params?.role;
  if (role === "Z" || role === "P") return [role];
  return [];
}

export function hasMotivaceRole(params?: PuzzleParams | null): boolean {
  return params?.role === "Z" || params?.role === "P";
}

export function packParamsComment(params?: PuzzleParams | null): string {
  const clean = parsePuzzleParams(params ?? {});
  if (isEmptyParams(clean)) return "";
  return `\n<!--wpt:${JSON.stringify(clean)}-->`;
}

export function unpackParamsComment(raw: string): {
  text: string;
  params: PuzzleParams;
} {
  const match = raw.match(WPT);
  if (!match) return { text: raw, params: {} };
  let params: PuzzleParams = {};
  try {
    params = parsePuzzleParams(JSON.parse(match[1] ?? "{}"));
  } catch {
    params = {};
  }
  return { text: raw.replace(WPT, "").trimEnd(), params };
}

export function modeFromPuzzleKind(
  kind: "move" | "squares",
  current?: ParamMode,
): ParamMode {
  if (current === "S") return "S";
  return kind === "squares" ? "P" : "T";
}

export function puzzleKindFromMode(mode?: ParamMode): "move" | "squares" {
  return mode === "P" ? "squares" : "move";
}

/** Compact badge string for tree row: e.g. "V B 8 Z T". */
export function paramsBadge(params?: PuzzleParams | null): string {
  if (!params || isEmptyParams(params)) return "";
  const parts = [
    params.piece,
    params.color === "C" ? "Č" : params.color,
    params.king,
    params.role,
    params.mode,
    params.distance,
  ].filter(Boolean);
  return parts.join(" ");
}

/** Sort key helpers for admin list. */
export function paramSortValue(
  params: PuzzleParams | undefined,
  key: keyof PuzzleParams | ParamFlagKey | "sort" | "title" | "q" | "r" | "s" | "t",
  puzzle?: { sort?: number; title?: string; fen?: string; wrongCount?: number; arrowPieces?: number; difficulty?: number },
): string | number {
  if (key === "sort") return puzzle?.sort ?? 0;
  if (key === "title") return (puzzle?.title ?? "").toLowerCase();
  if (key === "q") return puzzle?.fen ? countPiecesOnFen(puzzle.fen) : 0;
  if (key === "r") return puzzle?.arrowPieces ?? 0;
  if (key === "s") return puzzle?.wrongCount ?? 0;
  if (key === "t") return puzzle?.difficulty ?? 0;
  if (
    key === "U" ||
    key === "B" ||
    key === "P" ||
    key === "Z" ||
    key === "V" ||
    key === "O" ||
    key === "L" ||
    key === "CH"
  ) {
    return params?.flags?.[key] ? 1 : 0;
  }
  const value = params?.[key as keyof PuzzleParams];
  if (typeof value === "string") return value;
  return "";
}

export function countPiecesOnFen(fen: string): number {
  const board = fen.trim().split(/\s+/)[0] ?? "";
  let n = 0;
  for (const ch of board) {
    if (/[prnbqkPRNBQK]/.test(ch)) n += 1;
  }
  return n;
}

/** Default difficulty formula placeholders: q,r,s,u,b,p,z,v,o,l,ch */
export const DEFAULT_DIFFICULTY_FORMULA =
  "q + r*2 + s*3 + u*2 + b*2 + p*2 + z*2 + v + o + l + ch*2";

export function evalDifficultyFormula(
  formula: string,
  vars: Record<string, number>,
): number {
  const src = formula.trim().toLowerCase() || DEFAULT_DIFFICULTY_FORMULA;
  // Only allow numbers, vars, + - * / ( ) .
  if (!/^[\d\s+\-*/().a-z_]+$/i.test(src)) return 0;
  let expr = src;
  const keys = Object.keys(vars).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    expr = expr.replace(new RegExp(`\\b${key}\\b`, "gi"), String(vars[key] ?? 0));
  }
  if (/[a-z_]/i.test(expr)) return 0;
  try {
    // eslint-disable-next-line no-new-func
    const value = Function(`"use strict"; return (${expr});`)();
    return typeof value === "number" && Number.isFinite(value)
      ? Math.round(value * 100) / 100
      : 0;
  } catch {
    return 0;
  }
}

export function difficultyVars(input: {
  fen: string;
  arrowPieces: number;
  wrongCount: number;
  flags?: PuzzleParams["flags"];
}): Record<string, number> {
  const f = input.flags ?? {};
  return {
    q: countPiecesOnFen(input.fen),
    r: input.arrowPieces,
    s: input.wrongCount,
    u: f.U ? 1 : 0,
    b: f.B ? 1 : 0,
    p: f.P ? 1 : 0,
    z: f.Z ? 1 : 0,
    v: f.V ? 1 : 0,
    o: f.O ? 1 : 0,
    l: f.L ? 1 : 0,
    ch: f.CH ? 1 : 0,
  };
}

export function countArrowPieces(markup: {
  after?: { arrows?: unknown };
} | null | undefined): number {
  const arrows = Array.isArray(markup?.after?.arrows)
    ? markup.after.arrows
    : [];
  const from = new Set<string>();
  for (const arrow of arrows) {
    if (Array.isArray(arrow) && typeof arrow[0] === "string") {
      from.add(arrow[0]);
      continue;
    }
    if (
      arrow &&
      typeof arrow === "object" &&
      "from" in arrow &&
      typeof (arrow as { from: unknown }).from === "string"
    ) {
      from.add((arrow as { from: string }).from);
    }
  }
  return from.size;
}

export type PuzzleSortKey =
  | "sort"
  | "title"
  | "piece"
  | "color"
  | "king"
  | "role"
  | "mode"
  | "distance"
  | "U"
  | "B"
  | "P"
  | "Z"
  | "V"
  | "O"
  | "L"
  | "CH"
  | "q"
  | "r"
  | "s"
  | "t";

export function sortPuzzlesByKey<
  T extends {
    id?: string;
    title: string;
    fen: string;
    sort?: number;
    params?: PuzzleParams;
    wrongReplies?: { answer: string }[];
    markup?: { after?: { arrows?: unknown } } | null;
  },
>(list: T[], key: string, formula = DEFAULT_DIFFICULTY_FORMULA): T[] {
  const sortKey = key as PuzzleSortKey;
  return [...list].sort((a, b) => {
    const aWrong = a.wrongReplies?.length ?? 0;
    const bWrong = b.wrongReplies?.length ?? 0;
    const aR = countArrowPieces(a.markup);
    const bR = countArrowPieces(b.markup);
    const aT = evalDifficultyFormula(
      formula,
      difficultyVars({
        fen: a.fen,
        arrowPieces: aR,
        wrongCount: aWrong,
        flags: a.params?.flags,
      }),
    );
    const bT = evalDifficultyFormula(
      formula,
      difficultyVars({
        fen: b.fen,
        arrowPieces: bR,
        wrongCount: bWrong,
        flags: b.params?.flags,
      }),
    );
    const av = paramSortValue(a.params, sortKey, {
      sort: a.sort,
      title: a.title,
      fen: a.fen,
      wrongCount: aWrong,
      arrowPieces: aR,
      difficulty: aT,
    });
    const bv = paramSortValue(b.params, sortKey, {
      sort: b.sort,
      title: b.title,
      fen: b.fen,
      wrongCount: bWrong,
      arrowPieces: bR,
      difficulty: bT,
    });
    if (typeof av === "number" && typeof bv === "number") return av - bv;
    return String(av).localeCompare(String(bv), "cs");
  });
}
