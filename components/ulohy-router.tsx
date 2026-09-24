"use client";

import { useEffect, useState } from "react";

import { UlohyCatalogClient } from "@/components/ulohy-catalog-client";
import { UlohyChapterClient } from "@/components/ulohy-chapter-client";
import { UlohyTreninkClient } from "@/components/ulohy-trenink-client";
import { onUlohyLocation } from "@/lib/ulohy-nav";
import { useClientPathname } from "@/lib/use-client-path";

function ulohyParts(pathname: string) {
  return pathname
    .replace(/^\/ulohy\/?/, "")
    .split("/")
    .filter(Boolean)
    .map((part) => decodeURIComponent(part));
}

function treninkChapter() {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get("chapter") ?? undefined;
}

export function UlohyRouter() {
  const pathname = useClientPathname();
  const [chapterId, setChapterId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const sync = () => setChapterId(treninkChapter());
    sync();
    return onUlohyLocation(sync);
  }, [pathname]);

  const parts = ulohyParts(pathname);

  if (parts[0] === "trenink") {
    return (
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <UlohyTreninkClient chapterId={chapterId} />
      </main>
    );
  }

  if (parts.length <= 1) {
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
