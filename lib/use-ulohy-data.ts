"use client";

import { useEffect, useState } from "react";

import { fetchWithAuth } from "@/lib/auth-fetch";
import {
  bindPuzzlesToCurriculum,
  DEMO_CURRICULUM,
  withMateSubchapters,
  type Curriculum,
} from "@/lib/curriculum";
import type { Puzzle } from "@/lib/types";

type Cache = {
  curriculum: Curriculum;
  puzzles: Puzzle[];
};

let cache: Cache | null = null;
let inflight: Promise<Cache | string> | null = null;

async function loadUlohy(): Promise<Cache | string> {
  if (inflight) return inflight;
  inflight = (async () => {
    const [puzzleRes, curRes] = await Promise.all([
      fetchWithAuth("/api/puzzles"),
      fetchWithAuth("/api/curriculum"),
    ]);
    if (puzzleRes.status === 401 || puzzleRes.status === 402) {
      return "Bez předplatného úlohy nejdou.";
    }
    let nextCurriculum = DEMO_CURRICULUM;
    if (curRes.ok) {
      const data = (await curRes.json()) as { curriculum?: Curriculum };
      if (data.curriculum?.courses?.length) {
        nextCurriculum = withMateSubchapters(data.curriculum);
      }
    }
    let nextPuzzles: Puzzle[] = [];
    if (puzzleRes.ok) {
      const data = (await puzzleRes.json()) as { puzzles?: Puzzle[] };
      nextPuzzles = data.puzzles ?? [];
    }
    const next: Cache = {
      curriculum: nextCurriculum,
      puzzles: bindPuzzlesToCurriculum(nextPuzzles, nextCurriculum.chapters),
    };
    cache = next;
    return next;
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

export function useUlohyData() {
  const [curriculum, setCurriculum] = useState<Curriculum | null>(
    cache?.curriculum ?? null,
  );
  const [puzzles, setPuzzles] = useState<Puzzle[] | null>(
    cache?.puzzles ?? null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadUlohy().then((next) => {
      if (cancelled) return;
      if (typeof next === "string") {
        setError(next);
        return;
      }
      setCurriculum(next.curriculum);
      setPuzzles(next.puzzles);
    }).catch(() => {
      if (!cancelled) setError("Úlohy se nenačetly.");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    curriculum,
    puzzles,
    error,
    loading: !error && (!curriculum || !puzzles),
  };
}
