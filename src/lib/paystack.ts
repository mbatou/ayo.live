// Single source of truth for the Paystack API base URL. Defaults to
// production; in tests, set PAYSTACK_BASE_URL=http://localhost:<port>
// to route every call to a local interceptor (see scripts/smoke-payout.mjs).
export const PAYSTACK_BASE_URL =
  process.env.PAYSTACK_BASE_URL ?? "https://api.paystack.co";
