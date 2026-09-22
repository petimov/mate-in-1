import { JednotazkyGate } from "@/components/jednotazky-gate";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default function UlohyLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <JednotazkyGate>{children}</JednotazkyGate>;
}
