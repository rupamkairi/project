import * as React from "react"
import { Link } from "@tanstack/react-router"
import { Menu } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "./ui/button"
import { Sheet, SheetContent, SheetTitle } from "./ui/sheet"

export interface NavBarItem {
  label: string
  href: string
  icon?: LucideIcon
  exact?: boolean
}

export interface NavBarProps {
  logo?: React.ReactNode
  items?: NavBarItem[]
  actions?: React.ReactNode
  className?: string
}

const navLinkBase = cn(
  "text-sm font-medium transition-colors",
  "text-muted-foreground hover:text-foreground",
)

const navLinkActive = cn(
  "text-sm font-medium transition-colors",
  "text-foreground",
)

function NavLinks({ items }: { items: NavBarItem[] }) {
  return (
    <>
      {items.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          activeOptions={{ exact: item.exact }}
          className={navLinkBase}
          activeProps={{ className: navLinkActive }}
        >
          {item.label}
        </Link>
      ))}
    </>
  )
}

export function NavBar({ logo, items = [], actions, className }: NavBarProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <header
      className={cn(
        "h-12 border-b bg-background flex items-center px-4 gap-6 shrink-0",
        className,
      )}
    >
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 md:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-4 w-4" />
        <span className="sr-only">Open menu</span>
      </Button>

      {/* Logo */}
      {logo && <div className="flex items-center gap-2 shrink-0">{logo}</div>}

      {/* Desktop nav links */}
      {items.length > 0 && (
        <nav className="hidden md:flex items-center gap-5">
          <NavLinks items={items} />
        </nav>
      )}

      {/* Actions */}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}

      {/* Mobile sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-56 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex flex-col p-4 gap-1">
            {logo && (
              <div className="flex items-center gap-2 h-10 mb-2">{logo}</div>
            )}
            <nav className="flex flex-col gap-1">
              {items.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  activeOptions={{ exact: item.exact }}
                  className={cn(navLinkBase, "px-2 py-1.5 rounded-md hover:bg-accent")}
                  activeProps={{
                    className: cn(navLinkActive, "px-2 py-1.5 rounded-md bg-accent"),
                  }}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.icon && (
                    <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  )}
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
