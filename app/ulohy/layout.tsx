import type { ReactNode } from "react";

import { JednotazkyGate } from "@/components/jednotazky-gate";
import { UlohyRouter } from "@/components/ulohy-router";

export default function UlohyLayout({ children: _children }: { children: ReactNode }) {
  return (
    <JednotazkyGate>
      <UlohyRouter />
    </JednotazkyGate>
  );
}
