import {
  DEMO_CURRICULUM,
  bindPuzzlesToCurriculum,
  withMateSubchapters,
  type Curriculum,
} from "@/lib/curriculum";
import { loadCurriculum } from "@/lib/curriculum-store";
import { DEMO_PUZZLES } from "@/lib/puzzles";
import { listPuzzles } from "@/lib/puzzle-store";
import { createServerSupabase } from "@/lib/supabase";
import type { Puzzle } from "@/lib/types";

export async function loadUlohyData(): Promise<{
  curriculum: Curriculum;
  puzzles: Puzzle[];
}> {
  const supabase = createServerSupabase();
  if (!supabase) {
    return {
      curriculum: DEMO_CURRICULUM,
      puzzles: bindPuzzlesToCurriculum(DEMO_PUZZLES, DEMO_CURRICULUM.chapters),
    };
  }

  const [{ curriculum }, { puzzles }] = await Promise.all([
    loadCurriculum(supabase),
    listPuzzles(supabase),
  ]);
  const next = withMateSubchapters(curriculum);
  return {
    curriculum: next,
    puzzles: bindPuzzlesToCurriculum(puzzles, next.chapters),
  };
}
