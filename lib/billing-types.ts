export type BillingView = {
  plan: string;
  status: string;
  statusLabel: string;
  priceLabel: string;
  periodLabel: string;
  trialLabel: string | null;
  cancelNote: string | null;
  live: boolean;
};
