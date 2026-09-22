import { normalizeUci, uciToSan } from "@/lib/chess";
import {
  emptyPuzzleMarkup,
  isEmptyPuzzleMarkup,
  packMarkupComment,
  parsePuzzleMarkup,
  type PuzzleMarkup,
  unpackMarkupComment,
} from "@/lib/markup";
import {
  emptyPlacement,
  packPlacementComment,
  unpackPlacementComment,
  type PuzzlePlacement,
} from "@/lib/curriculum";
import { parseSquares, sameSquares, packKindComment, unpackKindComment } from "@/lib/squares";
import type { PuzzleKind, WrongReply } from "@/lib/types";

const WSR = /\n?<!--wsr:([\s\S]*?)-->/;

export function parseWrongReplies(raw: unknown): WrongReply[] {
  if (!Array.isArray(raw)) return [];
  const replies: WrongReply[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as { answer?: unknown; uci?: unknown; text?: unknown };
    const answer = String(row.answer ?? row.uci ?? "")
      .trim()
      .toLowerCase();
    const text = String(row.text ?? "").trim();
    if (!answer || !text) continue;
    replies.push({ answer, text });
  }
  return replies;
}

export function cleanWrongReplies(replies: WrongReply[] | undefined): WrongReply[] {
  return parseWrongReplies(replies);
}

export function packExplanation(
  text: string | undefined,
  replies: WrongReply[],
  markup?: PuzzleMarkup,
  placement?: PuzzlePlacement,
  kindPack?: { kind: PuzzleKind; squares: string[] },
): string | null {
  const stripped = unpackKindComment(
    unpackPlacementComment(
      unpackMarkupComment((text ?? "").replace(WSR, "")).text,
    ).text,
  ).text.trimEnd();
  const list = cleanWrongReplies(replies);
  let body = stripped;
  if (list.length > 0) {
    body = `${body}\n<!--wsr:${JSON.stringify(list)}-->`;
  }
  body += packMarkupComment(markup);
  body += packPlacementComment(placement);
  if (kindPack) {
    body += packKindComment(kindPack.kind, kindPack.squares);
  }
  return body.trim() ? body : null;
}

export function unpackExplanation(raw: string | null | undefined): {
  explanation?: string;
  replies: WrongReply[];
  markup: PuzzleMarkup;
  placement: PuzzlePlacement;
  kind?: PuzzleKind;
  squares: string[];
} {
  if (!raw) {
    return {
      replies: [],
      markup: emptyPuzzleMarkup(),
      placement: emptyPlacement(),
      squares: [],
    };
  }
  const packedMarkup = unpackMarkupComment(raw);
  const packedPlace = unpackPlacementComment(packedMarkup.text);
  const packedKind = unpackKindComment(packedPlace.text);
  const match = packedKind.text.match(WSR);
  if (!match) {
    return {
      explanation: packedKind.text.trim() || undefined,
      replies: [],
      markup: packedMarkup.markup,
      placement: packedPlace.placement,
      kind: packedKind.kind,
      squares: packedKind.squares,
    };
  }
  let replies: WrongReply[] = [];
  try {
    replies = parseWrongReplies(JSON.parse(match[1] ?? "[]"));
  } catch {
    replies = [];
  }
  const explanation = packedKind.text.replace(WSR, "").trim() || undefined;
  return {
    explanation,
    replies,
    markup: packedMarkup.markup,
    placement: packedPlace.placement,
    kind: packedKind.kind,
    squares: packedKind.squares,
  };
}

function mergeReplies(a: WrongReply[], b: WrongReply[]): WrongReply[] {
  const seen = new Set<string>();
  const out: WrongReply[] = [];
  for (const reply of [...a, ...b]) {
    if (seen.has(reply.answer)) continue;
    seen.add(reply.answer);
    out.push(reply);
  }
  return out;
}

export function mergeWrongSources(
  column: unknown,
  explanation: string | null | undefined,
  markupColumn?: unknown,
): {
  explanation?: string;
  wrongReplies: WrongReply[];
  markup: PuzzleMarkup;
  placement: PuzzlePlacement;
  kind?: PuzzleKind;
  squares: string[];
} {
  const packed = unpackExplanation(explanation);
  const fromColumn = parsePuzzleMarkup(markupColumn);
  return {
    explanation: packed.explanation,
    wrongReplies: mergeReplies(parseWrongReplies(column), packed.replies),
    markup: isEmptyPuzzleMarkup(fromColumn) ? packed.markup : fromColumn,
    placement: packed.placement,
    kind: packed.kind,
    squares: packed.squares,
  };
}

function normalizeSan(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^[0-9]+\.+/, "")
    .replace(/[+#?!x:=-]/g, "")
    .replace(/^0-0-0$|^ooo$/i, "ooo")
    .replace(/^0-0$|^oo$/i, "oo");
}

function moveMatchesAnswer(
  uci: string,
  fen: string | undefined,
  answer: string,
): boolean {
  const played = normalizeUci(uci);
  if (played.length < 4) return false;
  const from = played.slice(0, 2);
  const dest = played.slice(2, 4);
  const key = answer.trim().toLowerCase();
  const keyUci = normalizeUci(answer);
  const keySan = normalizeSan(answer);
  const playedSan = fen ? normalizeSan(uciToSan(fen, played)) : "";

  if (keyUci === played || keyUci === played.slice(0, 4)) return true;
  if (key === dest || keyUci === dest) return true;
  if (key === `${from}${dest}` || key === `${from}-${dest}`) return true;
  if (playedSan && (keySan === playedSan || keySan === dest)) return true;
  return false;
}

export function matchWrongReply(
  replies: WrongReply[] | undefined,
  attempt: { uci?: string; squares?: string[]; fen?: string },
): string | undefined {
  const list = parseWrongReplies(replies);
  if (list.length === 0) return undefined;

  if (attempt.uci) {
    const hit = list.find((reply) =>
      moveMatchesAnswer(attempt.uci!, attempt.fen, reply.answer),
    );
    return hit?.text;
  }

  if (attempt.squares) {
    const marked = parseSquares(attempt.squares);
    const exact = list.find((reply) =>
      sameSquares(parseSquares(reply.answer), marked),
    );
    if (exact) return exact.text;

    const notes: string[] = [];
    for (const reply of list) {
      const keys = parseSquares(reply.answer);
      if (keys.length === 0) continue;
      if (keys.every((square) => marked.includes(square))) {
        notes.push(reply.text);
      }
    }
    if (notes.length > 0) return notes.join(" ");
  }

  return undefined;
}
