export const PRACTICE_TAGS = ["Z", "P"] as const;
export type PracticeTag = (typeof PRACTICE_TAGS)[number];

const WPT = /\n?<!--wpt:([\s\S]*?)-->/;

export function parsePracticeTags(raw: unknown): PracticeTag[] {
  if (!Array.isArray(raw)) return [];
  const out: PracticeTag[] = [];
  for (const item of raw) {
    const tag = String(item ?? "")
      .trim()
      .toUpperCase();
    if (tag === "Z" || tag === "P") {
      if (!out.includes(tag)) out.push(tag);
    }
  }
  return out;
}

export function hasPracticeMotivaceTag(tags?: PracticeTag[] | null): boolean {
  return Boolean(tags?.includes("Z") || tags?.includes("P"));
}

export function packPracticeTagsComment(tags?: PracticeTag[] | null): string {
  const list = parsePracticeTags(tags);
  if (!list.length) return "";
  return `\n<!--wpt:${JSON.stringify(list)}-->`;
}

export function unpackPracticeTagsComment(raw: string): {
  text: string;
  tags: PracticeTag[];
} {
  const match = raw.match(WPT);
  if (!match) return { text: raw, tags: [] };
  let tags: PracticeTag[] = [];
  try {
    tags = parsePracticeTags(JSON.parse(match[1] ?? "[]"));
  } catch {
    tags = [];
  }
  return { text: raw.replace(WPT, "").trimEnd(), tags };
}

export function togglePracticeTag(
  tags: PracticeTag[],
  tag: PracticeTag,
): PracticeTag[] {
  return tags.includes(tag)
    ? tags.filter((item) => item !== tag)
    : [...tags, tag];
}
