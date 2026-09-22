import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

const BROWSER_KEY = "__sachovaBrowserSupabase";

type BrowserCache = typeof globalThis & {
  [BROWSER_KEY]?: SupabaseClient | null;
};

export function createBrowserSupabase(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  const cache = globalThis as BrowserCache;
  if (BROWSER_KEY in cache) return cache[BROWSER_KEY] ?? null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    cache[BROWSER_KEY] = null;
    return null;
  }

  cache[BROWSER_KEY] = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "sachova-skola-auth",
    },
  });
  return cache[BROWSER_KEY] ?? null;
}

export function createServerSupabase(): SupabaseClient | null {
  if (typeof window !== "undefined") return createBrowserSupabase();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
