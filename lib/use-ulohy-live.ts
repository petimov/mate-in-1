"use client";

import { useEffect, useLayoutEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { fetchWithAuth } from "@/lib/auth-fetch";
import type { BillingView } from "@/lib/billing-types";
import { readLiveCache, writeLiveCache } from "@/lib/ulohy-session";

let inflight: Promise<boolean> | null = null;

function fetchLive(userId: string): Promise<boolean> {
  if (inflight) return inflight;
  inflight = fetchWithAuth("/api/stripe/subscription")
    .then(async (response) => {
      const payload = (await response.json()) as {
        subscription?: BillingView | null;
      };
      const next = Boolean(payload.subscription?.live);
      writeLiveCache({ userId, live: next });
      return next;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useUlohyLive() {
  const { user, ready } = useAuth();
  const [live, setLive] = useState(false);

  useLayoutEffect(() => {
    const cached = readLiveCache();
    if (cached?.live) setLive(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      setLive(false);
      return;
    }
    const cached = readLiveCache();
    if (cached?.userId === user.id && cached.live) {
      setLive(true);
      return;
    }
    let cancelled = false;
    void fetchLive(user.id)
      .then((next) => {
        if (!cancelled) setLive(next);
      })
      .catch(() => {
        if (!cancelled) setLive(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  return { live, ready };
}
