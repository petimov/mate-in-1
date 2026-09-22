"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { SubscribeButton } from "@/components/subscribe-button";
import { Button } from "@/components/ui/button";
import { fetchWithAuth } from "@/lib/auth-fetch";
import type { BillingView } from "@/lib/billing-types";

export function JednotazkyGate({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      setLive(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchWithAuth("/api/stripe/subscription")
      .then(async (response) => {
        const payload = (await response.json()) as {
          subscription?: BillingView | null;
        };
        if (!cancelled) setLive(Boolean(payload.subscription?.live));
      })
      .catch(() => {
        if (!cancelled) setLive(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  if (!ready || loading) {
    return <div className="min-h-0 flex-1 bg-background" />;
  }
  if (!user) {
    const next = `/ucet?next=${encodeURIComponent(pathname || "/ulohy")}`;
    return (
      <Paywall
        title="Jednotažky s účtem"
        text="Kurz je v předplatném. Nejdřív se přihlas."
        action={
          <Button asChild>
            <Link href={next}>Přihlásit</Link>
          </Button>
        }
      />
    );
  }
  if (!live) {
    return (
      <Paywall
        title="Jednotažky v předplatném"
        text="Bez předplatného nebo zkušební doby sem nejde. Kup kurz, nebo počkej na trial."
        action={<SubscribeButton />}
      />
    );
  }
  return children;
}

function Paywall({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
      <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{text}</p>
        <div className="mt-6 flex justify-center">{action}</div>
      </div>
    </div>
  );
}
