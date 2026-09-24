"use client";

import { createBrowserSupabase } from "@/lib/supabase";

let tokenCache: { token: string; at: number } | null = null;
const TOKEN_TTL_MS = 50_000;

export async function fetchWithAuth(input: string, init: RequestInit = {}) {
  const supabase = createBrowserSupabase();
  const headers = new Headers(init.headers);
  if (supabase) {
    const fresh =
      tokenCache && Date.now() - tokenCache.at < TOKEN_TTL_MS
        ? tokenCache.token
        : null;
    let token = fresh;
    if (!token) {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token ?? "";
      if (token) tokenCache = { token, at: Date.now() };
    }
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}
