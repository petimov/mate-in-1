import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { userFromBearer } from "@/lib/auth-request";
import {
  isLiveAccess,
  loadStoredSubscriptions,
  rankSubscriptions,
} from "@/lib/billing-store";

export async function denyUnlessUlohyAccess(
  request: Request,
): Promise<NextResponse | null> {
  const [admin, user] = await Promise.all([
    isAdminAuthenticated(),
    userFromBearer(request),
  ]);
  if (admin) return null;
  if (!user?.email) {
    return NextResponse.json({ error: "Nejdřív se přihlas." }, { status: 401 });
  }
  const stored = rankSubscriptions(await loadStoredSubscriptions(user.id))[0];
  if (stored && isLiveAccess(stored.status, stored.current_period_end)) {
    return null;
  }
  return NextResponse.json(
    { error: "Jednotažky jsou v předplatném." },
    { status: 402 },
  );
}
