import * as React from 'react'
import { cn } from '../lib/utils'
import { ComposeNavbar } from './compose-navbar'
import { PlatformNavbar } from './platform-navbar'
import type { NavBarItem } from './nav-bar'

export interface StackedAppLayoutProps {
  composeTitle?: string | undefined
  composeItems?: NavBarItem[]
  userMenu?: React.ReactNode
  pluginsMenu?: React.ReactNode
  tertiary?: React.ReactNode
  mainClassName?: string
  children: React.ReactNode
}

/**
 * Canonical authenticated app shell: invariant PlatformNavbar on top,
 * per-compose ComposeNavbar below it (rendered only when `composeTitle` is
 * set — platform routes render the PlatformNavbar alone), then page content.
 * Compose layouts render `<Outlet />` as children.
 */
export function StackedAppLayout({
  composeTitle,
  composeItems = [],
  userMenu,
  pluginsMenu,
  tertiary,
  mainClassName,
  children,
}: StackedAppLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PlatformNavbar userMenu={userMenu} pluginsMenu={pluginsMenu} />
      {composeTitle && (
        <ComposeNavbar title={composeTitle} items={composeItems} tertiary={tertiary} />
      )}
      <main className={cn('flex-1', mainClassName)}>{children}</main>
    </div>
  )
}
