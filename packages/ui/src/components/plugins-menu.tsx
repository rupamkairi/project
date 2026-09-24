import { Link } from '@tanstack/react-router'
import { Bell, Files, Puzzle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

export interface PluginMenuItem {
  label: string
  href: string
  icon?: LucideIcon
}

/**
 * User-facing plugin surfaces. Each entry points at the platform-owned page
 * for that plugin. The payment plugin has no web UI, so it is intentionally
 * absent — add it here once a destination route exists.
 */
export const defaultPluginEntries: PluginMenuItem[] = [
  { label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { label: 'Files', href: '/dashboard/files', icon: Files },
]

export function PluginsMenu({
  items = defaultPluginEntries,
}: {
  items?: PluginMenuItem[] | undefined
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Puzzle className="h-4 w-4" />
          <span className="hidden sm:block">Plugins</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Plugins</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link to={item.href}>
              {item.icon && <item.icon className="h-4 w-4 mr-2" />}
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
