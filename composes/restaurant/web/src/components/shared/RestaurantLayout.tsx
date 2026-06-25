import React from "react";
import { Outlet, Link, useNavigate } from "@tanstack/react-router";
import { NavBar, Avatar, AvatarFallback, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, cn } from "@projectx/ui";
import { useOutletStore } from "../../stores/outlet-store";

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface RestaurantLayoutProps {
  navItems: NavItem[];
  title: string;
  appColor?: string;
  darkMode?: boolean;
}

export function RestaurantLayout({ navItems, title, darkMode = false }: RestaurantLayoutProps) {
  const { outletName } = useOutletStore();

  return (
    <div className={cn("flex flex-col min-h-screen", darkMode ? "bg-zinc-900 text-white" : "bg-background")}>
      <NavBar
        items={navItems.map((n) => ({ label: n.label, href: n.href }))}
        actions={
          <div className="flex items-center gap-3">
            {outletName && (
              <span className={cn("text-xs px-2 py-1 rounded-md", darkMode ? "bg-zinc-800 text-zinc-300" : "bg-muted text-muted-foreground")}>
                {outletName}
              </span>
            )}
          </div>
        }
      />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

export function OutletSelector({ onSelect }: { onSelect: (id: string, name: string) => void }) {
  const [outlets, setOutlets] = React.useState<{ id: string; name: string }[]>([]);
  const { rstApi } = React.useMemo(() => ({ rstApi: null as any }), []);

  React.useEffect(() => {
    import("../../lib/api/restaurant").then(({ rstApi }) => {
      rstApi.getOutlets().then((res: any) => setOutlets(res?.data ?? [])).catch(() => {});
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-4 p-6 border rounded-xl">
        <h2 className="text-lg font-semibold text-center">Select Outlet</h2>
        <div className="space-y-2">
          {outlets.map((o) => (
            <button
              key={o.id}
              onClick={() => onSelect(o.id, o.name)}
              className="w-full text-left px-4 py-3 rounded-lg border hover:bg-muted transition-colors"
            >
              {o.name}
            </button>
          ))}
          {outlets.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-4">No outlets found</p>
          )}
        </div>
      </div>
    </div>
  );
}
