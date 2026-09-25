import type { ReactNode } from "react";

import { AdminTheme } from "@/components/admin-theme";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminTheme>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </AdminTheme>
  );
}
