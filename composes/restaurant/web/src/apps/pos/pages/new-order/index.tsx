import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Button, Badge, Textarea, cn } from "@projectx/ui";
import { rstApi, type MenuItem } from "../../../../lib/api/restaurant";
import { useOutletStore } from "../../../../stores/outlet-store";
import { useCartStore, type CartItem } from "../../../../stores/cart-store";
import { AmountDisplay } from "../../../../components/shared/AmountDisplay";

function MenuItemCard({ item, onAdd }: { item: MenuItem; onAdd: () => void }) {
  const unavailable = !item.meta?.isAvailable;
  return (
    <button
      onClick={onAdd}
      disabled={unavailable}
      className={cn(
        "border rounded-xl p-3 text-left transition-colors w-full",
        unavailable ? "opacity-40 cursor-not-allowed" : "hover:bg-muted/50",
      )}
    >
      {item.meta?.isPopular && (
        <Badge variant="secondary" className="mb-1 text-xs bg-amber-100 text-amber-700">Popular</Badge>
      )}
      <p className={cn("font-medium text-sm", unavailable && "line-through")}>{item.name}</p>
      <p className="text-xs text-muted-foreground mt-1">
        <AmountDisplay amount={item.meta?.basePrice} />
        {item.meta?.station && <span className="ml-2">· {item.meta.station}</span>}
      </p>
      {unavailable && <span className="text-xs text-red-500">86'd</span>}
    </button>
  );
}

function CartPanel({
  items,
  onQtyChange,
  onRemove,
  onPlace,
  loading,
}: {
  items: CartItem[];
  onQtyChange: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onPlace: () => void;
  loading: boolean;
}) {
  const { total } = useCartStore();
  const t = total();

  return (
    <aside className="w-80 border-l flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <h3 className="text-sm font-semibold">Cart ({items.length} items)</h3>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Add items from the menu</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground"><AmountDisplay amount={item.unitPrice} /></p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onQtyChange(item.id, item.qty - 1)}
                  className="w-6 h-6 rounded-md border text-xs font-bold hover:bg-muted"
                >−</button>
                <span className="text-sm w-5 text-center">{item.qty}</span>
                <button
                  onClick={() => onQtyChange(item.id, item.qty + 1)}
                  className="w-6 h-6 rounded-md border text-xs font-bold hover:bg-muted"
                >+</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span><AmountDisplay amount={t.subtotal} />
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Tax (5%)</span><AmountDisplay amount={t.tax} />
        </div>
        <div className="flex justify-between font-bold">
          <span>Total</span><AmountDisplay amount={t.total} />
        </div>
        <Button
          className="w-full"
          disabled={items.length === 0 || loading}
          onClick={onPlace}
        >
          {loading ? "Placing…" : "Place Order"}
        </Button>
      </div>
    </aside>
  );
}

export function NewOrderPage() {
  const { outletId } = useOutletStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const search = useSearch({ strict: false }) as any;
  const [orderType, setOrderType] = useState<"dine-in" | "takeaway" | "delivery">(
    search?.type ?? "dine-in",
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { items, addItem, removeItem, updateQty, clear } = useCartStore();

  const { data: categories } = useQuery({
    queryKey: ["rst-categories", outletId],
    queryFn: () => rstApi.getCategories(outletId!),
    enabled: !!outletId,
  });

  const { data: menuData } = useQuery({
    queryKey: ["rst-menu", outletId],
    queryFn: () => rstApi.getMenu(outletId!),
    enabled: !!outletId,
  });

  const cats = categories?.data ?? [];
  const menuItems = menuData?.data ?? [];
  const activeCat = selectedCategory ?? cats[0]?.id ?? null;
  const visibleItems = activeCat
    ? menuItems.filter((i) => i.meta?.categoryId === activeCat)
    : menuItems;

  const placeMutation = useMutation({
    mutationFn: async () => {
      const order = await rstApi.createOrder({
        outletId: outletId!,
        type: orderType,
        tableId: search?.tableId ?? undefined,
      });
      await rstApi.placeOrder(order.data!.id, items.map((i) => ({
        menuItemId: i.menuItemId,
        qty: i.qty,
        modifiers: i.modifiers,
        note: i.note,
      })));
      return order.data!.id;
    },
    onSuccess: (orderId) => {
      clear();
      qc.invalidateQueries({ queryKey: ["rst-orders"] });
      navigate({ to: `/pos/orders/$id`, params: { id: orderId } });
    },
  });

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Menu section */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Order type tabs */}
        <div className="flex gap-2 p-3 border-b">
          {(["dine-in", "takeaway", "delivery"] as const).map((t) => (
            <Button
              key={t}
              size="sm"
              variant={orderType === t ? "default" : "outline"}
              onClick={() => setOrderType(t)}
              className="capitalize"
            >
              {t}
            </Button>
          ))}
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto p-3 border-b no-scrollbar">
          {cats.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={cn(
                "text-sm px-3 py-1 rounded-full border whitespace-nowrap transition-colors",
                activeCat === c.id ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Items grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {visibleItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                onAdd={() => addItem(item as any)}
              />
            ))}
          </div>
        </div>
      </main>

      <CartPanel
        items={items}
        onQtyChange={updateQty}
        onRemove={removeItem}
        onPlace={() => placeMutation.mutate()}
        loading={placeMutation.isPending}
      />
    </div>
  );
}
