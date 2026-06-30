import { create } from "zustand";

interface EcoProduct {
  id: string;
  title: string;
  handle: string;
  description?: string;
  categoryId?: string;
  status: "draft" | "published" | "archived";
  weight?: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface ProductStore {
  products: EcoProduct[];
  filters: { status?: string; categoryId?: string; q?: string; page: number };
  total: number;
  loading: boolean;
  setProducts: (products: EcoProduct[]) => void;
  setTotal: (total: number) => void;
  setLoading: (loading: boolean) => void;
  setFilter: (key: string, value: any) => void;
}

export const useProductStore = create<ProductStore>((set) => ({
  products: [],
  filters: { page: 1 },
  total: 0,
  loading: false,
  setProducts: (products) => set({ products }),
  setTotal: (total) => set({ total }),
  setLoading: (loading) => set({ loading }),
  setFilter: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value, page: key === "page" ? value : 1 } })),
}));
