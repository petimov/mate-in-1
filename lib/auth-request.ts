import { createClient, type User } from "@supabase/supabase-js";

const userMemo = new Map<string, { user: User; at: number }>();
const USER_TTL_MS = 120_000;

export async function userFromBearer(request: Request): Promise<User | null> {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  const hit = userMemo.get(token);
  if (hit && Date.now() - hit.at < USER_TTL_MS) return hit.user;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  userMemo.set(token, { user: data.user, at: Date.now() });
  return data.user;
}
