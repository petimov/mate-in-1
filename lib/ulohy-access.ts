import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { userFromBearer } from "@/lib/auth-request";
import { loadBillingForUser } from "@/lib/stripe-billing";

export async function denyUnlessUlohyAccess(
  request: Request,
): Promise<NextResponse | null> {
  if (await isAdminAuthenticated()) return null;
  const user = await userFromBearer(request);
  if (!user?.email) {
    return NextResponse.json({ error: "Nejdřív se přihlas." }, { status: 401 });
  }
  try {
    const billing = await loadBillingForUser(user.id, user.email);
    if (billing?.live) return null;
  } catch {
    return NextResponse.json({ error: "Předplatné nejde ověřit." }, { status: 502 });
  }
  return NextResponse.json(
    { error: "Jednotažky jsou v předplatném." },
    { status: 402 },
  );
}
