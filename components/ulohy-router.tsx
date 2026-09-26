"use client";

import { useEffect, useState } from "react";

import { UlohyCatalogClient } from "@/components/ulohy-catalog-client";
import { UlohyChapterClient } from "@/components/ulohy-chapter-client";
import { UlohyTreninkClient } from "@/components/ulohy-trenink-client";
import { onUlohyLocation } from "@/lib/ulohy-nav";
import { useClientPathname } from "@/lib/use-client-path";
import { useUlohyData } from "@/lib/use-ulohy-data";

function ulohyParts(pathname: string) {
  return pathname
    .replace(/^\/ulohy\/?/, "")
    .split("/")
    .filter(Boolean)
    .map((part) => decodeURIComponent(part));
}

function treninkQuery() {
  if (typeof window === "undefined") return { chapterId: undefined, learn: false };
  const params = new URLSearchParams(window.location.search);
  return {
    chapterId: params.get("chapter") ?? undefined,
    learn: params.get("learn") === "1",
  };
}

export function UlohyRouter() {
  const pathname = useClientPathname();
  const { loading } = useUlohyData();
  const [chapterId, setChapterId] = useState<string | undefined>(undefined);
  const [learn, setLearn] = useState(false);
  const [shown, setShown] = useState({ pathname, chapterId, learn });

  useEffect(() => {
    const sync = () => {
      const next = treninkQuery();
      setChapterId(next.chapterId);
      setLearn(next.learn);
    };
    sync();
    return onUlohyLocation(sync);
  }, [pathname]);

  useEffect(() => {
    if (loading) return;
    setShown({ pathname, chapterId, learn });
  }, [pathname, chapterId, learn, loading]);

  const parts = ulohyParts(shown.pathname);

  if (parts[0] === "trenink") {
    return (
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <UlohyTreninkClient chapterId={shown.chapterId} learn={shown.learn} />
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
