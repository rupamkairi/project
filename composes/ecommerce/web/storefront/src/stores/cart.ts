import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  variantId: string;
  productTitle: string;
  variantTitle: string;
  unitPrice: number;
  qty: number;
  imageUrl?: string;
}

interface CartStore {
  cartId: string | null;
  regionId: string | null;
  items: CartItem[];
  couponCode: string | null;
  loading: boolean;
  setCartId: (id: string) => void;
  setRegionId: (id: string) => void;
  setItems: (items: CartItem[]) => void;
  setLoading: (loading: boolean) => void;
  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  updateQty: (variantId: string, qty: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      cartId: null,
      regionId: null,
      items: [],
      couponCode: null,
      loading: false,
      setCartId: (id) => set({ cartId: id }),
      setRegionId: (id) => set({ regionId: id }),
      setItems: (items) => set({ items }),
      setLoading: (loading) => set({ loading }),
      addItem: (item) => {
        const existing = get().items.find(i => i.variantId === item.variantId);
        if (existing) {
          set({ items: get().items.map(i => i.variantId === item.variantId ? { ...i, qty: i.qty + item.qty } : i) });
        } else {
          set({ items: [...get().items, item] });
        }
      },
      removeItem: (variantId) => set({ items: get().items.filter(i => i.variantId !== variantId) }),
      updateQty: (variantId, qty) => {
        if (qty <= 0) { get().removeItem(variantId); return; }
        set({ items: get().items.map(i => i.variantId === variantId ? { ...i, qty } : i) });
      },
      clearCart: () => set({ cartId: null, items: [], couponCode: null }),
    }),
    { name: "eco-cart-storage" }
  )
);
