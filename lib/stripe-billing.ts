import type Stripe from "stripe";

import type { BillingView } from "@/lib/billing-types";
import {
  isLiveAccess,
  loadStoredSubscriptions,
  periodEndUnix,
  rankSubscriptions,
  upsertSubscription,
  type SubscriptionRow,
} from "@/lib/billing-store";
import { BILLING_PLAN, getStripe } from "@/lib/stripe";

export type { BillingView } from "@/lib/billing-types";

const STATUS_CS: Record<string, string> = {
  active: "Aktivní",
  trialing: "Zkušební doba",
  past_due: "Platba selhala",
  canceled: "Zrušeno",
  unpaid: "Nezaplaceno",
  incomplete: "Nedokončeno",
  incomplete_expired: "Vypršelo",
  paused: "Pozastaveno",
};

export async function findStripeCustomerId(
  stripe: Stripe,
  userId: string,
  email: string,
): Promise<string | undefined> {
  const listed = await stripe.customers.list({ email, limit: 10 });
  const match = listed.data.find(
    (customer) => customer.metadata?.supabase_user_id === userId,
  );
  return match?.id;
}

export function isLiveStatus(status: string): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}

export async function loadBillingForUser(
  userId: string,
  email: string,
): Promise<BillingView | null> {
  const stored = rankSubscriptions(await loadStoredSubscriptions(userId))[0];
  if (stored && isLiveAccess(stored.status, stored.current_period_end)) {
    return viewFromRow(stored);
  }

  try {
    const fromStripe = await loadFromStripe(userId, email);
    if (fromStripe.sub) {
      try {
        await upsertSubscription(fromStripe.sub, userId);
      } catch {
        /* webhook tabulka ještě není */
      }
    }
    if (fromStripe.view) return fromStripe.view;
  } catch {
    if (stored) return viewFromRow(stored);
    throw new Error("Předplatné nejde ověřit.");
  }

  return stored ? viewFromRow(stored) : null;
}

async function loadFromStripe(
  userId: string,
  email: string,
): Promise<{ view: BillingView | null; sub: Stripe.Subscription | null }> {
  const stripe = getStripe();
  const customerId = await findStripeCustomerId(stripe, userId, email);
  if (!customerId) return { view: null, sub: null };

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
    expand: ["data.items.data.price"],
  });
  if (subs.data.length === 0) return { view: null, sub: null };

  const ranked = [...subs.data].sort((a, b) => {
    const liveA = isLiveAccess(a.status, periodEndUnix(a)) ? 1 : 0;
    const liveB = isLiveAccess(b.status, periodEndUnix(b)) ? 1 : 0;
    if (liveA !== liveB) return liveB - liveA;
    return (b.created ?? 0) - (a.created ?? 0);
  });
  const sub = ranked[0];
  return { view: viewFromStripe(sub), sub };
}

export function viewFromStripe(sub: Stripe.Subscription): BillingView {
  const item = sub.items.data[0];
  const periodEnd = periodEndUnix(sub);
  const price = item?.price;
  return toView({
    status: sub.status,
    plan: sub.metadata?.plan,
    periodEnd,
    trialEnd: sub.trial_end,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    price,
  });
}

function viewFromRow(row: SubscriptionRow): BillingView {
  const periodEnd = row.current_period_end
    ? Math.floor(Date.parse(row.current_period_end) / 1000)
    : 0;
  const trialEnd = row.trial_end
    ? Math.floor(Date.parse(row.trial_end) / 1000)
    : null;
  return toView({
    status: row.status,
    plan: row.plan,
    periodEnd,
    trialEnd,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    price: undefined,
    priceLabel: "",
  });
}

function toView({
  status,
  plan,
  periodEnd,
  trialEnd,
  cancelAtPeriodEnd,
  price,
  priceLabel,
}: {
  status: string;
  plan: string | null | undefined;
  periodEnd: number;
  trialEnd: number | null | undefined;
  cancelAtPeriodEnd: boolean;
  price?: Stripe.Price;
  priceLabel?: string;
}): BillingView {
  const planName =
    plan === BILLING_PLAN || !plan ? "Jednotažky" : plan;
  return {
    plan: planName,
    status,
    statusLabel: STATUS_CS[status] ?? status,
    priceLabel: priceLabel ?? formatPrice(price),
    periodLabel: periodLine(status, periodEnd, cancelAtPeriodEnd),
    trialLabel:
      status === "trialing" && trialEnd
        ? `Zkušební do ${formatDay(trialEnd)}`
        : null,
    cancelNote:
      cancelAtPeriodEnd && periodEnd ? "Po tomto datu se neobnoví." : null,
    live: isLiveAccess(status, periodEnd),
  };
}

function formatDay(unix: number): string {
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(new Date(unix * 1000));
}

function formatPrice(price: Stripe.Price | undefined): string {
  if (!price || price.unit_amount == null) return "";
  const amount = (price.unit_amount / 100).toLocaleString("cs-CZ");
  const currency = price.currency === "czk" ? "Kč" : price.currency.toUpperCase();
  const interval =
    price.recurring?.interval === "year"
      ? "rok"
      : price.recurring?.interval === "week"
        ? "týden"
        : "měsíc";
  return `${amount} ${currency} / ${interval}`;
}

function periodLine(
  status: string,
  periodEnd: number,
  cancelAtPeriodEnd: boolean,
): string {
  if (!periodEnd) return "";
  const day = formatDay(periodEnd);
  if (cancelAtPeriodEnd || status === "canceled") {
    return `Přístup do ${day}`;
  }
  if (status === "trialing") return `Pak se strhne od ${day}`;
  return `Další platba ${day}`;
}
