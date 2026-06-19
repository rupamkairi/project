import * as React from "react"
import { ChevronRight } from "lucide-react"

import { cn } from "../lib/utils"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  description?: string | React.ReactNode
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
  className?: string
}

function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-2 pb-3 border-b mb-4", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-xs text-muted-foreground">
          {breadcrumbs.map((crumb, index) => {
            const key = crumb.href ? `${crumb.href}-${index}` : `crumb-${index}`
            return (
              <span key={key} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="h-3 w-3" />}
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    className="hover:text-foreground transition-colors"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-foreground">{crumb.label}</span>
                )}
              </span>
            )
          })}
        </nav>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground text-sm mt-0.5">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export { PageHeader }
export type { PageHeaderProps }
