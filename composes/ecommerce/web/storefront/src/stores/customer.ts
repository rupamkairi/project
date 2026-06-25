import { create } from "zustand";

export interface CustomerProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface CustomerStore {
  customer: CustomerProfile | null;
  token: string | null;
  login: (customer: CustomerProfile, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useCustomerStore = create<CustomerStore>((set, get) => ({
  customer: null,
  token: localStorage.getItem("eco_customer_token"),
  login: (customer, token) => {
    localStorage.setItem("eco_customer_token", token);
    set({ customer, token });
  },
  logout: () => {
    localStorage.removeItem("eco_customer_token");
    set({ customer: null, token: null });
  },
  isAuthenticated: () => !!get().token,
}));
