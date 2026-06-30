import React from "react";

interface AmountDisplayProps {
  amount?: number | string | null;
  currency?: string;
  className?: string;
}

export function AmountDisplay({ amount, currency = "INR", className }: AmountDisplayProps) {
  const num = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(num)) return <span className={className}>—</span>;

  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(num);

  return <span className={className}>{formatted}</span>;
}
