"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const SECONDS = 5;

export function PlatbaUspechRedirect() {
  const [left, setLeft] = useState(SECONDS);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setLeft((n) => {
        if (n <= 1) {
          window.clearInterval(tick);
          window.location.replace("/ulohy");
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, []);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-semibold tracking-tight">Díky</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Platba prošla. Předplatné Jednotažek běží. Za chvíli jdeme na úlohy.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {left > 0 ? `Přesměrování za ${left} s…` : "Přesměrování…"}
      </p>
      <Button asChild className="mt-6">
        <Link href="/ulohy">K úlohám hned</Link>
      </Button>
    </div>
  );
}
