import { Suspense, type ReactNode } from "react";

import { JednotazkyGate } from "@/components/jednotazky-gate";
import { UlohyRouter } from "@/components/ulohy-router";

export default function UlohyLayout({ children: _children }: { children: ReactNode }) {
  return (
    <JednotazkyGate>
      <Suspense fallback={<div className="min-h-0 flex-1 bg-background" />}>
        <UlohyRouter />
      </Suspense>
    </JednotazkyGate>
  );
}
