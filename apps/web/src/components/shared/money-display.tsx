interface MoneyDisplayProps {
  amount: number;
  currency?: string;
  locale?: string;
}

export function MoneyDisplay({
  amount,
  currency = "USD",
  locale = "en-US",
}: MoneyDisplayProps) {
  const value = amount / 100;

  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  return <span className="font-medium tabular-nums">{formatted}</span>;
}

export function formatMoney(amount: number, currency = "USD"): string {
  const value = amount / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
}
