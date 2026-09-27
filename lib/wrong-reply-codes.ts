export type ReplyVoice = "plain";

type ReplyVoices = Record<ReplyVoice, string>;

function line(plain: string): ReplyVoices {
  return { plain };
}

/** Max 3 letters. Voice/language can grow later without touching puzzles. */
export const WRONG_REPLY_CODES: Record<string, ReplyVoices> = {
  u: line("Toto není mat, protože černý král by mohl utéct na toto pole."),
  ub: line("Toto není mat, protože bílý král by mohl utéct na toto pole."),
  vks: line("Toto není mat, protože černý může našeho střelce vzít králem."),
  vkv: line("Toto není mat, protože černý může naši věž vzít králem."),
  vkd: line("Toto není mat, protože černý může naši dámu vzít králem."),
  vkj: line("Toto není mat, protože černý může našeho jezdce vzít králem."),
  vkp: line("Toto není mat, protože černý může našeho pěšce vzít králem."),
  bks: line("Toto není mat, protože bílý může našeho střelce vzít králem."),
  bkv: line("Toto není mat, protože bílý může naši věž vzít králem."),
  bkd: line("Toto není mat, protože bílý může naši dámu vzít králem."),
  bkj: line("Toto není mat, protože bílý může našeho jezdce vzít králem."),
  bkp: line("Toto není mat, protože bílý může našeho pěšce vzít králem."),
  vd: line("Toto není mat, protože soupeř může vzít naši dámu."),
  vv: line("Toto není mat, protože soupeř může vzít naši věž."),
  vs: line("Toto není mat, protože soupeř může vzít našeho střelce."),
  vj: line("Toto není mat, protože soupeř může vzít našeho jezdce."),
  vp: line("Toto není mat, protože soupeř může vzít našeho pěšce."),
  k: line("Toto není mat, protože soupeř může šach přerušit."),
  n: line("Toto není mat, protože to není šach."),
};

export function normalizeReplyCode(raw: string): string {
  return raw.replace(/[^a-zA-Z]/g, "").slice(0, 3).toLowerCase();
}

export function replyCodeForInput(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (WRONG_REPLY_CODES[value.toLowerCase()]) return value.toLowerCase();
  if (/^[a-z]{1,3}$/i.test(value)) return value.toLowerCase();
  return "";
}

export function resolveWrongReplyText(
  raw: string | undefined,
  voice: ReplyVoice = "plain",
): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  const coded = WRONG_REPLY_CODES[value.toLowerCase()];
  if (coded) return coded[voice];
  if (/^[a-z]{1,3}$/i.test(value)) return "";
  return value;
}
