import {
  normalizeUci,
  safeChess,
} from "@/lib/chess";
import type { WrongReply } from "@/lib/types";

const MAX_SUGGEST = 24;

/**
 * Předpřipravení ŠT: legální tahy kromě řešení.
 * Preference: šachy → braní → zbytek. passes=0 (program).
 */
export function suggestWrongReplies(
  fen: string,
  solutionUci: string,
  existing: WrongReply[] = [],
): WrongReply[] {
  const game = safeChess(fen);
  if (!game) return existing;
  const solution = normalizeUci(solutionUci);
  type Ranked = { uci: string; rank: number };
  const ranked: Ranked[] = [];
  try {
    for (const move of game.moves({ verbose: true })) {
      let uci = `${move.from}${move.to}`;
      if (move.promotion) uci += move.promotion;
      uci = normalizeUci(uci);
      if (!uci || uci === solution) continue;
      const check = move.san.includes("+") || move.san.includes("#");
      const capture = move.isCapture();
      ranked.push({
        uci,
        rank: check ? 0 : capture ? 1 : 2,
      });
    }
  } catch {
    return existing;
  }
  ranked.sort((a, b) => a.rank - b.rank || a.uci.localeCompare(b.uci));
  const seen = new Set<string>();
  const ucis: string[] = [];
  for (const item of ranked) {
    if (seen.has(item.uci)) continue;
    seen.add(item.uci);
    ucis.push(item.uci);
    if (ucis.length >= MAX_SUGGEST) break;
  }
  const byAnswer = new Map(
    existing
      .filter((row) => row.answer)
      .map((row) => [normalizeUci(row.answer), row] as const),
  );
  return ucis.map((uci) => {
    const prev = byAnswer.get(uci);
    return prev
      ? { ...prev, answer: uci }
      : { answer: uci, text: "" };
  });
}
