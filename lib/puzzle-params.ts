/** Excel parametry A–T pro jednotažky (cvicení). */

import { applyUci, normalizeUci, safeChess } from "@/lib/chess";
import type { Square } from "chess.js";

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

/** F: V = matová figura vedle krále, D = dál. */
export const PARAM_DISTANCES = ["V", "D"] as const;
export type ParamDistance = (typeof PARAM_DISTANCES)[number];

export const PARAM_DISTANCE_LABEL: Record<ParamDistance, string> = {
  V: "vedle krále",
  D: "dál",
};

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

/** Průchod autora: 0 = program, 1+ = lidské kontroly. */
export type AuthorQaTrack = {
  passes: number;
  /** Úmyslné prázdno (zkontrolováno — nic tam nemá být). */
  none?: boolean;
  /** Finální — při kontrole přeskočit. */
  done?: boolean;
};

export type AuthorQa = {
  flags?: AuthorQaTrack;
  wrong?: AuthorQaTrack;
};

export type PuzzleParams = {
  piece?: ParamPiece;
  color?: ParamColor;
  king?: ParamKing;
  role?: ParamRole;
  mode?: ParamMode;
  distance?: ParamDistance;
  flags?: Partial<Record<ParamFlagKey, boolean>>;
  /** Kontrola autora: flagy + ŠT. */
  qa?: AuthorQa;
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

export function parseAuthorQaTrack(raw: unknown): AuthorQaTrack | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const row = raw as Record<string, unknown>;
  const hasPasses = "passes" in row;
  const passes = Math.max(0, Math.floor(Number(row.passes) || 0));
  const none = row.none === true ? true : undefined;
  const done = row.done === true ? true : undefined;
  if (!hasPasses && !none && !done) return undefined;
  const out: AuthorQaTrack = { passes };
  if (none) out.none = true;
  if (done) out.done = true;
  return out;
}

export function parseAuthorQa(raw: unknown): AuthorQa | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const row = raw as Record<string, unknown>;
  const flags = parseAuthorQaTrack(row.flags);
  const wrong = parseAuthorQaTrack(row.wrong);
  if (!flags && !wrong) return undefined;
  const out: AuthorQa = {};
  if (flags) out.flags = flags;
  if (wrong) out.wrong = wrong;
  return out;
}

export function patchAuthorQa(
  qa: AuthorQa | undefined,
  track: "flags" | "wrong",
  next: AuthorQaTrack | undefined,
): AuthorQa | undefined {
  const out: AuthorQa = { ...(qa ?? {}) };
  if (!next) delete out[track];
  else out[track] = next;
  if (!out.flags && !out.wrong) return undefined;
  return out;
}

/** Nižší = dřív v kontrole. Hotovo až nakonec. */
export function authorQaTrackScore(
  track: AuthorQaTrack | undefined,
  hasContent: boolean,
): number {
  const passes = track?.passes ?? 0;
  if (track?.done) return 10_000 + passes;
  if (track?.none) return 5_000 + passes;
  if (!hasContent) return passes;
  if (passes === 0) return 100;
  return 1_000 + passes;
}

export function authorQaSortScore(input: {
  params?: PuzzleParams | null;
  wrongCount?: number;
}): number {
  const qa = input.params?.qa;
  const hasFlags = Boolean(
    input.params?.flags && Object.values(input.params.flags).some(Boolean),
  );
  const hasWrong = (input.wrongCount ?? 0) > 0;
  return Math.min(
    authorQaTrackScore(qa?.flags, hasFlags),
    authorQaTrackScore(qa?.wrong, hasWrong),
  );
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
  const qa = parseAuthorQa(row.qa);
  if (piece) params.piece = piece;
  if (color) params.color = color;
  if (king) params.king = king;
  if (role) params.role = role;
  if (mode) params.mode = mode;
  if (distance) params.distance = distance;
  if (flags) params.flags = flags;
  if (qa) params.qa = qa;
  return params;
}

export function isEmptyParams(params?: PuzzleParams | null): boolean {
  if (!params) return true;
  if (params.piece || params.color || params.king || params.role || params.mode || params.distance) {
    return false;
  }
  if (params.flags && Object.values(params.flags).some(Boolean)) return false;
  return !params.qa;
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
  // QA se neslučuje z bulk kapitoly — zůstává z base, pokud patch nemá.
  if (b.qa) out.qa = b.qa;
  else if (a.qa) out.qa = a.qa;
  else delete out.qa;
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
  key:
    | keyof PuzzleParams
    | ParamFlagKey
    | "sort"
    | "title"
    | "q"
    | "r"
    | "s"
    | "t"
    | "qa"
    | "qaFlags"
    | "qaWrong",
  puzzle?: {
    sort?: number;
    title?: string;
    fen?: string;
    wrongCount?: number;
    arrowPieces?: number;
    difficulty?: number;
  },
): string | number {
  if (key === "sort") return puzzle?.sort ?? 0;
  if (key === "title") return (puzzle?.title ?? "").toLowerCase();
  if (key === "q") return puzzle?.fen ? countPiecesOnFen(puzzle.fen) : 0;
  if (key === "r") return puzzle?.arrowPieces ?? 0;
  if (key === "s") return puzzle?.wrongCount ?? 0;
  if (key === "t") return puzzle?.difficulty ?? 0;
  if (key === "qa") {
    return authorQaSortScore({
      params,
      wrongCount: puzzle?.wrongCount,
    });
  }
  if (key === "qaFlags") {
    const hasFlags = Boolean(
      params?.flags && Object.values(params.flags).some(Boolean),
    );
    return authorQaTrackScore(params?.qa?.flags, hasFlags);
  }
  if (key === "qaWrong") {
    return authorQaTrackScore(
      params?.qa?.wrong,
      (puzzle?.wrongCount ?? 0) > 0,
    );
  }
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

export function chebyshevDistance(a: string, b: string): number {
  if (a.length < 2 || b.length < 2) return Number.POSITIVE_INFINITY;
  return Math.max(
    Math.abs(a.charCodeAt(0) - b.charCodeAt(0)),
    Math.abs(Number(a[1]) - Number(b[1])),
  );
}

/**
 * V/D z matu: po řešení min Chebyshev vzdálenost šachující figury k soupeřovu králi.
 * 1 → V (vedle), >1 → D (dál).
 */
export function inferDistance(
  fen: string,
  solutionUci?: string | null,
): ParamDistance | undefined {
  const uci = normalizeUci(solutionUci ?? "");
  if (!fen.trim() || uci.length < 4) return undefined;
  const chess = safeChess(fen);
  if (!chess || !applyUci(chess, uci)) return undefined;

  const defender = chess.turn();
  const attacker = defender === "w" ? "b" : "w";
  let kingSq: Square | null = null;
  const board = chess.board();
  for (let rank = 0; rank < 8; rank += 1) {
    for (let file = 0; file < 8; file += 1) {
      const piece = board[rank]?.[file];
      if (piece?.type === "k" && piece.color === defender) {
        kingSq = `${"abcdefgh"[file]}${8 - rank}` as Square;
      }
    }
  }
  if (!kingSq) return undefined;

  const checkers = chess.attackers(kingSq, attacker);
  const squares = checkers.length > 0 ? checkers : [uci.slice(2, 4) as Square];
  let min = Number.POSITIVE_INFINITY;
  for (const sq of squares) {
    min = Math.min(min, chebyshevDistance(sq, kingSq));
  }
  if (!Number.isFinite(min) || min <= 0) return undefined;
  return min === 1 ? "V" : "D";
}

/** Doplní distance, pokud chybí. */
export function withInferredDistance(
  params: PuzzleParams | undefined,
  fen: string,
  solutionUci?: string | null,
): PuzzleParams {
  const base = parsePuzzleParams(params ?? {});
  if (base.distance) return base;
  const distance = inferDistance(fen, solutionUci);
  if (!distance) return base;
  return { ...base, distance };
}

/**
 * Petra: T = (1+0,1*(q-3)) * (1+0,25*s) * r * (1+f)
 * f = počet aktivních flagů. Bez šipek je r=0 → T=0 (dokud není markup).
 */
export const DEFAULT_DIFFICULTY_FORMULA =
  "(1 + 0.1*(q - 3)) * (1 + 0.25*s) * r * (1 + f)";

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
  const flags = input.flags ?? {};
  const u = flags.U ? 1 : 0;
  const b = flags.B ? 1 : 0;
  const p = flags.P ? 1 : 0;
  const z = flags.Z ? 1 : 0;
  const v = flags.V ? 1 : 0;
  const o = flags.O ? 1 : 0;
  const l = flags.L ? 1 : 0;
  const ch = flags.CH ? 1 : 0;
  return {
    q: countPiecesOnFen(input.fen),
    r: input.arrowPieces,
    s: input.wrongCount,
    u,
    b,
    p,
    z,
    v,
    o,
    l,
    ch,
    /** Součet flagů — pro (1+f). */
    f: u + b + p + z + v + o + l + ch,
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
  | "t"
  | "qa"
  | "qaFlags"
  | "qaWrong";

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
