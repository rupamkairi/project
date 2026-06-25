export function formatCurrency(cents: number | undefined | null): string {
  if (cents == null) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
