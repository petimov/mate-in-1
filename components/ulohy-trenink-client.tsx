"use client";

import { PuzzleTrainer } from "@/components/puzzle-trainer";
import { descendantIds, findCourse } from "@/lib/curriculum";
import { useUlohyData } from "@/lib/use-ulohy-data";

export function UlohyTreninkClient({ chapterId }: { chapterId?: string }) {
  const { curriculum, puzzles, error, loading } = useUlohyData();
  if (loading) return null;
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
    <PuzzleTrainer
      initialCurriculum={curriculum}
      initialPuzzles={scoped}
      title="Trénink"
      backHref={course ? `/ulohy/${course.slug}` : "/ulohy"}
      backLabel="Kapitoly"
      reviewOnly
    />
  );
}
