"use client";

import { useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { createBrowserSupabase } from "@/lib/supabase";

export function SubscribeButton() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createBrowserSupabase();
      if (!supabase) {
        setError("Účty teď nejdou.");
        return;
      }
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setError("Relace vypršela. Přihlas se znovu.");
        return;
      }
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        setError(payload.error || "Checkout nejde.");
        return;
      }
      window.location.assign(payload.url);
    } catch {
      setError("Síť. Zkus znovu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button type="button" onClick={() => void startCheckout()} disabled={busy}>
        {busy ? "…" : "Předplatit Jednotažky"}
      </Button>
      {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
    </div>
  );
}
