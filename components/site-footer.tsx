import Link from "next/link";

import { SCHOOL } from "@/lib/school";

export function SiteFooter() {
  return (
    <footer className="print:hidden border-t border-border bg-header">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-muted-foreground sm:grid-cols-3">
        <div>
          <p className="font-semibold text-foreground">{SCHOOL.name}</p>
          <p className="mt-2">{SCHOOL.tagline}</p>
        </div>
        <div>
          <p>{SCHOOL.address}</p>
          <p className="mt-1">{SCHOOL.phone}</p>
          <p>{SCHOOL.email}</p>
        </div>
        <div className="flex flex-col gap-1">
          <Link href="/ulohy" className="hover:text-foreground">
            Jednotažky
          </Link>
          <Link href="/ulohy/trenink" className="hover:text-foreground">
            Trénink
          </Link>
          <Link href="/ucet" className="hover:text-foreground">
            Nastavení
          </Link>
          <Link href="/pro-trenery" className="hover:text-foreground">
            Pro trenéry
          </Link>
        </div>
      </div>
    </footer>
  );
}
