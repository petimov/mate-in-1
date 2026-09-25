import type { ReactNode } from "react";

import { AdminTheme } from "@/components/admin-theme";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminTheme>
      <div className="min-h-[calc(100dvh-3rem)]">
        {children}
      </div>
    </AdminTheme>
  );
}
