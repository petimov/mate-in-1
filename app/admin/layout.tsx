import type { ReactNode } from "react";

import { AdminTheme } from "@/components/admin-theme";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminTheme>{children}</AdminTheme>;
}
