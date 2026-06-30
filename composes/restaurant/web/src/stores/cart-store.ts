import { create } from "zustand";

export interface CartModifier {
  name: string;
  option: string;
  price: number;
}

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  qty: number;
  unitPrice: number;
  modifiers: CartModifier[];
  note?: string;
}

interface CartState {
  items: CartItem[];
  outletId: string | null;
  orderType: "dine-in" | "takeaway" | "delivery";
  tableId: string | null;
  specialInstructions: string;
  addItem: (item: { id: string; name: string; meta?: { basePrice?: string } }, modifiers?: CartModifier[], note?: string) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  setOutletId: (id: string) => void;
  setOrderType: (t: "dine-in" | "takeaway" | "delivery") => void;
  setTableId: (id: string | null) => void;
  setSpecialInstructions: (s: string) => void;
  clear: () => void;
  total: () => { subtotal: number; tax: number; total: number };
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  outletId: null,
  orderType: "dine-in",
  tableId: null,
  specialInstructions: "",

  addItem: (menuItem, modifiers = [], note) => {
    const unitPrice = parseFloat(menuItem.meta?.basePrice ?? "0");
    const modKey = JSON.stringify(modifiers);

    set((state) => {
      const existing = state.items.find(
        (i) => i.menuItemId === menuItem.id && JSON.stringify(i.modifiers) === modKey,
      );
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === existing.id ? { ...i, qty: i.qty + 1 } : i,
          ),
        };
      }
      return {
        items: [
          ...state.items,
          {
            id: `${menuItem.id}-${Date.now()}`,
            menuItemId: menuItem.id,
            name: menuItem.name,
            qty: 1,
            unitPrice,
            modifiers,
            note,
          },
        ],
      };
    });
  },

  removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

  updateQty: (id, qty) =>
    set((s) => ({
      items: qty <= 0
        ? s.items.filter((i) => i.id !== id)
        : s.items.map((i) => (i.id === id ? { ...i, qty } : i)),
    })),

  setOutletId: (outletId) => set({ outletId }),
  setOrderType: (orderType) => set({ orderType }),
  setTableId: (tableId) => set({ tableId }),
  setSpecialInstructions: (specialInstructions) => set({ specialInstructions }),
  clear: () => set({ items: [], tableId: null, specialInstructions: "" }),

  total: () => {
    const { items } = get();
    const subtotal = items.reduce(
      (s, i) =>
        s + i.qty * (i.unitPrice + i.modifiers.reduce((ms, m) => ms + m.price, 0)),
      0,
    );
    const taxRate = 0.05;
    const tax = subtotal * taxRate;
    return { subtotal, tax, total: subtotal + tax };
  },
}));
