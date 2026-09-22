import { redirect } from "next/navigation";

import { AdminPuzzleForm } from "@/components/admin-puzzle-form";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-4 py-8">
      <h1 className="mx-auto mb-6 max-w-[90rem] text-2xl font-semibold tracking-tight">
        Úlohy školy
      </h1>
      <AdminPuzzleForm />
    </main>
  );
}
