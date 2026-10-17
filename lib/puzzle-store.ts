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

const LIST_PAGE = 1000;
/** Sloupce, které se při insertu nesmí zahodit (retry missing column). */
const INSERT_KEEP = new Set(["title", "fen", "moves", "chapter_id", "sort"]);

export async function listPuzzles(
  supabase: SupabaseClient,
): Promise<{ puzzles: Puzzle[]; source: "supabase" | "demo" }> {
  for (const select of SELECTS) {
    const rows: PuzzleRow[] = [];
    let from = 0;
    let selectFailed = false;
    for (;;) {
      const to = from + LIST_PAGE - 1;
      const { data, error } = await supabase
        .from("puzzles")
        .select(select)
        .order("created_at", { ascending: true })
        .range(from, to);
      if (error || !data) {
        selectFailed = from === 0;
        break;
      }
      rows.push(...(data as unknown as PuzzleRow[]));
      if (data.length < LIST_PAGE) break;
      from += LIST_PAGE;
    }
    if (selectFailed) continue;
    return {
      puzzles: sortPuzzles(rows.map(mapPuzzleRow)),
      source: rows.length > 0 ? "supabase" : "demo",
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
      .select("id,title,fen,moves,chapter_id,sort,hint,explanation,video_url");

    if (!error) {
      return { data: (data as unknown as PuzzleRow[] | null) ?? [], error: null };
    }

    const column = missingColumn(error.message);
    if (column === "chapter_id") {
      return {
        data: [],
        error: {
          message:
            "V tabulce puzzles chybí sloupec chapter_id. V Supabase → SQL Editor spusť:\n" +
            "alter table public.puzzles add column if not exists chapter_id text;\n" +
            "alter table public.puzzles add column if not exists sort int not null default 0;",
        },
      };
    }
    if (!column || INSERT_KEEP.has(column)) return { data: [], error };

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

    if (
      existingId &&
      (error?.code === "PGRST116" ||
        /JSON object requested|0 rows/i.test(message))
    ) {
      const inserted = await supabase
        .from("puzzles")
        .insert({ ...payload, id: existingId })
        .select()
        .single();
      if (!inserted.error && inserted.data) {
        return { data: inserted.data as unknown as PuzzleRow, error: null };
      }
      const insertColumn = missingColumn(inserted.error?.message ?? "");
      if (insertColumn) {
        payload = dropColumn(payload, insertColumn);
        continue;
      }
    }

    const column = missingColumn(message);
    if (!column) {
      return { data: null, error: error ?? { message: "Úlohu nešlo uložit." } };
    }
    payload = dropColumn(payload, column);
  }

  return { data: null, error: { message: "Úlohu nešlo uložit." } };
}

const DELETE_BATCH = 80;

export async function deletePuzzleRows(
  supabase: SupabaseClient,
  ids: string[],
) {
  if (!ids.length) return { error: null, deleted: 0 };
  let deleted = 0;
  for (let i = 0; i < ids.length; i += DELETE_BATCH) {
    const chunk = ids.slice(i, i + DELETE_BATCH);
    const { error, count } = await supabase
      .from("puzzles")
      .delete({ count: "exact" })
      .in("id", chunk);
    if (error) return { error, deleted };
    deleted += count ?? chunk.length;
  }
  return { error: null, deleted };
}

export function puzzleKey(fen: string, move?: string | null) {
  return `${fen.trim()}|${move ?? ""}`;
}

export async function existingPuzzleIndex(supabase: SupabaseClient) {
  const map = new Map<string, { id: string; chapterId: string | null }>();
  let from = 0;
  for (;;) {
    const to = from + LIST_PAGE - 1;
    const { data, error } = await supabase
      .from("puzzles")
      .select("id,fen,moves,chapter_id")
      .range(from, to);
    if (error || !data) break;
    for (const row of data) {
      const move = ((row.moves as string[] | null) ?? [])[0] ?? "";
      map.set(puzzleKey(row.fen as string, move), {
        id: row.id as string,
        chapterId: (row.chapter_id as string | null) ?? null,
      });
    }
    if (data.length < LIST_PAGE) break;
    from += LIST_PAGE;
  }
  return map;
}
