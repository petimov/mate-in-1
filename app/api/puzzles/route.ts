import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { DEMO_PUZZLES, isUuid, mapPuzzleRow, validatePuzzleInput } from "@/lib/puzzles";
import { deletePuzzleRows, listPuzzles, savePuzzleRow } from "@/lib/puzzle-store";
import { createServerSupabase } from "@/lib/supabase";
import type { Puzzle, PuzzleKind } from "@/lib/types";
import { denyUnlessUlohyAccess } from "@/lib/ulohy-access";

export async function GET(request: Request) {
  const denied = await denyUnlessUlohyAccess(request);
  if (denied) return denied;

  const supabase = createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ puzzles: DEMO_PUZZLES, source: "demo" });
  }

  const { puzzles, source } = await listPuzzles(supabase);
  return NextResponse.json({ puzzles, source });
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

  const body = (await request.json()) as Partial<Puzzle> & { id?: string };
  const kind: PuzzleKind = body.kind === "squares" ? "squares" : "move";
  const input = {
    title: body.title?.trim() ?? "",
    fen: body.fen?.trim() ?? "",
    kind,
    moves: body.moves ?? [],
    squares: body.squares ?? [],
    theme: body.theme,
    level: body.level,
    hint: body.hint,
    source: body.source,
    explanation: body.explanation,
    videoUrl: body.videoUrl,
    wrongReplies: body.wrongReplies,
    markup: body.markup,
    chapterId: body.chapterId ?? null,
    sort: typeof body.sort === "number" ? body.sort : 0,
  };
  const invalid = validatePuzzleInput(input);
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 });
  }

  const { data, error } = await savePuzzleRow(
    supabase,
    input,
    isUuid(body.id) ? body.id : undefined,
  );
  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Úlohu nešlo uložit." },
      { status: 500 },
    );
  }

  return NextResponse.json({ puzzle: mapPuzzleRow(data) });
}

export async function DELETE(request: Request) {
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

  const body = (await request.json()) as { ids?: string[] };
  const ids = Array.from(new Set((body.ids ?? []).filter(isUuid)));
  if (!ids.length) {
    return NextResponse.json({ error: "Nic ke smazání." }, { status: 400 });
  }

  const { error } = await deletePuzzleRows(supabase, ids);
  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Úlohy nešlo smazat." },
      { status: 500 },
    );
  }

  return NextResponse.json({ deleted: ids.length });
}
