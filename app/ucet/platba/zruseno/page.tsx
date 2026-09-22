import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

export default function PlatbaZrusenoPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight">Platba zrušená</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Nic nestrhli. Můžeš zkusit znovu v nastavení.
        </p>
        <Button asChild className="mt-6">
          <Link href="/ucet">Nastavení</Link>
        </Button>
      </div>
    </PageShell>
  );
}
