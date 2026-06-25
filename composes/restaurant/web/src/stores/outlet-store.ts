import { create } from "zustand";

interface OutletState {
  outletId: string | null;
  outletName: string | null;
  setOutlet: (id: string, name?: string) => void;
  clear: () => void;
}

export const useOutletStore = create<OutletState>((set) => ({
  outletId: typeof localStorage !== "undefined" ? (localStorage.getItem("rst_outlet_id") ?? null) : null,
  outletName: typeof localStorage !== "undefined" ? (localStorage.getItem("rst_outlet_name") ?? null) : null,
  setOutlet: (id, name) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("rst_outlet_id", id);
      if (name) localStorage.setItem("rst_outlet_name", name);
    }
    set({ outletId: id, outletName: name ?? null });
  },
  clear: () => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("rst_outlet_id");
      localStorage.removeItem("rst_outlet_name");
    }
    set({ outletId: null, outletName: null });
  },
}));
