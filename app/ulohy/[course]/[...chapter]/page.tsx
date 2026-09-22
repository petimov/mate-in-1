import { UlohyChapterClient } from "@/components/ulohy-chapter-client";

export default async function UlohyChapterPage({
  params,
}: {
  params: Promise<{ course: string; chapter?: string[] }>;
}) {
  const { course, chapter } = await params;
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <UlohyChapterClient courseSlug={course} chapterSlug={chapter} />
    </main>
  );
}
