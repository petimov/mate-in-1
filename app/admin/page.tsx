import { redirect } from "next/navigation";

import { AdminPuzzleForm } from "@/components/admin-puzzle-form";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <AdminPuzzleForm />
    </main>
  );
}
