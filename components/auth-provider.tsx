"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";

import { setSrsUser } from "@/lib/srs";
import { createBrowserSupabase } from "@/lib/supabase";

type AuthResult = {
  error: string | null;
  confirmEmail?: boolean;
};

type AuthValue = {
  user: User | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setReady(true);
      return;
    }

    const client = supabase;
    let cancelled = false;
    let srsUserId: string | null | undefined;

    function applyUser(next: User | null) {
      setUser((prev) => (prev?.id === next?.id ? prev : next));
    }

    async function syncSrs(next: User | null) {
      const id = next?.id ?? null;
      if (srsUserId === id) return;
      srsUserId = id;
      await setSrsUser(id);
    }

    async function boot() {
      const { data } = await client.auth.getSession();
      if (cancelled) return;
      const next = data.session?.user ?? null;
      applyUser(next);
      await syncSrs(next);
      if (!cancelled) setReady(true);
    }
    void boot();

    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED") return;
      const next = session?.user ?? null;
      void (async () => {
        await syncSrs(next);
        if (!cancelled) applyUser(next);
      })();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = createBrowserSupabase();
    if (!supabase) return { error: "Účty teď nejdou. Chybí Supabase." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? czechAuthError(error.message) : null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = createBrowserSupabase();
    if (!supabase) return { error: "Účty teď nejdou. Chybí Supabase." };
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: czechAuthError(error.message) };
    if (!data.session) return { error: null, confirmEmail: true };
    return { error: null };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const supabase = createBrowserSupabase();
    if (!supabase) return { error: "Účty teď nejdou. Chybí Supabase." };
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error ? czechAuthError(error.message) : null };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createBrowserSupabase();
    await supabase?.auth.signOut();
    await setSrsUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, signIn, signUp, updatePassword, signOut }),
    [user, ready, signIn, signUp, updatePassword, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth needs AuthProvider");
  return value;
}

function czechAuthError(message: string) {
  const text = message.toLowerCase();
  if (text.includes("invalid login")) return "Špatný e-mail nebo heslo.";
  if (text.includes("already registered")) return "Ten e-mail už účet má.";
  if (text.includes("password")) return "Heslo minimálně 6 znaků.";
  if (text.includes("email")) return "Neplatný e-mail.";
  return message;
}
