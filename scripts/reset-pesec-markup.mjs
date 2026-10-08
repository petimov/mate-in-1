/**
 * Hard-reset markup (+ ŠT markup) on Procvičení matů pěšcem bílými #4, #8, #11.
 * Usage: node scripts/reset-pesec-markup.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(name) {
  try {
    const raw = readFileSync(resolve(process.cwd(), name), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    /* missing file ok */
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE env (URL / service or anon key).");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const EMPTY_BOARD = { colors: {}, circles: {}, arrows: [] };
const EMPTY_MARKUP = { before: EMPTY_BOARD, after: EMPTY_BOARD };

function endsWithNumber(title, n) {
  return new RegExp(`(?:^|\\s)${n}\\s*$`).test(String(title ?? ""));
}

function stripReplyMarkup(replies) {
  if (!Array.isArray(replies)) return [];
  return replies.map((reply) => {
    if (!reply || typeof reply !== "object") return reply;
    return {
      ...reply,
      markup: { ...EMPTY_BOARD },
    };
  });
}

const { data: curRows, error: chErr } = await supabase
  .from("curriculum")
  .select("chapters")
  .eq("id", "main")
  .limit(1);

if (chErr) {
  console.error("curriculum:", chErr.message);
  process.exit(1);
}

const chapters = curRows?.[0]?.chapters ?? [];
const chapter = chapters.find((item) => {
  const t = String(item.title ?? "").toLowerCase();
  return (
    t.includes("pěšcem") &&
    t.includes("bílými") &&
    (t.includes("procvičení") || t.includes("procviceni"))
  );
});

if (!chapter) {
  console.error(
    "Chapter not found. Titles:",
    chapters
      .map((c) => c.title)
      .filter((t) => /pěšc|pesec|bíl|bil/i.test(String(t)))
      .join(" | ") || "(none matched)",
  );
  process.exit(1);
}

console.log(`Chapter: ${chapter.title} (${chapter.id})`);

function chapterIdFromExplanation(explanation) {
  if (!explanation || typeof explanation !== "string") return null;
  const match = explanation.match(/<!--wsh:([\s\S]*?)-->/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1] ?? "{}");
    return String(parsed.c ?? parsed.chapterId ?? "").trim() || null;
  } catch {
    return null;
  }
}

async function loadPuzzles() {
  const selects = [
    "id,title,explanation,wrong_replies,markup",
    "id,title,explanation,wrong_replies",
    "id,title,explanation,markup",
    "id,title,explanation",
  ];
  for (const select of selects) {
    const { data, error } = await supabase.from("puzzles").select(select);
    if (!error) return data ?? [];
  }
  throw new Error("Could not read puzzles table");
}

let puzzles;
try {
  puzzles = await loadPuzzles();
} catch (err) {
  console.error(String(err?.message ?? err));
  process.exit(1);
}

const inChapter = (puzzles ?? []).filter(
  (p) => chapterIdFromExplanation(p.explanation) === chapter.id,
);
const byTitle = (puzzles ?? []).filter((p) => {
  const t = String(p.title ?? "").toLowerCase();
  return t.includes("pěšcem") && t.includes("bílými");
});
const pool = inChapter.length ? inChapter : byTitle;

const targets = [4, 8, 11]
  .map((n) => {
    const hit = pool.find((p) => endsWithNumber(p.title, n));
    return { n, hit };
  })
  .filter((row) => row.hit);

if (targets.length === 0) {
  console.error(
    "No puzzles 4/8/11. Sample titles:",
    pool.slice(0, 20).map((p) => p.title).join(" | ") ||
      `no puzzles matched (total ${(puzzles ?? []).length})`,
  );
  process.exit(1);
}

function stripWsm(explanation) {
  if (!explanation || typeof explanation !== "string") return explanation;
  let next = explanation.replace(/\n?<!--wsm:[\s\S]*?-->/g, "");
  next = next.replace(/<!--wsr:([\s\S]*?)-->/g, (_, raw) => {
    try {
      const list = stripReplyMarkup(JSON.parse(raw));
      return `<!--wsr:${JSON.stringify(list)}-->`;
    } catch {
      return `<!--wsr:${raw}-->`;
    }
  });
  return next.trimEnd() || null;
}

for (const { n, hit } of targets) {
  const attempts = [
    {
      markup: EMPTY_MARKUP,
      wrong_replies: stripReplyMarkup(hit.wrong_replies),
      explanation: stripWsm(hit.explanation),
    },
    {
      wrong_replies: stripReplyMarkup(hit.wrong_replies),
      explanation: stripWsm(hit.explanation),
    },
    { explanation: stripWsm(hit.explanation) },
  ];
  let lastError = null;
  let ok = false;
  for (const payload of attempts) {
    const clean = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined),
    );
    const { error } = await supabase
      .from("puzzles")
      .update(clean)
      .eq("id", hit.id);
    if (!error) {
      ok = true;
      break;
    }
    lastError = error;
  }
  if (!ok) {
    console.error(`#${n} ${hit.title}:`, lastError?.message ?? "update failed");
    process.exit(1);
  }
  console.log(`Reset #${n}: ${hit.title} (${hit.id})`);
}

console.log("Done.");
