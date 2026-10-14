"use client";

import { PuzzleTrainer, type PracticeMode } from "@/components/puzzle-trainer";
import { UlohySkeleton } from "@/components/ulohy-skeleton";
import { descendantIds, findCourse, puzzlesInChapter } from "@/lib/curriculum";
import { useUlohyData } from "@/lib/use-ulohy-data";

export function UlohyTreninkClient({
  chapterId,
  learn = false,
  practiceMode = null,
  resumeWip = false,
}: {
  chapterId?: string;
  learn?: boolean;
  practiceMode?: PracticeMode | null;
  resumeWip?: boolean;
}) {
  const { curriculum, puzzles, error, loading } = useUlohyData();
  if (loading) return <UlohySkeleton />;
  if (error || !curriculum || !puzzles) {
    return (
      <p className="p-6 text-sm text-red-500">{error || "Úlohy nejsou."}</p>
    );
  }
  const course = findCourse(curriculum);
  let scoped = puzzles;
  if (practiceMode === "chapter" && chapterId) {
    scoped = puzzlesInChapter(
      puzzles,
      chapterId,
      false,
      curriculum.chapters,
    );
  } else if (chapterId) {
    const allowed = new Set(descendantIds(curriculum.chapters, chapterId));
    scoped = puzzles.filter(
      (puzzle) => puzzle.chapterId && allowed.has(puzzle.chapterId),
    );
  }

  const title =
    practiceMode === "chapter"
      ? "Kapitola"
      : practiceMode === "wrong"
        ? "Špatné úlohy"
        : learn
          ? "Cvičení"
          : "Trénink";

  return (
    <PuzzleTrainer
      initialCurriculum={curriculum}
      initialPuzzles={scoped}
      title={title}
      backHref={
        practiceMode
          ? "/ulohy/motivace"
          : course
            ? `/ulohy/${course.slug}`
            : "/ulohy"
      }
      backLabel={practiceMode ? "Motivace" : "Kapitoly"}
      reviewOnly={!learn && !practiceMode}
      practiceMode={practiceMode}
      practiceChapterId={chapterId}
      resumeWip={resumeWip}
    />
  );
}
