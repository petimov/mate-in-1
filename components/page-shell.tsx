import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { cn } from "@/lib/utils";

export function PageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className={cn("mx-auto w-full max-w-6xl px-4 py-10", className)}>
        {children}
      </div>
      <SiteFooter />
    </main>
  );
}
