import type { Puzzle } from "@/lib/types";

export type CurriculumCourse = {
  id: string;
  slug: string;
  title: string;
  sort: number;
};

export type ChapterKind = "vyklad" | "cviceni";

export type Chapter = {
  id: string;
  courseId: string;
  parentId: string | null;
  slug: string;
  title: string;
  sort: number;
  kind?: ChapterKind;
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
  kind: ChapterKind = "vyklad",
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
    ch(CH_MAT, null, "mat-v-1", "Mat v 1", 0),
    ch(CH_MAT_VEZI, CH_MAT, "mat-vezi", "Mat věží", 0),
    ch(CH_MAT_VEZI_1, CH_MAT_VEZI, "mat-vezi-1", "Mat věží 1", 0),
    ch(CH_MAT_VEZI_2, CH_MAT_VEZI, "mat-vezi-2", "Mat věží 2", 1),
    ch(CH_MAT_STRELCEM, CH_MAT, "mat-strelcem", "Mat střelcem", 1),
    ch(CH_MAT_STRELCEM_1, CH_MAT_STRELCEM, "mat-strelcem-1", "Mat střelcem 1", 0),
    ch(CH_MAT_STRELCEM_2, CH_MAT_STRELCEM, "mat-strelcem-2", "Mat střelcem 2", 1),
    ch(CH_MAT_KONEM, CH_MAT, "mat-konem", "Mat koněm", 2),
    ch(CH_MAT_KONEM_1, CH_MAT_KONEM, "mat-konem-1", "Mat koněm 1", 0),
    ch(CH_MAT_KONEM_2, CH_MAT_KONEM, "mat-konem-2", "Mat koněm 2", 1),
    ch(CH_MAT_DAMOU, CH_MAT, "mat-damou", "Mat dámou", 3),
    ch(CH_MAT_DAMOU_1, CH_MAT_DAMOU, "mat-damou-1", "Mat dámou 1", 0),
    ch(CH_MAT_DAMOU_2, CH_MAT_DAMOU, "mat-damou-2", "Mat dámou 2", 1),
    ch(CH_FIGURY, null, "tahy-figur", "Tahy figur", 1, "cviceni"),
    ch(CH_SACH, null, "sach-a-kryti", "Šach a krytí", 2, "cviceni"),
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
    chapters.push({
      id,
      courseId,
      parentId: parentRaw ? String(parentRaw) : null,
      slug: String(chapter.slug ?? slugify(title)),
      title,
      sort: Number(chapter.sort) || 0,
      kind: kindRaw === "cviceni" ? "cviceni" : "vyklad",
    });
  }
  if (courses.length === 0) return null;
  return { courses, chapters };
}

export function chapterKindOf(
  chapter?: Pick<Chapter, "kind"> | null,
): ChapterKind {
  return chapter?.kind === "cviceni" ? "cviceni" : "vyklad";
}

export function nextChapterKind(kind?: ChapterKind): ChapterKind {
  return kind === "cviceni" ? "vyklad" : "cviceni";
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
