import Stripe from "stripe";

export const BILLING_PLAN = "jednotazky";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Chybí STRIPE_SECRET_KEY.");
  }
  return new Stripe(key);
}

export function getStripePriceId(): string {
  const price = process.env.STRIPE_PRICE_JEDNOTAZKY;
  if (!price) {
    throw new Error("Chybí STRIPE_PRICE_JEDNOTAZKY.");
  }
  return price;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Chybí STRIPE_WEBHOOK_SECRET.");
  }
  return secret;
}

export function getTrialDays(): number | undefined {
  const raw = process.env.STRIPE_TRIAL_DAYS;
  if (!raw) return undefined;
  const days = Number(raw);
  if (!Number.isInteger(days) || days < 1) return undefined;
  return days;
}

export function appOrigin(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error("V produkci musí být NEXT_PUBLIC_APP_URL. Host header se nebere.");
  }
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) throw new Error("Chybí Host.");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
