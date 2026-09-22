"use client";

import { Suspense } from "react";

import { ChapterCatalog } from "@/components/chapter-catalog";
import { PuzzleTrainer } from "@/components/puzzle-trainer";
import {
  chapterParam,
  childChapters,
  findCourse,
  resolveChapterPath,
} from "@/lib/curriculum";
import { useUlohyData } from "@/lib/use-ulohy-data";

export function UlohyChapterClient({
  courseSlug,
  chapterSlug,
}: {
  courseSlug: string;
  chapterSlug?: string[];
}) {
  const { curriculum, puzzles, error, loading } = useUlohyData();
  if (loading) return <div className="min-h-0 flex-1 bg-background" />;
  if (error || !curriculum || !puzzles) {
    return (
      <p className="p-6 text-sm text-red-500">{error || "Úlohy nejsou."}</p>
    );
  }

  const slugs = chapterParam(chapterSlug);
  const course = findCourse(curriculum, courseSlug);
  const chapter = course
    ? resolveChapterPath(curriculum, course.id, slugs)
    : undefined;
  const hasChildren = chapter
    ? childChapters(curriculum.chapters, chapter.id).length > 0
    : true;

  if (!course || hasChildren) {
    return (
      <ChapterCatalog
        courseSlug={courseSlug}
        chapterSlug={slugs}
        curriculum={curriculum}
        puzzles={puzzles}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Suspense fallback={<div className="flex-1 bg-background" />}>
        <PuzzleTrainer
          initialCurriculum={curriculum}
          initialPuzzles={puzzles}
        />
      </Suspense>
    </div>
  );
}
