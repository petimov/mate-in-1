"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { UlohyCatalogClient } from "@/components/ulohy-catalog-client";
import { UlohyChapterClient } from "@/components/ulohy-chapter-client";
import { UlohyTreninkClient } from "@/components/ulohy-trenink-client";

function ulohyParts(pathname: string) {
  return pathname
    .replace(/^\/ulohy\/?/, "")
    .split("/")
    .filter(Boolean)
    .map((part) => decodeURIComponent(part));
}

export function UlohyRouter() {
  const pathname = usePathname();
  const search = useSearchParams();
  const parts = ulohyParts(pathname);

  if (parts[0] === "trenink") {
    return (
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <UlohyTreninkClient chapterId={search.get("chapter") ?? undefined} />
      </main>
    );
  }

  if (parts.length === 0) {
    return (
      <main className="min-h-0 flex-1 overflow-y-auto">
        <UlohyCatalogClient />
      </main>
    );
  }

  if (parts.length === 1) {
    return (
      <main className="min-h-0 flex-1 overflow-y-auto">
        <UlohyCatalogClient courseSlug={parts[0]} />
      </main>
    );
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <UlohyChapterClient courseSlug={parts[0]} chapterSlug={parts.slice(1)} />
    </main>
  );
}
