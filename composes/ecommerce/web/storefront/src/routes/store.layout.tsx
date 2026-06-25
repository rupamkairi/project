import { createRoute } from "@tanstack/react-router";
import { sharedRootRoute } from "@projectx/shared-router";
import { useState } from "react";
import { ShoppingCart, Search, User, Menu, Package, CreditCard, Shield, ArrowUpRight } from "lucide-react";
import { Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useCartStore } from "../stores/cart";
import CartDrawer from "../components/CartDrawer";
import { Button, Input } from "@projectx/ui";

function StorefrontLayout() {
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const itemCount = useCartStore((s) => s.items.length);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <button className="md:hidden -ml-2 p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                <Menu className="h-5 w-5" />
              </button>
              <Link to="/store" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <Package className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold tracking-tight hidden sm:block">Storefront</span>
              </Link>
              <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                <Link to="/store/products" className="text-muted-foreground hover:text-foreground transition-colors">Products</Link>
                <Link to="/store/categories" className="text-muted-foreground hover:text-foreground transition-colors">Categories</Link>
                <Link to="/store/search" className="text-muted-foreground hover:text-foreground transition-colors">Search</Link>
              </nav>
            </div>

            <div className="hidden sm:flex flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 h-9 bg-muted/50 border-0 focus-visible:bg-background"
                placeholder="Search products..."
                onFocus={() => navigate({ to: "/store/search" })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Link to="/store/account" className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                <User className="h-5 w-5" />
              </Link>
              <button onClick={() => setCartOpen(true)} className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background px-4 py-3 space-y-2">
            <Link to="/store/products" className="block text-sm font-medium py-1.5" onClick={() => setMobileMenuOpen(false)}>Products</Link>
            <Link to="/store/categories" className="block text-sm font-medium py-1.5" onClick={() => setMobileMenuOpen(false)}>Categories</Link>
            <Link to="/store/search" className="block text-sm font-medium py-1.5" onClick={() => setMobileMenuOpen(false)}>Search</Link>
            <Link to="/store/account" className="block text-sm font-medium py-1.5" onClick={() => setMobileMenuOpen(false)}>Account</Link>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                  <Package className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <span className="text-sm font-bold">Storefront</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Modern ecommerce platform built for speed, scale, and simplicity.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shop</h4>
              <nav className="flex flex-col gap-2">
                <Link to="/store/products" className="text-sm text-muted-foreground hover:text-foreground transition-colors">All Products</Link>
                <Link to="/store/categories" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Categories</Link>
                <Link to="/store/search" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Search</Link>
              </nav>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</h4>
              <nav className="flex flex-col gap-2">
                <Link to="/store/account" className="text-sm text-muted-foreground hover:text-foreground transition-colors">My Account</Link>
                <Link to="/store/account" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Order History</Link>
                <Link to="/store/cart" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cart</Link>
              </nav>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Support</h4>
              <nav className="flex flex-col gap-2">
                <span className="text-sm text-muted-foreground cursor-default">Help Center</span>
                <span className="text-sm text-muted-foreground cursor-default">Shipping Info</span>
                <span className="text-sm text-muted-foreground cursor-default">Returns</span>
              </nav>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Storefront. All rights reserved.</p>
            <div className="flex items-center gap-4 text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <Shield className="h-4 w-4" />
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </footer>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}

export const ecommerceStorefrontLayoutRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/store",
  component: StorefrontLayout,
});
