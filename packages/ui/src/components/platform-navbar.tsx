import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { LayoutDashboard } from 'lucide-react'
import { platformNavItems } from '@projectx/shared-router'
import { NavBar } from './nav-bar'
import type { NavBarItem } from './nav-bar'
import { PluginsMenu } from './plugins-menu'

export interface PlatformNavbarProps {
  items?: NavBarItem[] | undefined
  userMenu?: React.ReactNode
  pluginsMenu?: React.ReactNode
}

/**
 * Navbar-1: invariant across every compose. Platform brand head on the left,
 * platform nav items next to it, grouped Plugins dropdown + user menu on the
 * right. Compose-specific nav belongs to ComposeNavbar below it — platform
 * routes render this bar alone.
 */
export function PlatformNavbar({
  items = [...platformNavItems],
  userMenu,
  pluginsMenu,
}: PlatformNavbarProps) {
  return (
    <NavBar
      logo={
        <Link to="/dashboard" className="flex items-center gap-2 no-underline">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-background">
            <LayoutDashboard className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-semibold text-foreground">Platform</span>
        </Link>
      }
      items={items}
      actions={
        <>
          {pluginsMenu ?? <PluginsMenu />}
          {userMenu}
        </>
      }
    />
  )
}
