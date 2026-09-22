import { NextResponse } from "next/server";
import type Stripe from "stripe";

import {
  claimStripeEvent,
  invoiceSubscriptionId,
  upsertSubscription,
} from "@/lib/billing-store";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HANDLED: ReadonlySet<Stripe.Event.Type> = new Set([
  "checkout.session.completed",
  "checkout.session.expired",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.trial_will_end",
  "invoice.paid",
  "invoice.payment_failed",
]);

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Chybí stripe-signature." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      getStripeWebhookSecret(),
    );
  } catch {
    return NextResponse.json({ error: "Neplatný podpis." }, { status: 400 });
  }

  if (!HANDLED.has(event.type)) {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  try {
    const claimed = await claimStripeEvent(event.id, event.type);
    if (claimed === "dup") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    await persistEvent(event);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook selhal.";
    console.error("[stripe webhook]", event.id, event.type, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function persistEvent(event: Stripe.Event) {
  const stripe = getStripe();
  const userId = userIdFromEvent(event);

  if (event.type.startsWith("customer.subscription.")) {
    const sub = event.data.object as Stripe.Subscription;
    await upsertSubscription(sub, userId);
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const subId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
    if (!subId) return;
    const sub = await stripe.subscriptions.retrieve(subId, {
      expand: ["items.data.price"],
    });
    await upsertSubscription(sub, userId);
    return;
  }

  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const subId = invoiceSubscriptionId(invoice);
    if (!subId) return;
    const sub = await stripe.subscriptions.retrieve(subId, {
      expand: ["items.data.price"],
    });
    await upsertSubscription(
      sub,
      userId ?? sub.metadata?.supabase_user_id ?? null,
    );
  }
}

function userIdFromEvent(event: Stripe.Event): string | null {
  const object = event.data.object as {
    client_reference_id?: string | null;
    metadata?: Record<string, string>;
    subscription_details?: { metadata?: Record<string, string> };
    customer?: string | Stripe.Customer | Stripe.DeletedCustomer;
  };
  return (
    object.metadata?.supabase_user_id ||
    object.client_reference_id ||
    object.subscription_details?.metadata?.supabase_user_id ||
    null
  );
}
