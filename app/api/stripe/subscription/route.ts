import { NextResponse } from "next/server";

import { userFromBearer } from "@/lib/auth-request";
import { loadBillingForUser } from "@/lib/stripe-billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await userFromBearer(request);
  if (!user?.email) {
    return NextResponse.json({ error: "Nejdřív se přihlas." }, { status: 401 });
  }
  try {
    const subscription = await loadBillingForUser(user.id, user.email);
    return NextResponse.json({ subscription });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe nejde.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
