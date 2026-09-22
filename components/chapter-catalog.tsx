"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { BookOpen, RotateCcw } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { BoardSettingsMenu } from "@/components/board-settings-menu";
import { ChapterBreadcrumb } from "@/components/chapter-breadcrumb";
import { useSrsMap } from "@/components/srs-stats";
import { Button } from "@/components/ui/button";
import {
  chapterHref,
  chapterKindOf,
  chapterParam,
  chapterPuzzleCount,
  childChapters,
  findCourse,
  puzzlesInChapter,
  resolveChapterPath,
  sortCourses,
  type Chapter,
  type Curriculum,
  type CurriculumCourse,
} from "@/lib/curriculum";
import { SCHOOL } from "@/lib/school";
import { summarizeSrs, type SrsMap } from "@/lib/srs";
import type { Puzzle } from "@/lib/types";
import { cn } from "@/lib/utils";

type ChapterCatalogProps = {
  courseSlug?: string;
  chapterSlug?: string | string[];
  curriculum: Curriculum;
  puzzles: Puzzle[];
};

function ulohyCountLabel(count: number) {
  return `${count} ${count === 1 ? "úloha" : count < 5 ? "úlohy" : "úloh"}`;
}

function puzzleIdsForChapter(
  puzzles: Puzzle[],
  chapterId: string,
  chapters: Curriculum["chapters"],
) {
  return puzzlesInChapter(puzzles, chapterId, true, chapters).map(
    (puzzle) => puzzle.id,
  );
}

function coursePuzzleIds(
  puzzles: Puzzle[],
  courseId: string,
  chapters: Curriculum["chapters"],
) {
  return puzzles
    .filter((puzzle) =>
      chapters.some(
        (chapter) =>
          chapter.courseId === courseId && chapter.id === puzzle.chapterId,
      ),
    )
    .map((puzzle) => puzzle.id);
}

function leafChapters(
  chapters: Chapter[],
  parentId: string | null,
  courseId: string,
): Chapter[] {
  const kids = childChapters(chapters, parentId, courseId);
  const out: Chapter[] = [];
  for (const kid of kids) {
    const subs = childChapters(chapters, kid.id);
    if (subs.length === 0) out.push(kid);
    else out.push(...leafChapters(chapters, kid.id, courseId));
  }
  return out;
}

function firstLearnHref(
  course: CurriculumCourse,
  chapters: Chapter[],
  puzzles: Puzzle[],
  parentId: string | null,
  map: SrsMap | null,
): string | null {
  const leaves = leafChapters(chapters, parentId, course.id).filter(
    (chapter) =>
      puzzlesInChapter(puzzles, chapter.id, false, chapters).length > 0,
  );
  if (leaves.length === 0) return null;
  if (map) {
    const withNew = leaves.find((chapter) => {
      const ids = puzzlesInChapter(puzzles, chapter.id, false, chapters).map(
        (puzzle) => puzzle.id,
      );
      return summarizeSrs(ids, map).new > 0;
    });
    if (withNew) return chapterHref(course.slug, chapters, withNew);
  }
  return chapterHref(course.slug, chapters, leaves[0]);
}

function CourseCover() {
  return (
    <div className="relative size-[4.25rem] shrink-0 overflow-hidden rounded-lg shadow-md sm:size-20">
      <div className="grid h-full w-full grid-cols-2 grid-rows-2">
        <span className="bg-[#f0d9b5]" />
        <span className="bg-[#b58863]" />
        <span className="bg-[#b58863]" />
        <span className="bg-[#f0d9b5]" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-black/25">
        <span className="text-lg font-bold tracking-tight text-white sm:text-xl">
          J
        </span>
      </div>
    </div>
  );
}

export function ChapterCatalog({
  courseSlug,
  chapterSlug,
  curriculum,
  puzzles,
}: ChapterCatalogProps) {
  const { user, ready } = useAuth();
  const map = useSrsMap();
  const courses = sortCourses(curriculum.courses);
  const course =
    findCourse(curriculum, courseSlug) ??
    (courses.length === 1 ? courses[0] : undefined);
  const slugs = chapterParam(chapterSlug);
  const parent = course
    ? resolveChapterPath(curriculum, course.id, slugs)
    : undefined;
  const list = course
    ? childChapters(curriculum.chapters, parent?.id ?? null, course.id)
    : [];

  if (!course && courses.length !== 1) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-semibold tracking-tight">Jednotažky</h1>
        <p className="mt-2 text-sm text-muted-foreground">Vyber kurz.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((item, index) => {
            const count = puzzles.filter((puzzle) =>
              curriculum.chapters.some(
                (chapter) =>
                  chapter.courseId === item.id &&
                  chapter.id === puzzle.chapterId,
              ),
            ).length;
            return (
              <Link
                key={item.id}
                href={`/ulohy/${item.slug}`}
                className="rounded-xl border border-border bg-card p-5 hover:border-[#81b64c]/50"
              >
                <h2 className="text-lg font-semibold">
                  {index + 1}. {item.title}
                </h2>
                <p className="mt-3 text-sm text-[#81b64c]">
                  {ulohyCountLabel(count)}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Jednotažky</h1>
        <p className="mt-2 text-sm text-muted-foreground">Zatím žádný kurz.</p>
      </div>
    );
  }

  const scopeIds = parent
    ? puzzleIdsForChapter(puzzles, parent.id, curriculum.chapters)
    : coursePuzzleIds(puzzles, course.id, curriculum.chapters);
  const stats =
    ready && user && scopeIds.length > 0
      ? summarizeSrs(scopeIds, map)
      : null;
  const studied = stats ? stats.due + stats.later : 0;
  const total = scopeIds.length;
  const learnHref = firstLearnHref(
    course,
    curriculum.chapters,
    puzzles,
    parent?.id ?? null,
    user ? map : null,
  );
  const reviewHref = parent
    ? `/ulohy/trenink?chapter=${encodeURIComponent(parent.id)}`
    : "/ulohy/trenink";
  const reviewLoginHref = `/ucet?next=${encodeURIComponent(reviewHref)}`;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <CourseCover />
          <div className="min-w-0">
            {parent ? (
              <ChapterBreadcrumb
                course={course}
                chapters={curriculum.chapters}
                chapter={parent}
                className="mb-1"
              />
            ) : null}
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
              {parent ? parent.title : course.title}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Kapitoly
              {total > 0 ? ` · ${ulohyCountLabel(total)}` : null}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {learnHref ? (
            <Button
              asChild
              className="bg-[#81b64c] text-zinc-950 hover:bg-[#72a642]"
            >
              <Link href={learnHref}>
                <BookOpen className="size-4" />
                Studovat
              </Link>
            </Button>
          ) : (
            <Button
              disabled
              className="bg-[#81b64c] text-zinc-950 hover:bg-[#72a642]"
            >
              <BookOpen className="size-4" />
              Studovat
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href={user ? reviewHref : reviewLoginHref}>
              <RotateCcw className="size-4" />
              Opakovat
              {stats && stats.due > 0 ? (
                <span className="rounded-full bg-amber-500/15 px-1.5 text-xs text-amber-600 dark:text-amber-400">
                  {stats.due}
                </span>
              ) : null}
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            V téhle kapitole nic není.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((chapter, index) => (
              <ChapterCard
                key={chapter.id}
                index={index + 1}
                chapter={chapter}
                course={course}
                curriculum={curriculum}
                puzzles={puzzles}
                map={user ? map : null}
              />
            ))}
          </div>
        )}

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Vzhled
            </h2>
            <div className="mt-2">
              <BoardSettingsMenu />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Kurz
            </h2>
            <nav className="mt-3 space-y-0.5 text-sm">
              <SidebarLink href={learnHref ?? "#"} disabled={!learnHref}>
                Studovat
              </SidebarLink>
              <SidebarLink href={user ? reviewHref : reviewLoginHref}>
                Opakovat
                {stats && stats.due > 0 ? ` · ${stats.due}` : null}
              </SidebarLink>
              <SidebarLink href="/ucet">Nastavení</SidebarLink>
            </nav>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Stav
            </h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Row label="Úlohy" value={String(total)} />
              {stats ? (
                <>
                  <Row
                    label="Hotovo"
                    value={`${studied}/${total}`}
                    tone={studied === total && total > 0 ? "ok" : undefined}
                  />
                  <Row
                    label="Ke studiu"
                    value={String(stats.new)}
                    tone={stats.new > 0 ? "muted" : undefined}
                  />
                  <Row
                    label="K opakování"
                    value={String(stats.due)}
                    tone={stats.due > 0 ? "warn" : undefined}
                  />
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {ready && !user
                    ? "Stav až s účtem."
                    : SCHOOL.tagline}
                </p>
              )}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ChapterCard({
  index,
  chapter,
  course,
  curriculum,
  puzzles,
  map,
}: {
  index: number;
  chapter: Chapter;
  course: CurriculumCourse;
  curriculum: Curriculum;
  puzzles: Puzzle[];
  map: SrsMap | null;
}) {
  const subs = childChapters(curriculum.chapters, chapter.id);
  const count = chapterPuzzleCount(
    puzzles,
    chapter.id,
    curriculum.chapters,
  );
  const ids = puzzleIdsForChapter(puzzles, chapter.id, curriculum.chapters);
  const stats = map && ids.length > 0 ? summarizeSrs(ids, map) : null;
  const studied = stats ? stats.due + stats.later : 0;
  const pct = count > 0 ? Math.round((studied / count) * 100) : 0;
  const href = chapterHref(course.slug, curriculum.chapters, chapter);

  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-[#81b64c]/55"
    >
      <h2 className="text-[15px] font-semibold leading-snug">
        <span className="text-muted-foreground">{index}. </span>
        {chapter.title}
      </h2>
      <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        {chapterKindOf(chapter) === "cviceni" ? "Cvičení" : "Výklad"}
      </p>
      {subs.length > 0 ? (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {subs.length}{" "}
          {subs.length === 1
            ? "podkapitola"
            : subs.length < 5
              ? "podkapitoly"
              : "podkapitol"}
        </p>
      ) : null}

      <div className="mt-auto pt-3">
        <div className="flex items-end justify-between gap-2 text-xs">
          <span className="text-muted-foreground">{ulohyCountLabel(count)}</span>
          {stats && count > 0 ? (
            <span
              className={cn(
                "font-semibold tabular-nums",
                stats.due > 0
                  ? "text-amber-500"
                  : pct >= 80
                    ? "text-[#81b64c]"
                    : pct > 0
                      ? "text-amber-500"
                      : "text-muted-foreground",
              )}
            >
              {stats.due > 0 ? stats.due : pct}
            </span>
          ) : null}
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-foreground/10">
          <div
            className={cn(
              "h-full rounded-full",
              stats && stats.due > 0 ? "bg-amber-500" : "bg-[#81b64c]",
            )}
            style={{ width: `${stats ? pct : 0}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

function SidebarLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <span className="block rounded-md px-2 py-1.5 text-muted-foreground/50">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="block rounded-md px-2 py-1.5 hover:bg-foreground/5"
    >
      {children}
    </Link>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "muted";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "tabular-nums",
          tone === "ok" && "text-[#81b64c]",
          tone === "warn" && "text-amber-500",
          tone === "muted" && "text-muted-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
