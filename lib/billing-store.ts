import type Stripe from "stripe";

import { BILLING_PLAN } from "@/lib/stripe";
import { createServerSupabase } from "@/lib/supabase";

export type SubscriptionRow = {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string;
  status: string;
  price_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_end: string | null;
  plan: string | null;
};

export function periodEndUnix(sub: Stripe.Subscription): number {
  const item = sub.items?.data?.[0];
  const fromItem = item?.current_period_end;
  const fromSub = (sub as { current_period_end?: number }).current_period_end;
  return fromItem ?? fromSub ?? 0;
}

export function customerIdOf(
  value: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "id" in value) return value.id;
  return null;
}

export function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const legacy = (
    invoice as { subscription?: string | Stripe.Subscription | null }
  ).subscription;
  if (typeof legacy === "string") return legacy;
  if (legacy && typeof legacy === "object" && "id" in legacy) return legacy.id;
  const parent = (
    invoice as {
      parent?: { subscription_details?: { subscription?: string | null } };
    }
  ).parent;
  return parent?.subscription_details?.subscription ?? null;
}

function isoFromUnix(unix: number | null | undefined): string | null {
  if (!unix) return null;
  return new Date(unix * 1000).toISOString();
}

export async function claimStripeEvent(
  id: string,
  type: string,
): Promise<"new" | "dup"> {
  const supabase = createServerSupabase();
  if (!supabase) throw new Error("Chybí Supabase service role.");
  const { error } = await supabase.from("stripe_events").insert({ id, type });
  if (!error) return "new";
  if (error.code === "23505") return "dup";
  throw new Error(error.message);
}

export async function loadStoredSubscriptions(
  userId: string,
): Promise<SubscriptionRow[]> {
  const supabase = createServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "user_id,stripe_customer_id,stripe_subscription_id,status,price_id,current_period_end,cancel_at_period_end,trial_end,plan",
    )
    .eq("user_id", userId);
  if (error || !data) return [];
  return data as SubscriptionRow[];
}

export function rankSubscriptions<T extends { status: string; current_period_end?: string | null }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const liveA = isLiveAccess(a.status, a.current_period_end) ? 1 : 0;
    const liveB = isLiveAccess(b.status, b.current_period_end) ? 1 : 0;
    if (liveA !== liveB) return liveB - liveA;
    const endA = a.current_period_end ? Date.parse(a.current_period_end) : 0;
    const endB = b.current_period_end ? Date.parse(b.current_period_end) : 0;
    return endB - endA;
  });
}

export function isLiveAccess(
  status: string,
  periodEnd: string | number | null | undefined,
): boolean {
  if (status === "active" || status === "trialing" || status === "past_due") {
    return true;
  }
  if (status !== "canceled") return false;
  const endMs =
    typeof periodEnd === "number"
      ? periodEnd * 1000
      : periodEnd
        ? Date.parse(periodEnd)
        : 0;
  return endMs > Date.now();
}

async function resolveUserId(
  sub: Stripe.Subscription,
  fallback: string | null,
): Promise<string | null> {
  if (fallback) return fallback;
  const fromMeta = sub.metadata?.supabase_user_id;
  if (fromMeta) return fromMeta;
  const supabase = createServerSupabase();
  if (!supabase) return null;
  const { data: bySub } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  if (bySub?.user_id) return bySub.user_id as string;
  const customerId = customerIdOf(sub.customer);
  if (!customerId) return null;
  const { data: byCustomer } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .limit(1)
    .maybeSingle();
  return (byCustomer?.user_id as string | undefined) ?? null;
}

export async function upsertSubscription(
  sub: Stripe.Subscription,
  userIdHint: string | null,
): Promise<SubscriptionRow | null> {
  const userId = await resolveUserId(sub, userIdHint);
  if (!userId) return null;
  const item = sub.items.data[0];
  const row: SubscriptionRow = {
    user_id: userId,
    stripe_customer_id: customerIdOf(sub.customer),
    stripe_subscription_id: sub.id,
    status: sub.status,
    price_id: typeof item?.price === "string" ? item.price : item?.price?.id ?? null,
    current_period_end: isoFromUnix(periodEndUnix(sub)),
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
    trial_end: isoFromUnix(sub.trial_end ?? undefined),
    plan: sub.metadata?.plan || BILLING_PLAN,
  };
  const supabase = createServerSupabase();
  if (!supabase) throw new Error("Chybí Supabase service role.");
  const { error } = await supabase.from("subscriptions").upsert(row, {
    onConflict: "stripe_subscription_id",
  });
  if (error) throw new Error(error.message);
  return row;
}
