import type { SupabaseClient } from "@supabase/supabase-js";

import { isUuid, mapPuzzleRow, puzzleRowPayload } from "@/lib/puzzles";
import { sortPuzzles } from "@/lib/curriculum";
import type { Puzzle, PuzzleInput, PuzzleRow } from "@/lib/types";

const SELECTS = [
  "id,title,fen,moves,kind,squares,theme,level,hint,explanation,source,video_url,wrong_replies,markup,chapter_id,sort",
  "id,title,fen,moves,kind,squares,theme,level,hint,explanation,video_url,wrong_replies,markup,chapter_id,sort",
  "id,title,fen,moves,kind,squares,theme,level,hint,explanation,video_url,wrong_replies,markup",
  "id,title,fen,moves,kind,squares,theme,level,hint,explanation,video_url,wrong_replies",
  "id,title,fen,moves,kind,squares,theme,level,hint,explanation,video_url",
  "id,title,fen,moves,kind,squares,hint,explanation,video_url",
  "id,title,fen,moves,hint,explanation,video_url",
];

function missingColumn(message: string): string | null {
  const match =
    message.match(/Could not find the '([^']+)' column/i) ||
    message.match(/column "([^"]+)" of relation/i);
  return match?.[1] ?? null;
}

function dropColumn<T extends Record<string, unknown>>(
  row: T,
  column: string,
): T {
  const next = { ...row };
  delete next[column];
  return next;
}

export async function listPuzzles(
  supabase: SupabaseClient,
): Promise<{ puzzles: Puzzle[]; source: "supabase" | "demo" }> {
  for (const select of SELECTS) {
    const { data, error } = await supabase
      .from("puzzles")
      .select(select)
      .order("created_at", { ascending: true });
    if (error || !data) continue;
    return {
      puzzles: sortPuzzles((data as unknown as PuzzleRow[]).map(mapPuzzleRow)),
      source: data.length > 0 ? "supabase" : "demo",
    };
  }
  return { puzzles: [], source: "demo" };
}

export async function insertPuzzleRows(
  supabase: SupabaseClient,
  inputs: PuzzleInput[],
) {
  let rows = inputs.map((input) => puzzleRowPayload(input) as Record<string, unknown>);

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const { data, error } = await supabase
      .from("puzzles")
      .insert(rows)
      .select("id,title,fen,moves,hint,explanation,video_url");

    if (!error) {
      return { data: (data as unknown as PuzzleRow[] | null) ?? [], error: null };
    }

    const column = missingColumn(error.message);
    if (!column) return { data: [], error };

    rows = rows.map((row) => dropColumn(row, column));
  }

  return { data: [], error: { message: "Úlohu nešlo uložit." } };
}

export async function savePuzzleRow(
  supabase: SupabaseClient,
  input: PuzzleInput,
  id?: string,
) {
  let payload = puzzleRowPayload(input) as Record<string, unknown>;
  let existingId = isUuid(id) ? id : undefined;

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const query = existingId
      ? supabase.from("puzzles").update(payload).eq("id", existingId).select().single()
      : supabase.from("puzzles").insert(payload).select().single();

    const { data, error } = await query;
    if (!error && data) {
      return { data: data as unknown as PuzzleRow, error: null };
    }

    const message = error?.message ?? "";
    if (existingId && /invalid input syntax for type uuid/i.test(message)) {
      existingId = undefined;
      continue;
    }

    const column = missingColumn(message);
    if (!column) {
      return { data: null, error: error ?? { message: "Úlohu nešlo uložit." } };
    }
    payload = dropColumn(payload, column);
  }

  return { data: null, error: { message: "Úlohu nešlo uložit." } };
}

export async function deletePuzzleRows(
  supabase: SupabaseClient,
  ids: string[],
) {
  if (!ids.length) return { error: null };
  const { error } = await supabase.from("puzzles").delete().in("id", ids);
  return { error };
}

export function puzzleKey(fen: string, move?: string | null) {
  return `${fen.trim()}|${move ?? ""}`;
}

export async function existingPuzzleIndex(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("puzzles")
    .select("id,fen,moves,chapter_id");
  const map = new Map<string, { id: string; chapterId: string | null }>();
  if (error || !data) return map;
  for (const row of data) {
    const move = ((row.moves as string[] | null) ?? [])[0] ?? "";
    map.set(puzzleKey(row.fen as string, move), {
      id: row.id as string,
      chapterId: (row.chapter_id as string | null) ?? null,
    });
  }
  return map;
}
