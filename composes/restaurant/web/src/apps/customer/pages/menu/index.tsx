import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { cn, Button, Badge } from "@projectx/ui";
import { rstApi } from "../../../../lib/api/restaurant";
import { useCartStore } from "../../../../stores/cart-store";
import { useOutletStore } from "../../../../stores/outlet-store";
import { AmountDisplay } from "../../../../components/shared/AmountDisplay";

export function CustomerMenuPage() {
  const navigate = useNavigate();
  const { outletId } = useOutletStore();
  const { items: cartItems, addItem, total } = useCartStore();
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const { data: menuData } = useQuery({
    queryKey: ["rst-menu-pub", outletId],
    queryFn: () => rstApi.getMenu(outletId!),
    enabled: !!outletId,
  });

  const { data: catData } = useQuery({
    queryKey: ["rst-categories-pub", outletId],
    queryFn: () => rstApi.getCategories(outletId!),
    enabled: !!outletId,
  });

  const cats = catData?.data ?? [];
  const items = (menuData?.data ?? []).filter((i) => i.meta?.isAvailable !== false);
  const activeCat = selectedCat ?? cats[0]?.id ?? null;
  const visible = activeCat ? items.filter((i) => i.meta?.categoryId === activeCat) : items;
  const cartQty = cartItems.reduce((s, i) => s + i.qty, 0);
  const t = total();

  return (
    <div className="max-w-lg mx-auto min-h-screen pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <h1 className="font-bold text-lg">Menu</h1>
        <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
          {cats.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              className={cn(
                "text-sm px-3 py-1 rounded-full border whitespace-nowrap transition-colors",
                activeCat === c.id ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="px-4 py-4 space-y-3">
        {visible.map((item) => {
          const qty = cartItems.find((ci) => ci.menuItemId === item.id)?.qty ?? 0;
          return (
            <div key={item.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{item.name}</p>
                {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                <p className="text-sm font-semibold mt-1"><AmountDisplay amount={item.meta?.basePrice} /></p>
              </div>
              <div className="flex-shrink-0 pt-1">
                {qty === 0 ? (
                  <button
                    onClick={() => addItem(item as any)}
                    className="px-3 py-1 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                  >
                    Add
                  </button>
                ) : (
                  <div className="flex items-center gap-1 border rounded-lg overflow-hidden">
                    <button
                      onClick={() => useCartStore.getState().removeItem(item.id)}
                      className="w-8 h-8 text-center hover:bg-muted"
                    >−</button>
                    <span className="text-sm font-bold w-6 text-center">{qty}</span>
                    <button
                      onClick={() => addItem(item as any)}
                      className="w-8 h-8 text-center hover:bg-muted"
                    >+</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cart bar */}
      {cartQty > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg z-20">
          <button
            onClick={() => navigate({ to: "/customer/cart" })}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 px-4 flex items-center justify-between"
          >
            <span className="text-sm font-bold bg-primary-foreground/20 rounded-md px-2 py-0.5">{cartQty}</span>
            <span className="font-bold">View Cart</span>
            <span className="font-bold"><AmountDisplay amount={t.total} /></span>
          </button>
        </div>
      )}
    </div>
  );
}
