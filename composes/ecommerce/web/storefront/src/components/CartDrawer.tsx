import {
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@projectx/ui";
import { useCartStore } from "../stores/cart";
import { formatCurrency } from "../lib/format";
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, removeItem, updateQty } = useCartStore();
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        showCloseButton={false}
        side="right"
        className="w-full sm:w-[420px] flex flex-col p-0"
      >
        <SheetHeader className="flex flex-row items-center justify-between px-5 py-4 border-b shrink-0">
          <SheetTitle className="text-base font-semibold">
            Cart{" "}
            {items.length > 0 && (
              <span className="text-muted-foreground font-normal">
                ({items.length})
              </span>
            )}
          </SheetTitle>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                <ShoppingBag className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Your cart is empty
              </p>
              <Button variant="outline" size="sm" onClick={onClose}>
                Continue Shopping
              </Button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.variantId}
                className="flex gap-3 rounded-lg border p-3 hover:shadow-sm transition-shadow"
              >
                <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center text-2xl shrink-0">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <span>✦</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-sm font-medium truncate">
                      {item.productTitle}
                    </p>
                    <p className="text-sm font-semibold shrink-0">
                      {formatCurrency(item.unitPrice * item.qty)}
                    </p>
                  </div>
                  {item.variantTitle && (
                    <p className="text-xs text-muted-foreground">
                      {item.variantTitle}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center border rounded-md">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-none"
                        onClick={() => updateQty(item.variantId, item.qty - 1)}
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </Button>
                      <span className="text-xs w-6 text-center">
                        {item.qty}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-none"
                        onClick={() => updateQty(item.variantId, item.qty + 1)}
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-auto text-destructive"
                      onClick={() => removeItem(item.variantId)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t px-5 py-4 space-y-3 shrink-0 bg-background">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            <Link to="/store/cart" onClick={onClose}>
              <Button className="w-full h-10">
                View Cart & Checkout <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full h-9 text-xs"
              onClick={onClose}
            >
              Continue Shopping
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default CartDrawer;
