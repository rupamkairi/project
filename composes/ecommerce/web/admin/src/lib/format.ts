export function formatCurrency(value: number | string | undefined | null): string {
  if (value == null) return "$0.00";

  if (typeof value === "string") {
    if (value.trim().endsWith("%")) return value;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return value;
    value = parsed;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value / 100);
}
