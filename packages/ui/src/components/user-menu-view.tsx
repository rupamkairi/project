import { Link } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Avatar, AvatarFallback } from './ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

export interface UserMenuLinkItem {
  label: string
  href: string
  icon?: LucideIcon
}

export interface UserMenuViewProps {
  initials: string
  fullName: string
  email?: string | null | undefined
  linkItems?: UserMenuLinkItem[] | undefined
  onSignOut: () => void
}

/**
 * Presentational user dropdown. Session wiring lives in the caller
 * (`UserMenu` in `@projectx/plugin-auth-web`) so `@projectx/ui`
 * stays free of plugin dependencies.
 */
export function UserMenuView({
  initials,
  fullName,
  email,
  linkItems = [],
  onSignOut,
}: UserMenuViewProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent outline-none">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden sm:block text-sm font-medium text-foreground">{fullName}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5">
          <p className="text-xs font-medium text-foreground">{fullName}</p>
          {email && <p className="text-xs text-muted-foreground truncate">{email}</p>}
        </div>
        {linkItems.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {linkItems.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link to={item.href}>
                  {item.icon && <item.icon className="h-4 w-4 mr-2" />}
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
