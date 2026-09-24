import { JednotazkyGate } from "@/components/jednotazky-gate";
import type { ReactNode } from "react";

export default function UlohyLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <JednotazkyGate>{children}</JednotazkyGate>;
}
