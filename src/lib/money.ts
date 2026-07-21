export const toCents = (amount: number) => Math.round(amount * 100);

export const fromCents = (cents: number) => cents / 100;

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);

export const distributeEqually = (totalAmount: number, count: number) => {
  if (count <= 0) return [];

  const totalCents = toCents(totalAmount);
  const base = Math.floor(totalCents / count);
  const remainder = totalCents % count;

  return Array.from({ length: count }, (_, index) =>
    fromCents(base + (index < remainder ? 1 : 0)),
  );
};
