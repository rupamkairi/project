import * as React from 'react'
import { cn } from '../lib/utils'
import { NavBar } from './nav-bar'
import type { NavBarItem } from './nav-bar'

export interface ComposeNavbarProps {
  title: string
  items?: NavBarItem[]
  tertiary?: React.ReactNode
  className?: string
}

/**
 * Navbar-2: per-compose bar. Left head names the compose (e.g. "CRM",
 * "Ecommerce"), followed by that compose's nav items. `tertiary` reserves
 * the slot for an unlikely third navbar.
 */
export function ComposeNavbar({ title, items = [], tertiary, className }: ComposeNavbarProps) {
  return (
    <div className="flex flex-col shrink-0">
      <NavBar
        logo={<span className="text-sm font-semibold text-foreground">{title}</span>}
        items={items}
        className={cn('bg-muted/40', className)}
      />
      {tertiary}
    </div>
  )
}
