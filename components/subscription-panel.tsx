"use client";

import { useEffect, useState } from "react";

import { SubscribeButton } from "@/components/subscribe-button";
import { createBrowserSupabase } from "@/lib/supabase";
import type { BillingView } from "@/lib/billing-types";

export function SubscriptionPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sub, setSub] = useState<BillingView | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const supabase = createBrowserSupabase();
        if (!supabase) {
          if (!cancelled) setError("Účty teď nejdou.");
          return;
        }
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          if (!cancelled) setError("Relace vypršela.");
          return;
        }
        const response = await fetch("/api/stripe/subscription", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = (await response.json()) as {
          subscription?: BillingView | null;
          error?: string;
        };
        if (!response.ok) {
          if (!cancelled) setError(payload.error || "Nejde načíst předplatné.");
          return;
        }
        if (!cancelled) setSub(payload.subscription ?? null);
      } catch {
        if (!cancelled) setError("Síť. Obnov stránku.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="mt-2 text-sm text-muted-foreground">Načítám předplatné…</p>;
  }
  if (error) {
    return <p className="mt-2 text-sm text-red-500">{error}</p>;
  }
  if (!sub) {
    return (
      <>
        <p className="mt-2 text-sm text-muted-foreground">
          Jednotažky. Zatím bez předplatného.
        </p>
        <div className="mt-4">
          <SubscribeButton />
        </div>
      </>
    );
  }

  return (
    <div className="mt-3 grid gap-1 text-sm">
      <p>
        <span className="font-medium">{sub.plan}</span>
        <span className="text-muted-foreground"> · {sub.statusLabel}</span>
      </p>
      {sub.priceLabel ? (
        <p className="text-muted-foreground">{sub.priceLabel}</p>
      ) : null}
      {sub.trialLabel ? <p>{sub.trialLabel}</p> : null}
      {sub.periodLabel ? (
        <p className="text-muted-foreground">{sub.periodLabel}</p>
      ) : null}
      {sub.cancelNote ? (
        <p className="text-muted-foreground">{sub.cancelNote}</p>
      ) : null}
      {!sub.live ? (
        <div className="mt-4">
          <SubscribeButton />
        </div>
      ) : null}
    </div>
  );
}
