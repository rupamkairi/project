import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Button, Input, cn } from "@projectx/ui";
import { rstApi } from "../../../../lib/api/restaurant";
import { useCartStore } from "../../../../stores/cart-store";
import { useOutletStore } from "../../../../stores/outlet-store";
import { AmountDisplay } from "../../../../components/shared/AmountDisplay";

export function CustomerCartPage() {
  const navigate = useNavigate();
  const { outletId } = useOutletStore();
  const { items, updateQty, removeItem, total, clear } = useCartStore();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const t = total();
  const qc = useQueryClient();

  const place = useMutation({
    mutationFn: async () => {
      const order = await rstApi.createOrder({
        outletId: outletId!,
        type: "dine-in",
        customer: { name, phone },
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
      navigate({ to: "/customer/order/$id", params: { id: orderId } });
    },
  });

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-4xl mb-4">🛒</p>
        <p className="text-muted-foreground">Your cart is empty</p>
        <Button className="mt-4" onClick={() => navigate({ to: "/customer/menu" })}>Back to Menu</Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-24">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate({ to: "/customer/menu" })} className="text-muted-foreground text-sm hover:underline">
          ← Menu
        </button>
        <h1 className="text-lg font-bold">Your Cart</h1>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{item.name}</p>
              <p className="text-xs text-muted-foreground"><AmountDisplay amount={item.unitPrice} /></p>
            </div>
            <div className="flex items-center gap-1 border rounded-lg overflow-hidden">
              <button
                onClick={() => item.qty <= 1 ? removeItem(item.id) : updateQty(item.id, item.qty - 1)}
                className="w-8 h-8 hover:bg-muted text-center"
              >−</button>
              <span className="text-sm font-bold w-6 text-center">{item.qty}</span>
              <button
                onClick={() => updateQty(item.id, item.qty + 1)}
                className="w-8 h-8 hover:bg-muted text-center"
              >+</button>
            </div>
            <span className="text-sm font-mono w-16 text-right">
              <AmountDisplay amount={item.unitPrice * item.qty} />
            </span>
          </div>
        ))}
      </div>

      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm"><span>Subtotal</span><AmountDisplay amount={t.subtotal} /></div>
        <div className="flex justify-between text-sm text-muted-foreground"><span>Tax</span><AmountDisplay amount={t.tax} /></div>
        <div className="flex justify-between font-bold"><span>Total</span><AmountDisplay amount={t.total} /></div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Your Details</p>
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>

      <Button
        className="w-full"
        disabled={!name || !phone || place.isPending}
        onClick={() => place.mutate()}
      >
        {place.isPending ? "Placing…" : "Place Order"}
      </Button>
    </div>
  );
}
