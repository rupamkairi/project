interface AmountDisplayProps {
  amount?: number | string | null;
  currency?: string;
}

export function AmountDisplay({ amount, currency = "USD" }: AmountDisplayProps) {
  if (amount == null) return <span>—</span>;
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  try {
    return (
      <span>
        {new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(num)}
      </span>
    );
  } catch {
    return <span>{num}</span>;
  }
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

export function formatDateFull(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
