import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "../lib/utils"
import { Button } from "./ui/button"

interface EmptyStateAction {
  label: string
  onClick: () => void
}

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: EmptyStateAction
  className?: string
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-8 px-4 text-center",
        className
      )}
    >
      {Icon && (
        <div className="rounded-full bg-muted p-4 mb-3">
          <Icon className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-base font-semibold">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-sm mt-1 max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <Button size="sm" onClick={action.onClick} className="mt-3">
          {action.label}
        </Button>
      )}
    </div>
  )
}

export { EmptyState }
export type { EmptyStateProps }
