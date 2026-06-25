interface PriceDisplayProps {
  amount?: number | string | null
  currency?: string
  compareAt?: number | string | null
  className?: string
}

export function PriceDisplay({ amount, currency = "USD", compareAt, className }: PriceDisplayProps) {
  if (amount == null) return <span className="text-muted-foreground">—</span>

  const num = typeof amount === "string" ? parseFloat(amount) : amount

  if (num === 0) return <span className={className}>Free</span>

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num)

  if (compareAt) {
    const compareNum = typeof compareAt === "string" ? parseFloat(compareAt) : compareAt
    if (compareNum > num) {
      return (
        <span className={className}>
          <span className="text-muted-foreground line-through mr-1 text-xs">
            {new Intl.NumberFormat("en-US", { style: "currency", currency }).format(compareNum)}
          </span>
          {formatted}
        </span>
      )
    }
  }

  return <span className={className}>{formatted}</span>
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return ""
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(date))
  } catch {
    return ""
  }
}

export function AmountDisplay({ amount, currency = "USD" }: { amount?: number | string | null; currency?: string }) {
  if (amount == null) return <span>—</span>
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  if (num === 0) return <span>$0</span>
  return (
    <span>
      {new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(num)}
    </span>
  )
}
