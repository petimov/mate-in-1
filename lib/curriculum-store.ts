import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEMO_CURRICULUM,
  parseCurriculum,
  withMateSubchapters,
  type Curriculum,
} from "@/lib/curriculum";

export async function loadCurriculum(
  supabase: SupabaseClient,
): Promise<{ curriculum: Curriculum; source: "supabase" | "demo" }> {
  const { data, error } = await supabase
    .from("curriculum")
    .select("courses,chapters")
    .eq("id", "main")
    .maybeSingle();

  if (error || !data) {
    return { curriculum: DEMO_CURRICULUM, source: "demo" };
  }

  const parsed = parseCurriculum(data);
  const base = parsed ?? DEMO_CURRICULUM;
  const curriculum = withMateSubchapters(base);
  const grew = parsed && curriculum.chapters.length !== parsed.chapters.length;
  const renamed =
    parsed &&
    curriculum.courses.some(
      (course, index) => course.title !== parsed.courses[index]?.title,
    );
  if (grew || renamed) {
    await saveCurriculum(supabase, curriculum);
  }
  return {
    curriculum,
    source: parsed ? "supabase" : "demo",
  };
}

export async function saveCurriculum(
  supabase: SupabaseClient,
  curriculum: Curriculum,
) {
  const payload = {
    id: "main",
    courses: curriculum.courses,
    chapters: curriculum.chapters,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("curriculum").upsert(payload, {
    onConflict: "id",
  });
  return { error };
}
