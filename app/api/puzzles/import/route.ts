import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { existingPuzzleIndex, insertPuzzleRows } from "@/lib/puzzle-store";
import { validatePuzzleInput } from "@/lib/puzzles";
import { createServerSupabase } from "@/lib/supabase";
import type { PuzzleInput } from "@/lib/types";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { puzzles?: PuzzleInput[] };
  const incoming = body.puzzles ?? [];
  if (incoming.length === 0) {
    return NextResponse.json({ error: "No puzzles to import." }, { status: 400 });
  }

  const valid: PuzzleInput[] = [];
  const invalid: { title: string; error: string }[] = [];

  for (const puzzle of incoming) {
    const error = validatePuzzleInput(puzzle);
    if (error) {
      invalid.push({ title: puzzle.title || "Untitled", error });
      continue;
    }
    valid.push(puzzle);
  }

  const seen = await existingPuzzleIndex(supabase);
  const fresh: PuzzleInput[] = [];
  const moves: { id: string; chapterId: string; sort: number }[] = [];
  let duplicates = 0;

  for (const puzzle of valid) {
    const key = `${puzzle.fen.trim()}|${puzzle.moves[0] ?? ""}`;
    const found = seen.get(key);
    if (!found) {
      seen.set(key, { id: "", chapterId: puzzle.chapterId ?? null });
      fresh.push(puzzle);
      continue;
    }
    const chapterId = puzzle.chapterId?.trim() || null;
    if (chapterId && found.chapterId !== chapterId && found.id) {
      moves.push({
        id: found.id,
        chapterId,
        sort: puzzle.sort ?? 0,
      });
      found.chapterId = chapterId;
      continue;
    }
    duplicates += 1;
  }

  let moved = 0;
  for (const item of moves) {
    const { error } = await supabase
      .from("puzzles")
      .update({ chapter_id: item.chapterId, sort: item.sort })
      .eq("id", item.id);
    if (!error) moved += 1;
  }

  if (fresh.length === 0) {
    return NextResponse.json({
      imported: 0,
      moved,
      duplicates,
      invalid,
    });
  }

  const { data, error } = await insertPuzzleRows(supabase, fresh);
  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Import failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    imported: data.length || fresh.length,
    moved,
    duplicates,
    invalid,
  });
}
