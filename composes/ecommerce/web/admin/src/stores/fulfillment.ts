import { create } from "zustand";

interface EcoFulfillment {
  id: string;
  transactionId: string;
  status: string;
  trackingNumber?: string;
  carrier?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

interface FulfillmentStore {
  fulfillments: EcoFulfillment[];
  activeTab: "pending" | "processing" | "shipped" | "delivered";
  loading: boolean;
  setFulfillments: (fulfillments: EcoFulfillment[]) => void;
  setLoading: (loading: boolean) => void;
  setTab: (tab: FulfillmentStore["activeTab"]) => void;
}

export const useFulfillmentStore = create<FulfillmentStore>((set) => ({
  fulfillments: [],
  activeTab: "pending",
  loading: false,
  setFulfillments: (fulfillments) => set({ fulfillments }),
  setLoading: (loading) => set({ loading }),
  setTab: (tab) => set({ activeTab: tab }),
}));
