"use client";

import { ChapterCatalog } from "@/components/chapter-catalog";
import { UlohySkeleton } from "@/components/ulohy-skeleton";
import { useUlohyData } from "@/lib/use-ulohy-data";

export function UlohyCatalogClient({
  courseSlug,
  chapterSlug,
}: {
  courseSlug?: string;
  chapterSlug?: string | string[];
}) {
  const { curriculum, puzzles, error, loading } = useUlohyData();
  if (loading) return <UlohySkeleton />;
  if (error || !curriculum || !puzzles) {
    return (
      <p className="p-6 text-sm text-red-500">{error || "Úlohy nejsou."}</p>
    );
  }
  return (
    <ChapterCatalog
      courseSlug={courseSlug}
      chapterSlug={chapterSlug}
      curriculum={curriculum}
      puzzles={puzzles}
    />
  );
}
