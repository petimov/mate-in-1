const SQUARE = /^[a-h][1-8]$/;

export function normalizeSquare(value: string): string {
  return value.trim().toLowerCase();
}

export function parseSquares(input: string | string[] | undefined): string[] {
  const raw = Array.isArray(input)
    ? input
    : (input ?? "").split(/[\s,;]+/);
  const unique = new Set<string>();
  for (const item of raw) {
    const square = normalizeSquare(item);
    if (SQUARE.test(square)) unique.add(square);
  }
  return [...unique];
}

export function sameSquares(a: string[], b: string[]): boolean {
  const left = parseSquares(a);
  const right = parseSquares(b);
  if (left.length !== right.length) return false;
  const set = new Set(left);
  return right.every((square) => set.has(square));
}

const WSK = /\n?<!--wsk:([\s\S]*?)-->/;

export type PackedKind = {
  kind: "move" | "squares";
  squares: string[];
};

export function unpackKindComment(raw: string): {
  text: string;
  kind?: "move" | "squares";
  squares: string[];
} {
  const match = raw.match(WSK);
  if (!match) return { text: raw, squares: [] };
  let kind: "move" | "squares" | undefined;
  let squares: string[] = [];
  try {
    const parsed = JSON.parse(match[1] ?? "{}") as {
      k?: unknown;
      s?: unknown;
      kind?: unknown;
      squares?: unknown;
    };
    const k = String(parsed.k ?? parsed.kind ?? "");
    if (k === "squares" || k === "move") kind = k;
    const rawSquares = parsed.s ?? parsed.squares;
    squares = parseSquares(
      Array.isArray(rawSquares)
        ? rawSquares.map((item) => String(item))
        : typeof rawSquares === "string"
          ? rawSquares
          : undefined,
    );
  } catch {
    squares = [];
  }
  return { text: raw.replace(WSK, "").trimEnd(), kind, squares };
}

export function packKindComment(
  kind: "move" | "squares",
  squares: string[],
): string {
  const list = parseSquares(squares);
  if (kind !== "squares" && list.length === 0) return "";
  return `\n<!--wsk:${JSON.stringify({ k: kind, s: list })}-->`;
}
