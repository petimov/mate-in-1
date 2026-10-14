"use client";

import { useEffect, useState } from "react";

import { UlohyCatalogClient } from "@/components/ulohy-catalog-client";
import { UlohyChapterClient } from "@/components/ulohy-chapter-client";
import { MotivaceDashboard } from "@/components/motivace-dashboard";
import { UlohyTreninkClient } from "@/components/ulohy-trenink-client";
import type { PracticeMode } from "@/components/puzzle-trainer";
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
  if (typeof window === "undefined") {
    return {
      chapterId: undefined,
      learn: false,
      practiceMode: null as PracticeMode | null,
      resumeWip: false,
    };
  }
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const practiceMode: PracticeMode | null =
    mode === "chapter" || mode === "wrong" ? mode : null;
  return {
    chapterId: params.get("chapter") ?? undefined,
    learn: params.get("learn") === "1",
    practiceMode,
    resumeWip: params.get("resume") === "1",
  };
}

export function UlohyRouter() {
  const pathname = useClientPathname();
  const { loading } = useUlohyData();
  const [chapterId, setChapterId] = useState<string | undefined>(undefined);
  const [learn, setLearn] = useState(false);
  const [practiceMode, setPracticeMode] = useState<PracticeMode | null>(null);
  const [resumeWip, setResumeWip] = useState(false);
  const [shown, setShown] = useState({
    pathname,
    chapterId,
    learn,
    practiceMode,
    resumeWip,
  });

  useEffect(() => {
    const sync = () => {
      const next = treninkQuery();
      setChapterId(next.chapterId);
      setLearn(next.learn);
      setPracticeMode(next.practiceMode);
      setResumeWip(next.resumeWip);
    };
    sync();
    return onUlohyLocation(sync);
  }, [pathname]);

  useEffect(() => {
    if (loading) return;
    setShown({ pathname, chapterId, learn, practiceMode, resumeWip });
  }, [pathname, chapterId, learn, practiceMode, resumeWip, loading]);

  const parts = ulohyParts(shown.pathname);

  if (parts[0] === "motivace") {
    return (
      <main className="min-h-0 flex-1 overflow-y-auto">
        <MotivaceDashboard />
      </main>
    );
  }

  if (parts[0] === "trenink") {
    return (
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <UlohyTreninkClient
          chapterId={shown.chapterId}
          learn={shown.learn}
          practiceMode={shown.practiceMode}
          resumeWip={shown.resumeWip}
        />
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
