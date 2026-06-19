import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"
import { Badge } from "./ui/badge"

const statusBadgeVariants = cva("", {
  variants: {
    variant: {
      default: "",
      success: "bg-secondary text-secondary-foreground hover:bg-secondary",
      warning: "bg-secondary text-secondary-foreground hover:bg-secondary",
      danger: "bg-destructive/10 text-destructive hover:bg-destructive/10",
      info: "bg-secondary text-secondary-foreground hover:bg-secondary",
      secondary: "bg-muted text-muted-foreground hover:bg-muted",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

export type StatusVariant = VariantProps<typeof statusBadgeVariants>["variant"]

const statusVariantMap: Record<string, StatusVariant> = {
  active: "success",
  enabled: "success",
  published: "success",
  delivered: "success",
  completed: "success",
  paid: "success",
  accepted: "success",
  pending: "warning",
  processing: "warning",
  unpaid: "warning",
  partial: "warning",
  suspended: "danger",
  cancelled: "danger",
  failed: "danger",
  refunded: "danger",
  deleted: "danger",
  revoked: "danger",
  inactive: "secondary",
  draft: "secondary",
  archived: "secondary",
  expired: "secondary",
  confirmed: "info",
  shipped: "info",
  invited: "info",
}

interface StatusBadgeProps {
  status: string
  variant?: StatusVariant
  className?: string
}

function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const computedVariant =
    variant ?? statusVariantMap[status.toLowerCase()] ?? "default"

  return (
    <Badge
      variant="secondary"
      className={cn(
        "capitalize text-xs",
        statusBadgeVariants({ variant: computedVariant }),
        className
      )}
    >
      {status}
    </Badge>
  )
}

export { StatusBadge, statusBadgeVariants }
export type { StatusBadgeProps }
