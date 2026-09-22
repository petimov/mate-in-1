import { cookies } from "next/headers";

import { ADMIN_COOKIE, sessionToken } from "@/lib/admin-session";

export async function isAdminAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(ADMIN_COOKIE)?.value === sessionToken();
}
