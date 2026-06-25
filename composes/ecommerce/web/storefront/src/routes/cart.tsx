import { createRoute } from "@tanstack/react-router";
import { ecommerceStorefrontLayoutRoute } from "./store.layout";
import { useCartStore } from "../stores/cart";
import { Button, Input } from "@projectx/ui";
import { formatCurrency } from "../lib/format";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, ArrowLeft } from "lucide-react";
import { Separator } from "@projectx/ui";
import { Link } from "@tanstack/react-router";

function StorefrontCart() {
  const { items, updateQty, removeItem, clearCart } = useCartStore();

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shopping Cart</h1>
          <p className="text-sm text-muted-foreground mt-1">{items.length} item{items.length !== 1 ? "s" : ""} in your cart</p>
        </div>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" className="text-destructive" onClick={clearCart}>Clear All</Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Your cart is empty</h2>
          <p className="text-sm text-muted-foreground">Looks like you haven't added anything yet</p>
          <Button asChild><Link to="/store/products">Continue Shopping</Link></Button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-3">
            {items.map((item) => (
              <div key={item.variantId} className="flex gap-4 rounded-xl border p-4 hover:shadow-sm transition-shadow">
                <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center text-3xl shrink-0">
                  {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover rounded-xl" /> : <span>✦</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium truncate">{item.productTitle}</p>
                      {item.variantTitle && <p className="text-xs text-muted-foreground">{item.variantTitle}</p>}
                    </div>
                    <p className="text-sm font-semibold whitespace-nowrap">{formatCurrency(item.unitPrice * item.qty)}</p>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border rounded-lg">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => updateQty(item.variantId, item.qty - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm">{item.qty}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => updateQty(item.variantId, item.qty + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.variantId)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span className="text-muted-foreground">Calculated at checkout</span></div>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(subtotal)}</span></div>
              <Button size="lg" className="w-full h-12" asChild>
                <Link to="/store/checkout">Checkout <ArrowRight className="h-4 w-4 ml-2" /></Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/store/products"><ArrowLeft className="h-4 w-4 mr-2" /> Continue Shopping</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const ecoStoreCartRoute = createRoute({
  getParentRoute: () => ecommerceStorefrontLayoutRoute,
  path: "/cart",
  component: StorefrontCart,
});
