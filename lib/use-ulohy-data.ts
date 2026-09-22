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

export function useUlohyData() {
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [puzzles, setPuzzles] = useState<Puzzle[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [puzzleRes, curRes] = await Promise.all([
          fetchWithAuth("/api/puzzles"),
          fetchWithAuth("/api/curriculum"),
        ]);
        if (puzzleRes.status === 401 || puzzleRes.status === 402) {
          if (!cancelled) setError("Bez předplatného úlohy nejdou.");
          return;
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
        if (!cancelled) {
          setCurriculum(nextCurriculum);
          setPuzzles(
            bindPuzzlesToCurriculum(nextPuzzles, nextCurriculum.chapters),
          );
        }
      } catch {
        if (!cancelled) setError("Úlohy se nenačetly.");
      }
    }
    void load();
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
