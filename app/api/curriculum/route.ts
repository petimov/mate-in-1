import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { DEMO_CURRICULUM, parseCurriculum } from "@/lib/curriculum";
import { loadCurriculum, saveCurriculum } from "@/lib/curriculum-store";
import { createServerSupabase } from "@/lib/supabase";
import { denyUnlessUlohyAccess } from "@/lib/ulohy-access";

export async function GET(request: Request) {
  const denied = await denyUnlessUlohyAccess(request);
  if (denied) return denied;

  const supabase = createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ curriculum: DEMO_CURRICULUM, source: "demo" });
  }
  const { curriculum, source } = await loadCurriculum(supabase);
  return NextResponse.json({ curriculum, source });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase není nastavený." },
      { status: 503 },
    );
  }

  const body = await request.json();
  const parsed = parseCurriculum(body);
  if (!parsed) {
    return NextResponse.json({ error: "Neplatná osnova." }, { status: 400 });
  }

  const { error } = await saveCurriculum(supabase, parsed);
  if (error) {
    return NextResponse.json(
      { error: curriculumSaveHint(error.message) },
      { status: 500 },
    );
  }

  return NextResponse.json({ curriculum: parsed });
}

function curriculumSaveHint(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("could not find") || m.includes("does not exist")) {
    return "Tabulka curriculum chybí. Supabase → SQL Editor → vlož supabase/schema.sql (od create table curriculum) → Run.";
  }
  if (m.includes("row-level security") || m.includes("rls")) {
    return "Zápis blokuje RLS. Do .env přidej SUPABASE_SERVICE_ROLE_KEY (Project Settings → API).";
  }
  return message;
}
