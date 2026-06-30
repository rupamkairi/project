import { cn } from "@projectx/ui"

interface ProgressBarProps {
  value: number
  label?: string
  className?: string
  size?: "sm" | "md" | "lg"
}

export function ProgressBar({ value, label, className, size = "md" }: ProgressBarProps) {
  const height = size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2"
  return (
    <div className={cn("space-y-1", className)}>
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
      <div className={cn(height, "bg-muted rounded-full overflow-hidden")}>
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  )
}
