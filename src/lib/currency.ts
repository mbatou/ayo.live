// Ayo is single-currency GHS. The whole money path — ticket prices,
// Paystack charges, ticket.amount_paid, and payouts — works in GHS
// major units (the value 150 means GH₵150.00). This formatter is the
// only thing that should render those numbers to users.
export const formatGHS = (ghs: number) =>
  new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(ghs);
