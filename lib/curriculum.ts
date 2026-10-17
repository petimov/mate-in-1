import { serializePuzzleMarkup } from "@/lib/markup";
import {
  isEmptyParams,
  parsePuzzleParams,
  type PuzzleParams,
} from "@/lib/puzzle-params";
import type { Puzzle } from "@/lib/types";

export type CurriculumCourse = {
  id: string;
  slug: string;
  title: string;
  sort: number;
};

/** C = cvičení (jednotažka), V = výklad, F = vzít figuru, M = možné tahy. */
export const CHAPTER_KINDS = [
  "jednotazka",
  "vyklad",
  "vzit_figuru",
  "mozne_tahy",
] as const;
export type ChapterKind = (typeof CHAPTER_KINDS)[number];
export type ChapterSide = "white" | "black";

export const VYKLAD_MAX_MOVES = 10;

export type Chapter = {
  id: string;
  courseId: string;
  parentId: string | null;
  slug: string;
  title: string;
  sort: number;
  kind?: ChapterKind;
  side?: ChapterSide;
  /** Default Excel params for new/imported puzzles in this chapter. */
  params?: PuzzleParams;
};

export type Curriculum = {
  courses: CurriculumCourse[];
  chapters: Chapter[];
};

export type PuzzlePlacement = {
  chapterId: string | null;
  sort: number;
};

const WSH = /\n?<!--wsh:([\s\S]*?)-->/;

export const COURSE_SKOLA = "course-skola";
export const CH_MAT = "ch-mat-v-1";
export const CH_FIGURY = "ch-tahy-figur";
export const CH_SACH = "ch-sach-a-kryti";
export const CH_MAT_VEZI = "ch-mat-vezi";
export const CH_MAT_VEZI_1 = "ch-mat-vezi-1";
export const CH_MAT_VEZI_2 = "ch-mat-vezi-2";
export const CH_MAT_STRELCEM = "ch-mat-strelcem";
export const CH_MAT_STRELCEM_1 = "ch-mat-strelcem-1";
export const CH_MAT_STRELCEM_2 = "ch-mat-strelcem-2";
export const CH_MAT_KONEM = "ch-mat-konem";
export const CH_MAT_KONEM_1 = "ch-mat-konem-1";
export const CH_MAT_KONEM_2 = "ch-mat-konem-2";
export const CH_MAT_DAMOU = "ch-mat-damou";
export const CH_MAT_DAMOU_1 = "ch-mat-damou-1";
export const CH_MAT_DAMOU_2 = "ch-mat-damou-2";

function ch(
  id: string,
  parentId: string | null,
  slug: string,
  title: string,
  sort: number,
  kind: ChapterKind = "jednotazka",
): Chapter {
  return { id, courseId: COURSE_SKOLA, parentId, slug, title, sort, kind };
}

export const DEMO_CURRICULUM: Curriculum = {
  courses: [
    {
      id: COURSE_SKOLA,
      slug: "skolni-ulohy",
      title: "Jednotažky",
      sort: 0,
    },
  ],
  chapters: [
    ch(CH_MAT, null, "mat-v-1", "Mat v 1", 0, "vyklad"),
    ch(CH_MAT_VEZI, CH_MAT, "mat-vezi", "Mat věží", 0, "vyklad"),
    ch(CH_MAT_VEZI_1, CH_MAT_VEZI, "mat-vezi-1", "Mat věží 1", 0, "vyklad"),
    ch(CH_MAT_VEZI_2, CH_MAT_VEZI, "mat-vezi-2", "Mat věží 2", 1, "vyklad"),
    ch(CH_MAT_STRELCEM, CH_MAT, "mat-strelcem", "Mat střelcem", 1, "vyklad"),
    ch(CH_MAT_STRELCEM_1, CH_MAT_STRELCEM, "mat-strelcem-1", "Mat střelcem 1", 0, "vyklad"),
    ch(CH_MAT_STRELCEM_2, CH_MAT_STRELCEM, "mat-strelcem-2", "Mat střelcem 2", 1, "vyklad"),
    ch(CH_MAT_KONEM, CH_MAT, "mat-konem", "Mat koněm", 2, "vyklad"),
    ch(CH_MAT_KONEM_1, CH_MAT_KONEM, "mat-konem-1", "Mat koněm 1", 0, "vyklad"),
    ch(CH_MAT_KONEM_2, CH_MAT_KONEM, "mat-konem-2", "Mat koněm 2", 1, "vyklad"),
    ch(CH_MAT_DAMOU, CH_MAT, "mat-damou", "Mat dámou", 3, "vyklad"),
    ch(CH_MAT_DAMOU_1, CH_MAT_DAMOU, "mat-damou-1", "Mat dámou 1", 0, "vyklad"),
    ch(CH_MAT_DAMOU_2, CH_MAT_DAMOU, "mat-damou-2", "Mat dámou 2", 1, "vyklad"),
    ch(CH_FIGURY, null, "tahy-figur", "Tahy figur", 1, "jednotazka"),
    ch(CH_SACH, null, "sach-a-kryti", "Šach a krytí", 2, "jednotazka"),
  ],
};

export function newId(): string {
  return crypto.randomUUID();
}

export function slugify(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "kapitola";
}

export function uniqueSlug(base: string, used: string[]): string {
  const root = slugify(base);
  if (!used.includes(root)) return root;
  let i = 2;
  while (used.includes(`${root}-${i}`)) i += 1;
  return `${root}-${i}`;
}

export function sortCourses(courses: CurriculumCourse[]): CurriculumCourse[] {
  return [...courses].sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title, "cs"));
}

export function sortChapters(chapters: Chapter[]): Chapter[] {
  return [...chapters].sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title, "cs"));
}

export function childChapters(chapters: Chapter[], parentId: string | null, courseId?: string) {
  return sortChapters(
    chapters.filter((chapter) => {
      if (chapter.parentId !== parentId) return false;
      if (courseId && chapter.courseId !== courseId) return false;
      return true;
    }),
  );
}

export function findCourse(
  curriculum: Curriculum,
  slugOrId?: string | null,
): CurriculumCourse | undefined {
  if (!slugOrId) return sortCourses(curriculum.courses)[0];
  return curriculum.courses.find(
    (course) => course.slug === slugOrId || course.id === slugOrId,
  );
}

export function findChapter(
  curriculum: Curriculum,
  slugOrId?: string | null,
  courseId?: string,
): Chapter | undefined {
  if (!slugOrId) return undefined;
  return curriculum.chapters.find((chapter) => {
    if (courseId && chapter.courseId !== courseId) return false;
    return chapter.slug === slugOrId || chapter.id === slugOrId;
  });
}

export function chapterParam(
  value: string | string[] | undefined | null,
): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value];
}

export function chapterChain(chapters: Chapter[], chapterId: string): Chapter[] {
  const byId = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const chain: Chapter[] = [];
  let current = byId.get(chapterId);
  while (current) {
    chain.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain;
}

export function chapterSlugPath(chapters: Chapter[], chapterId: string): string[] {
  return chapterChain(chapters, chapterId).map((chapter) => chapter.slug);
}

export function chapterHref(
  courseSlug: string,
  chapters: Chapter[],
  chapter: Chapter,
): string {
  return `/ulohy/${courseSlug}/${chapterSlugPath(chapters, chapter.id).join("/")}`;
}

export function resolveChapterPath(
  curriculum: Curriculum,
  courseId: string,
  slugs: string[],
): Chapter | undefined {
  if (slugs.length === 0) return undefined;
  let parentId: string | null = null;
  let found: Chapter | undefined;
  for (const slug of slugs) {
    found = curriculum.chapters.find(
      (chapter) =>
        chapter.courseId === courseId &&
        chapter.parentId === parentId &&
        chapter.slug === slug,
    );
    if (!found) {
      return findChapter(curriculum, slugs[slugs.length - 1], courseId);
    }
    parentId = found.id;
  }
  return found;
}

function withJednotazkyTitle(curriculum: Curriculum): Curriculum {
  let changed = false;
  const courses = curriculum.courses.map((course) => {
    if (course.id !== COURSE_SKOLA && course.slug !== "skolni-ulohy") {
      return course;
    }
    if (course.title === "Jednotažky") return course;
    changed = true;
    return { ...course, title: "Jednotažky" };
  });
  return changed ? { ...curriculum, courses } : curriculum;
}

export function withMateSubchapters(curriculum: Curriculum): Curriculum {
  const named = withJednotazkyTitle(curriculum);
  const course =
    named.courses.find(
      (item) => item.id === COURSE_SKOLA || item.slug === "skolni-ulohy",
    ) ?? named.courses[0];
  if (!course) return named;
  const mat = named.chapters.find(
    (chapter) =>
      chapter.courseId === course.id &&
      (chapter.id === CH_MAT || chapter.slug === "mat-v-1"),
  );
  if (!mat) return named;
  if (childChapters(named.chapters, mat.id).length > 0) return named;

  const mateIds = new Set(descendantIds(DEMO_CURRICULUM.chapters, CH_MAT));
  mateIds.delete(CH_MAT);
  const idMap = new Map<string, string>([[CH_MAT, mat.id]]);
  const extras: Chapter[] = [];
  for (const seed of DEMO_CURRICULUM.chapters) {
    if (!mateIds.has(seed.id) || !seed.parentId) continue;
    const parentId = idMap.get(seed.parentId) ?? mat.id;
    extras.push({
      ...seed,
      courseId: course.id,
      parentId,
    });
    idMap.set(seed.id, seed.id);
  }
  if (extras.length === 0) return named;
  return { ...named, chapters: [...named.chapters, ...extras] };
}

export function descendantIds(chapters: Chapter[], rootId: string): string[] {
  const ids = [rootId];
  const walk = (parentId: string) => {
    for (const child of chapters) {
      if (child.parentId !== parentId) continue;
      ids.push(child.id);
      walk(child.id);
    }
  };
  walk(rootId);
  return ids;
}

export function chapterScopeIds(
  curriculum: Curriculum,
  courseSlug?: string | null,
  chapterSlug?: string | null,
): Set<string> | null {
  const course = findCourse(curriculum, courseSlug);
  if (!course) return null;
  if (!chapterSlug) {
    return new Set(
      curriculum.chapters
        .filter((chapter) => chapter.courseId === course.id)
        .map((chapter) => chapter.id),
    );
  }
  const chapter = findChapter(curriculum, chapterSlug, course.id);
  if (!chapter) return new Set();
  return new Set(descendantIds(curriculum.chapters, chapter.id));
}

export function puzzlesInChapter(
  puzzles: Puzzle[],
  chapterId: string,
  includeDescendants: boolean,
  chapters: Chapter[],
): Puzzle[] {
  const ids = includeDescendants
    ? new Set(descendantIds(chapters, chapterId))
    : new Set([chapterId]);
  return sortPuzzles(
    puzzles.filter((puzzle) => puzzle.chapterId && ids.has(puzzle.chapterId)),
  );
}

export function unassignedPuzzles(puzzles: Puzzle[]): Puzzle[] {
  return sortPuzzles(puzzles.filter((puzzle) => !puzzle.chapterId));
}

export function sortPuzzles(puzzles: Puzzle[]): Puzzle[] {
  return [...puzzles].sort(
    (a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.title.localeCompare(b.title, "cs"),
  );
}

export function bindPuzzlesToCurriculum(
  puzzles: Puzzle[],
  chapters: Chapter[],
): Puzzle[] {
  if (chapters.length === 0) return puzzles;
  const ids = new Set(chapters.map((chapter) => chapter.id));
  const byTitle = new Map(
    chapters.map((chapter) => [chapter.title.trim().toLowerCase(), chapter.id]),
  );
  return puzzles.map((puzzle) => {
    if (puzzle.chapterId && ids.has(puzzle.chapterId)) return puzzle;
    const theme = puzzle.theme?.trim().toLowerCase() ?? "";
    const fromTitle = theme ? byTitle.get(theme) : undefined;
    const fromTheme = themeChapterId(puzzle.theme);
    const chapterId =
      fromTitle ??
      (fromTheme && ids.has(fromTheme) ? fromTheme : puzzle.chapterId ?? null);
    return chapterId === puzzle.chapterId ? puzzle : { ...puzzle, chapterId };
  });
}

export function chapterPuzzleCount(
  puzzles: Puzzle[],
  chapterId: string,
  chapters: Chapter[],
): number {
  return puzzlesInChapter(puzzles, chapterId, true, chapters).length;
}

export function nextSort(items: { sort?: number }[]): number {
  if (items.length === 0) return 0;
  return Math.max(...items.map((item) => item.sort ?? 0)) + 1;
}

const TRAILING_NUM = /(\d+)\s*$/;

export function incrementTrailingNumber(title: string): string {
  const match = title.match(TRAILING_NUM);
  if (!match || match.index === undefined) return title;
  return `${title.slice(0, match.index)}${Number(match[1]) + 1}`;
}

export function titleEndsWithNumber(title: string): boolean {
  return TRAILING_NUM.test(title);
}

export function titleEndsWithSNumber(title: string): boolean {
  return /S\d+\s*$/.test(title);
}

export function uniqueCopyTitle(title: string, used: string[]): string {
  const taken = new Set(used);
  if (!taken.has(title)) return title;
  let next = TRAILING_NUM.test(title)
    ? incrementTrailingNumber(title)
    : `${title.trimEnd()} 2`;
  while (taken.has(next)) {
    const inc = incrementTrailingNumber(next);
    next = inc === next ? `${next} 2` : inc;
  }
  return next;
}

export function siblingCopyTitle(source: string, used: string[]): string {
  const next = TRAILING_NUM.test(source)
    ? incrementTrailingNumber(source)
    : source;
  return uniqueCopyTitle(next, used);
}

export function childCopyTitle(parent: string, used: string[]): string {
  if (/P\d+\s*$/.test(parent) && !/S\d+\s*$/.test(parent)) {
    return uniqueCopyTitle(`${parent.trimEnd()} S1`, used);
  }
  if (TRAILING_NUM.test(parent)) {
    return uniqueCopyTitle(incrementTrailingNumber(parent), used);
  }
  return uniqueCopyTitle(`${parent.trimEnd()} P1`, used);
}

/** Rozbitý uniqueCopyTitle z Pn: „…P1 2“. */
export function isBrokenVykladGroupTitle(title: string): boolean {
  return /P\d+\s+\d+\s*$/i.test(title);
}

/** Základ názvu groupy bez trailing P# / S# / čísla nadkapitoly. */
export function stripVykladGroupSuffix(title: string): string {
  return title
    .replace(/\s*S\d+\s*$/i, "")
    .replace(/\s*P\d+(?:\s+\d+)?\s*$/i, "")
    .replace(/\s+\d+\s*$/, "")
    .trimEnd();
}

/** Člen groupy = „… Pn“ (ne S#, ne „P1 2“). */
export function isVykladGroupMemberTitle(title: string): boolean {
  return /P\d+\s*$/i.test(title) && !/S\d+\s*$/i.test(title);
}

/** Další „… P1/P2…“ pod nadkapitolou groupy. */
export function nextVykladGroupTitle(
  groupParentTitle: string,
  used: string[],
): string {
  const base =
    stripVykladGroupSuffix(groupParentTitle) || groupParentTitle.trim();
  const taken = new Set(used);
  let max = 0;
  const re = new RegExp(
    `^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*P(\\d+)\\s*$`,
    "i",
  );
  for (const title of used) {
    const match = title.match(re);
    if (match) max = Math.max(max, Number(match[1]));
  }
  let next = `${base} P${max + 1}`;
  while (taken.has(next)) {
    max += 1;
    next = `${base} P${max + 1}`;
  }
  return next;
}

function isVykladGroupShellTitle(title: string): boolean {
  return (
    isVykladGroupMemberTitle(title) || isBrokenVykladGroupTitle(title)
  );
}

/**
 * Nadkapitola groupy = parent nad Pn (případně nad S#→Pn / „P1 2“ shell).
 * Nested Pn / rozbité „P1 2“ se prolezou nahoru.
 */
export function vykladGroupParentId(
  chapters: Chapter[],
  chapterId: string | null | undefined,
): string | null {
  if (!chapterId) return null;
  const start = chapters.find((item) => item.id === chapterId);
  if (!start) return null;
  let chapter = start;

  // S# pod Pn / „P1 2“ → začni od toho parentu
  if (/S\d+\s*$/i.test(chapter.title) && chapter.parentId) {
    const parentId = chapter.parentId;
    const parent = chapters.find((item) => item.id === parentId);
    if (parent && isVykladGroupShellTitle(parent.title)) {
      chapter = parent;
    }
  }

  // Vylez z vnořených Pn / „P1 2“ nahoru k nadkapitole
  while (chapter.parentId && isVykladGroupShellTitle(chapter.title)) {
    const parentId = chapter.parentId;
    const parent = chapters.find((item) => item.id === parentId);
    if (!parent) break;
    if (isVykladGroupShellTitle(parent.title)) {
      chapter = parent;
      continue;
    }
    return parent.id;
  }

  return chapter.parentId;
}

/** Všichni Pn členové groupy (i omylem vnoření pod shell). */
export function vykladGroupChapters(
  chapters: Chapter[],
  chapterId: string | null | undefined,
): Chapter[] {
  if (!chapterId) return [];
  const chapter = chapters.find((item) => item.id === chapterId);
  if (!chapter) return [];
  const parentId = vykladGroupParentId(chapters, chapterId);
  if (!parentId) {
    return chapterKindOf(chapter) === "vyklad" &&
      isVykladGroupMemberTitle(chapter.title)
      ? [chapter]
      : chapterKindOf(chapter) === "vyklad"
        ? [chapter]
        : [];
  }
  const parent = chapters.find((item) => item.id === parentId);
  const courseId = parent?.courseId ?? chapter.courseId;
  const out: Chapter[] = [];
  const walk = (id: string) => {
    for (const child of childChapters(chapters, id, courseId)) {
      if (chapterKindOf(child) !== "vyklad") continue;
      if (isVykladGroupMemberTitle(child.title)) {
        out.push(child);
        continue;
      }
      if (isBrokenVykladGroupTitle(child.title) || /S\d+\s*$/i.test(child.title)) {
        walk(child.id);
      }
    }
  };
  walk(parentId);
  return out;
}

export function isVykladGroup(
  chapters: Chapter[],
  chapterId: string | null | undefined,
) {
  return vykladGroupChapters(chapters, chapterId).length >= 2;
}

/**
 * Otisk výkladu — shoda = ještě nezměněno oproti předchozí.
 * Tah není povinný: stačí šipky, políčka, FEN, vysvětlení…
 */
export function puzzleLineKey(
  puzzle: Pick<
    Puzzle,
    "fen" | "moves" | "markup" | "explanation" | "wrongReplies"
  > | null | undefined,
): string {
  if (!puzzle) return "";
  return JSON.stringify({
    fen: String(puzzle.fen ?? "").trim(),
    moves: puzzle.moves ?? [],
    markup: serializePuzzleMarkup(puzzle.markup),
    explanation: String(puzzle.explanation ?? "").trim(),
    wrong: (puzzle.wrongReplies ?? []).map((reply) => ({
      answer: reply.answer,
      text: reply.text,
      markup: reply.markup ?? null,
    })),
  });
}

function vykladPnIndex(title: string): number {
  const match = title.match(/P(\d+)\s*$/i);
  return match ? Number(match[1]) : 0;
}

/** Pn list: S# pod Pn → Pn; jinak kapitola sama. */
export function vykladGroupMemberChapter(
  chapters: Chapter[],
  chapterId: string | null | undefined,
): Chapter | null {
  if (!chapterId) return null;
  const leaf = chapters.find((item) => item.id === chapterId);
  if (!leaf) return null;
  if (/S\d+\s*$/i.test(leaf.title) && leaf.parentId) {
    const parent = chapters.find((item) => item.id === leaf.parentId);
    if (parent && isVykladGroupMemberTitle(parent.title)) return parent;
    if (parent && isBrokenVykladGroupTitle(parent.title)) {
      const siblingPn = childChapters(
        chapters,
        parent.id,
        parent.courseId,
      ).find((item) => isVykladGroupMemberTitle(item.title));
      return siblingPn ?? leaf;
    }
  }
  return leaf;
}

/** Členové groupy seřazení P1 → P2 → … */
export function orderedVykladGroupMembers(
  chapters: Chapter[],
  chapterId: string | null | undefined,
): Chapter[] {
  return [...vykladGroupChapters(chapters, chapterId)].sort(
    (a, b) =>
      vykladPnIndex(a.title) - vykladPnIndex(b.title) ||
      a.sort - b.sort ||
      a.title.localeCompare(b.title, "cs"),
  );
}

export type VykladDuplicateGate =
  | { ok: true; source: Puzzle; member: Chapter }
  | { ok: false; reason: string };

/**
 * Další pozice ve skupině (0→1→2): jen z poslední Pn,
 * a jen když se obsah liší (značky / FEN / tahy / text — tah není povinný).
 */
export function canDuplicateVykladGroup(
  chapters: Chapter[],
  puzzles: Puzzle[],
  fromChapterId: string | null | undefined,
  livePuzzle?: Puzzle | null,
): VykladDuplicateGate {
  const member = vykladGroupMemberChapter(chapters, fromChapterId);
  if (!member) {
    return { ok: false, reason: "Stejná úloha potřebuje kapitolu." };
  }
  if (chapterKindOf(member) !== "vyklad") {
    return { ok: false, reason: "Groupa jen u výkladu." };
  }

  const stored =
    puzzlesInChapter(puzzles, member.id, false, chapters)[0] ??
    (fromChapterId
      ? puzzlesInChapter(puzzles, fromChapterId, false, chapters)[0]
      : undefined);
  const liveMatches =
    livePuzzle &&
    (livePuzzle.id === stored?.id ||
      livePuzzle.chapterId === member.id ||
      livePuzzle.chapterId === fromChapterId);
  const source = liveMatches ? livePuzzle : stored;
  if (!source || !String(source.fen ?? "").trim()) {
    return {
      ok: false,
      reason: "Nejdřív ulož platnou pozici, pak další ve skupině.",
    };
  }

  const ordered = orderedVykladGroupMembers(chapters, member.id).filter(
    (item) => isVykladGroupMemberTitle(item.title),
  );

  if (ordered.length === 0) {
    return { ok: true, source, member };
  }

  const last = ordered[ordered.length - 1]!;
  if (member.id !== last.id) {
    return {
      ok: false,
      reason: "Jen z poslední pozice ve skupině (posloupnost 0→1→2).",
    };
  }

  if (ordered.length >= 2) {
    const prev = ordered[ordered.length - 2]!;
    const prevPuzzle = puzzlesInChapter(puzzles, prev.id, false, chapters)[0];
    if (prevPuzzle && puzzleLineKey(source) === puzzleLineKey(prevPuzzle)) {
      return {
        ok: false,
        reason:
          "Nejdřív změň výklad (šipky, políčka, FEN…), pak další ve skupině.",
      };
    }
  }

  return { ok: true, source, member };
}

export function parseCurriculum(raw: unknown): Curriculum | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as { courses?: unknown; chapters?: unknown };
  if (!Array.isArray(row.courses) || !Array.isArray(row.chapters)) return null;
  const courses: CurriculumCourse[] = [];
  for (const item of row.courses) {
    if (!item || typeof item !== "object") continue;
    const course = item as Record<string, unknown>;
    const id = String(course.id ?? "").trim();
    const title = String(course.title ?? "").trim();
    if (!id || !title) continue;
    courses.push({
      id,
      slug: String(course.slug ?? slugify(title)),
      title,
      sort: Number(course.sort) || 0,
    });
  }
  const chapters: Chapter[] = [];
  for (const item of row.chapters) {
    if (!item || typeof item !== "object") continue;
    const chapter = item as Record<string, unknown>;
    const id = String(chapter.id ?? "").trim();
    const courseId = String(chapter.courseId ?? chapter.course_id ?? "").trim();
    const title = String(chapter.title ?? "").trim();
    if (!id || !courseId || !title) continue;
    const parentRaw = chapter.parentId ?? chapter.parent_id;
    const kindRaw = String(chapter.kind ?? "").trim();
    const side = parseChapterSide(chapter.side);
    const params = parsePuzzleParams(chapter.params);
    chapters.push({
      id,
      courseId,
      parentId: parentRaw ? String(parentRaw) : null,
      slug: String(chapter.slug ?? slugify(title)),
      title,
      sort: Number(chapter.sort) || 0,
      kind: parseChapterKind(kindRaw),
      ...(side ? { side } : {}),
      ...(!isEmptyParams(params) ? { params } : {}),
    });
  }
  if (courses.length === 0) return null;
  return { courses, chapters };
}

/** Legacy `cviceni` → `jednotazka`. Bez kind → jednotažka (ne výklad — schová import). */
export function parseChapterKind(raw: unknown): ChapterKind {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (v === "cviceni" || v === "jednotazka" || v === "j" || v === "c")
    return "jednotazka";
  if (v === "vzit_figuru" || v === "f") return "vzit_figuru";
  if (v === "mozne_tahy" || v === "m") return "mozne_tahy";
  if (v === "vyklad" || v === "v") return "vyklad";
  return "jednotazka";
}

export function chapterKindOf(
  chapter?: Pick<Chapter, "kind"> | null,
): ChapterKind {
  return parseChapterKind(chapter?.kind);
}

export function chapterKindShort(kind?: ChapterKind | null): string {
  switch (chapterKindOf({ kind: kind ?? undefined })) {
    case "jednotazka":
      return "C";
    case "vzit_figuru":
      return "F";
    case "mozne_tahy":
      return "M";
    default:
      return "V";
  }
}

export function chapterKindLabel(kind?: ChapterKind | null): string {
  switch (chapterKindOf({ kind: kind ?? undefined })) {
    case "jednotazka":
      return "Cvičení";
    case "vzit_figuru":
      return "Vzít figuru";
    case "mozne_tahy":
      return "Možné tahy";
    default:
      return "Výklad";
  }
}

/** 1 tah + ŠT (jednotažka / vzít figuru). */
export function isDrillChapter(
  chapter?: Pick<Chapter, "kind"> | null,
): boolean {
  const kind = chapterKindOf(chapter);
  return kind === "jednotazka" || kind === "vzit_figuru";
}

/** Označování polí. */
export function isSquaresChapter(
  chapter?: Pick<Chapter, "kind"> | null,
): boolean {
  return chapterKindOf(chapter) === "mozne_tahy";
}

/** N tahů + markup, bez ŠT. */
export function isLineChapter(
  chapter?: Pick<Chapter, "kind"> | null,
): boolean {
  return chapterKindOf(chapter) === "vyklad";
}

/** Bulk Excel parametry / Motivace kandidát. */
export function isParamsChapter(
  chapter?: Pick<Chapter, "kind"> | null,
): boolean {
  return isDrillChapter(chapter);
}

export function puzzleKindForChapter(
  chapter?: Pick<Chapter, "kind"> | null,
): "move" | "squares" {
  return isSquaresChapter(chapter) ? "squares" : "move";
}

export function isVykladEditorChapter(
  chapter?: Pick<Chapter, "kind" | "id"> | null,
  chapters: Chapter[] = [],
): boolean {
  if (!chapter || !isLineChapter(chapter)) return false;
  return childChapters(chapters, chapter.id).length === 0;
}

export function isVykladFolderChapter(
  chapter: Pick<Chapter, "kind" | "parentId" | "id"> | null | undefined,
  chapters: Chapter[],
): boolean {
  if (!chapter || !isLineChapter(chapter)) return false;
  if (!chapter.parentId) return true;
  return childChapters(chapters, chapter.id).length > 0;
}

export function nextChapterKind(kind?: ChapterKind): ChapterKind {
  const current = chapterKindOf({ kind });
  const index = CHAPTER_KINDS.indexOf(current);
  return CHAPTER_KINDS[(index + 1) % CHAPTER_KINDS.length] ?? "jednotazka";
}

export function parseChapterSide(value: unknown): ChapterSide | undefined {
  return value === "black" || value === "white" ? value : undefined;
}

export function nextChapterSide(side?: ChapterSide): ChapterSide {
  return side === "black" ? "white" : "black";
}

export function chapterSideOf(
  chapters: Chapter[],
  chapterId?: string | null,
): ChapterSide {
  if (chapterId) {
    const chain = chapterChain(chapters, chapterId);
    for (let i = chain.length - 1; i >= 0; i -= 1) {
      const side = chain[i]?.side;
      if (side === "white" || side === "black") return side;
    }
  }
  return "white";
}

export function chapterSideLabel(side?: ChapterSide): string {
  return side === "black" ? "Černá" : "Bílá";
}

export function chapterSideShort(side?: ChapterSide): string {
  return side === "black" ? "Č" : "B";
}

export function emptyPlacement(): PuzzlePlacement {
  return { chapterId: null, sort: 0 };
}

export function unpackPlacementComment(raw: string): {
  text: string;
  placement: PuzzlePlacement;
} {
  const match = raw.match(WSH);
  if (!match) return { text: raw, placement: emptyPlacement() };
  let placement = emptyPlacement();
  try {
    const parsed = JSON.parse(match[1] ?? "{}") as { c?: unknown; s?: unknown; chapterId?: unknown; sort?: unknown };
    const chapterId = String(parsed.c ?? parsed.chapterId ?? "").trim() || null;
    const sort = Number(parsed.s ?? parsed.sort) || 0;
    placement = { chapterId, sort };
  } catch {
    placement = emptyPlacement();
  }
  return { text: raw.replace(WSH, "").trimEnd(), placement };
}

export function packPlacementComment(placement?: PuzzlePlacement | null): string {
  if (!placement?.chapterId) return "";
  return `\n<!--wsh:${JSON.stringify({ c: placement.chapterId, s: placement.sort ?? 0 })}-->`;
}

export function themeChapterId(theme?: string): string | undefined {
  if (theme === "Mat v 1") return CH_MAT;
  if (theme === "Tahy figur") return CH_FIGURY;
  if (theme === "Šach a krytí") return CH_SACH;
  return undefined;
}

export function chapterPathLabel(
  chapters: Chapter[],
  chapterId: string | null | undefined,
): string {
  if (!chapterId) return "Nezařazené";
  const chain = chapterChain(chapters, chapterId);
  if (chain.length === 0) return "Nezařazené";
  return chain.map((chapter) => chapter.title).join(" / ");
}
