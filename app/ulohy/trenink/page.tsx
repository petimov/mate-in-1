import { UlohyTreninkClient } from "@/components/ulohy-trenink-client";

export default async function TreninkPage({
  searchParams,
}: {
  searchParams: Promise<{ chapter?: string }>;
}) {
  const { chapter } = await searchParams;
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <UlohyTreninkClient chapterId={chapter} />
    </main>
  );
}
