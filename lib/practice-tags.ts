/** Motivace tags Z/P — alias nad PuzzleParams.role. */

import {
  hasMotivaceRole,
  packParamsComment,
  paramsToMotivaceTags,
  parsePuzzleParams,
  unpackParamsComment,
  type PuzzleParams,
} from "@/lib/puzzle-params";

export const PRACTICE_TAGS = ["Z", "P"] as const;
export type PracticeTag = (typeof PRACTICE_TAGS)[number];

export function parsePracticeTags(raw: unknown): PracticeTag[] {
  if (Array.isArray(raw)) {
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
  return paramsToMotivaceTags(parsePuzzleParams(raw));
}

export function hasPracticeMotivaceTag(
  tags?: PracticeTag[] | PuzzleParams | null,
): boolean {
  if (!tags) return false;
  if (Array.isArray(tags)) {
    return tags.includes("Z") || tags.includes("P");
  }
  return hasMotivaceRole(tags);
}

/** Legacy: pack only Z/P tags into wpt comment. Prefer packParamsComment. */
export function packPracticeTagsComment(tags?: PracticeTag[] | null): string {
  return packParamsComment(paramsFromTags(tags));
}

export function unpackPracticeTagsComment(raw: string): {
  text: string;
  tags: PracticeTag[];
} {
  const packed = unpackParamsComment(raw);
  return { text: packed.text, tags: paramsToMotivaceTags(packed.params) };
}

export function togglePracticeTag(
  tags: PracticeTag[],
  tag: PracticeTag,
): PracticeTag[] {
  return tags.includes(tag)
    ? tags.filter((item) => item !== tag)
    : [...tags, tag];
}

export function tagsFromParams(params?: PuzzleParams | null): PracticeTag[] {
  return paramsToMotivaceTags(params);
}

export function paramsFromTags(tags?: PracticeTag[] | null): PuzzleParams {
  const list = parsePracticeTags(tags);
  if (list.includes("Z")) return { role: "Z" };
  if (list.includes("P")) return { role: "P" };
  return {};
}
