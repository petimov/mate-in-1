import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  existingPuzzleKeys,
  insertPuzzleRows,
} from "@/lib/puzzle-store";
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

  const seen = await existingPuzzleKeys(supabase);
  const fresh = valid.filter((puzzle) => {
    const key = `${puzzle.fen.trim()}|${puzzle.moves[0] ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const duplicates = valid.length - fresh.length;

  if (fresh.length === 0) {
    return NextResponse.json({
      imported: 0,
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
    duplicates,
    invalid,
  });
}
