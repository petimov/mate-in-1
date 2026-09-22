"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import {
  getSrsSnapshot,
  subscribeSrs,
  summarizeSrs,
  type SrsMap,
} from "@/lib/srs";

const EMPTY_SRS: SrsMap = {};

export function useSrsMap(): SrsMap {
  return useSyncExternalStore(subscribeSrs, getSrsSnapshot, () => EMPTY_SRS);
}

export function SrsStats({ puzzleIds }: { puzzleIds: string[] }) {
  const { user, ready } = useAuth();
  const map = useSrsMap();
  if (!ready || !user || puzzleIds.length === 0) return null;
  const stats = summarizeSrs(puzzleIds, map);
  if (stats.due === 0 && stats.new === 0) {
    return (
      <p className="mt-1 text-xs text-muted-foreground">Hotovo na dnes</p>
    );
  }
  return (
    <p className="mt-1 text-xs">
      {stats.due > 0 ? (
        <span className="text-amber-600 dark:text-amber-400">
          {stats.due} k opakování
        </span>
      ) : null}
      {stats.due > 0 && stats.new > 0 ? (
        <span className="text-muted-foreground"> · </span>
      ) : null}
      {stats.new > 0 ? (
        <span className="text-muted-foreground">{stats.new} ke studiu</span>
      ) : null}
    </p>
  );
}

export function SrsTrainBanner({
  puzzleIds,
  href,
}: {
  puzzleIds: string[];
  href: string;
}) {
  const { user, ready } = useAuth();
  const map = useSrsMap();
  if (!ready) return null;
  if (!user) {
    return (
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Opakování jen s účtem. A jen úlohy, které už jsi studoval.
        </p>
        <Button asChild variant="outline">
          <Link href="/ucet?next=%2Fulohy">Přihlásit</Link>
        </Button>
      </div>
    );
  }
  if (puzzleIds.length === 0) return null;
  const stats = summarizeSrs(puzzleIds, map);
  if (stats.due === 0) return null;
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-sm">
        <span className="font-medium text-amber-600 dark:text-amber-400">
          {stats.due} k opakování
        </span>
        <span className="text-muted-foreground"> · jen už studované</span>
      </p>
      <Button asChild>
        <Link href={href}>Trénovat</Link>
      </Button>
    </div>
  );
}
