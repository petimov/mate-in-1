import Link from "next/link";

import { DownloadPgnButton } from "@/components/download-pgn-button";
import { PageShell } from "@/components/page-shell";
import { MATERIALS } from "@/lib/materials";

const KIND_LABEL = {
  pdf: "PDF list",
  plan: "Plán lekce",
  list: "Formulář",
} as const;

export default function ProTreneryPage() {
  return (
    <PageShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Pro trenéry</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Plány, pracovní listy, docházka, diplom, turnaj. Tisk → Uložit jako
            PDF. Úlohy: tah i označení polí.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/pro-trenery/tisk-uloh"
            className="rounded-md border border-border px-3 py-2 text-sm hover:border-amber-500/40"
          >
            Tisk úloh A4
          </Link>
          <DownloadPgnButton />
        </div>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {MATERIALS.map((material) => (
          <Link
            key={material.slug}
            href={`/pro-trenery/${material.slug}`}
            className="rounded-xl border border-border bg-card p-6 hover:border-amber-500/40"
          >
            <p className="text-xs uppercase tracking-wide text-amber-500/80">
              {KIND_LABEL[material.kind]} · {material.audience}
            </p>
            <h2 className="mt-2 text-xl font-semibold">{material.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{material.summary}</p>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
