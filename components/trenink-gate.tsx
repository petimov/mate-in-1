"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";

export function TreninkGate({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="flex-1 bg-background" />;
  if (user) return children;
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center">
        <h1 className="text-xl font-semibold">Trénink s účtem</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Opakování jen po přihlášení. A jen úlohy, které už jsi v kapitole
          studoval.
        </p>
        <Button asChild className="mt-6">
          <Link href="/ucet?next=%2Fulohy">Přihlásit</Link>
        </Button>
      </div>
    </div>
  );
}
