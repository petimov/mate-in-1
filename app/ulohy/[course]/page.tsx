import { UlohyCatalogClient } from "@/components/ulohy-catalog-client";

export default async function UlohyCoursePage({
  params,
}: {
  params: Promise<{ course: string }>;
}) {
  const { course } = await params;
  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <UlohyCatalogClient courseSlug={course} />
    </main>
  );
}
