import { redirect } from "next/navigation";

import { AdminPuzzleForm } from "@/components/admin-puzzle-form";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  return (
    <main className="px-4 py-3">
      <h1 className="mx-auto mb-3 w-full max-w-[110rem] text-2xl font-semibold tracking-tight">
        Úlohy školy
      </h1>
      <AdminPuzzleForm />
    </main>
  );
}
