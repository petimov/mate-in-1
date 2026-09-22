"use client";

import { Suspense } from "react";

import { PuzzleTrainer } from "@/components/puzzle-trainer";
import { descendantIds, findCourse } from "@/lib/curriculum";
import { useUlohyData } from "@/lib/use-ulohy-data";

export function UlohyTreninkClient({ chapterId }: { chapterId?: string }) {
  const { curriculum, puzzles, error, loading } = useUlohyData();
  if (loading) return <div className="min-h-0 flex-1 bg-background" />;
  if (error || !curriculum || !puzzles) {
    return (
      <p className="p-6 text-sm text-red-500">{error || "Úlohy nejsou."}</p>
    );
  }
  const course = findCourse(curriculum);
  const allowed = chapterId
    ? new Set(descendantIds(curriculum.chapters, chapterId))
    : null;
  const scoped = allowed
    ? puzzles.filter(
        (puzzle) => puzzle.chapterId && allowed.has(puzzle.chapterId),
      )
    : puzzles;

  return (
    <Suspense fallback={<div className="flex-1 bg-background" />}>
      <PuzzleTrainer
        initialCurriculum={curriculum}
        initialPuzzles={scoped}
        title="Trénink"
        backHref={course ? `/ulohy/${course.slug}` : "/ulohy"}
        backLabel="Kapitoly"
        reviewOnly
      />
    </Suspense>
  );
}
