import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { userFromBearer } from "@/lib/auth-request";
import {
  appOrigin,
  BILLING_PLAN,
  getStripe,
  getStripePriceId,
  getTrialDays,
} from "@/lib/stripe";
import { isLiveAccess, loadStoredSubscriptions, rankSubscriptions } from "@/lib/billing-store";
import {
  findStripeCustomerId,
  isLiveStatus,
} from "@/lib/stripe-billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await userFromBearer(request);
  if (!user?.email) {
    return NextResponse.json({ error: "Nejdřív se přihlaš." }, { status: 401 });
  }

  let stripe: Stripe;
  let priceId: string;
  let origin: string;
  try {
    stripe = getStripe();
    priceId = getStripePriceId();
    origin = appOrigin(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe nejde.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  try {
    const stored = rankSubscriptions(await loadStoredSubscriptions(user.id))[0];
    if (stored && isLiveAccess(stored.status, stored.current_period_end)) {
      return NextResponse.json(
        { error: "Předplatné už běží.", code: "already_subscribed" },
        { status: 409 },
      );
    }

    const customerId =
      stored?.stripe_customer_id ??
      (await findStripeCustomerId(stripe, user.id, user.email)) ??
      (
        await stripe.customers.create({
          email: user.email,
          metadata: {
            supabase_user_id: user.id,
            plan: BILLING_PLAN,
          },
        })
      ).id;

    const already = await hasLiveSubscription(stripe, customerId);
    if (already) {
      return NextResponse.json(
        { error: "Předplatné už běží.", code: "already_subscribed" },
        { status: 409 },
      );
    }

    const trial = getTrialDays();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: user.id,
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/ucet/platba/uspech?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/ucet/platba/zruseno`,
      metadata: {
        supabase_user_id: user.id,
        plan: BILLING_PLAN,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan: BILLING_PLAN,
        },
        ...(trial ? { trial_period_days: trial } : {}),
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Checkout URL neni." }, { status: 502 });
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout selhal.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

async function hasLiveSubscription(
  stripe: Stripe,
  customerId: string,
): Promise<boolean> {
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });
  return subs.data.some((sub) => isLiveStatus(sub.status));
}
