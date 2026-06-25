import { cn } from "@projectx/ui"

interface StarRatingProps {
  value: number
  size?: "sm" | "md" | "lg"
  max?: number
}

export function StarRating({ value, size = "md", max = 5 }: StarRatingProps) {
  const sizeMap = { sm: "text-xs", md: "text-sm", lg: "text-lg" }

  return (
    <span className={cn("inline-flex", sizeMap[size])}>
      {Array.from({ length: max }, (_, i) => {
        const filled = value >= i + 0.8
        const half = value >= i + 0.3 && !filled
        return (
          <span key={i} className={filled ? "text-amber-500" : half ? "text-amber-300" : "text-muted-foreground"}>
            ★
          </span>
        )
      })}
    </span>
  )
}
