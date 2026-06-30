export const orderFSM = {
  id: "ecommerce.order",
  initial: "pending",
  states: {
    pending: { transitions: ["processing", "cancelled"] },
    processing: { transitions: ["fulfilled", "cancelled", "refunded"] },
    fulfilled: { transitions: ["refunded"] },
    cancelled: { transitions: [] },
    refunded: { transitions: [] },
  },
};

export const fulfillmentFSM = {
  id: "ecommerce.fulfillment",
  initial: "pending",
  states: {
    pending: { transitions: ["shipped", "cancelled"] },
    shipped: { transitions: ["in_transit", "delivered"] },
    in_transit: { transitions: ["delivered", "failed"] },
    delivered: { transitions: [] },
    failed: { transitions: [] },
    cancelled: { transitions: [] },
  },
};

export const returnFSM = {
  id: "ecommerce.return",
  initial: "requested",
  states: {
    requested: { transitions: ["approved", "rejected"] },
    approved: { transitions: ["received"] },
    rejected: { transitions: [] },
    received: { transitions: ["processed"] },
    processed: { transitions: ["refunded"] },
    refunded: { transitions: [] },
  },
};

export const cartFSM = {
  id: "ecommerce.cart",
  initial: "active",
  states: {
    active: { transitions: ["checkout", "abandoned"] },
    checkout: { transitions: ["completed", "abandoned"] },
    completed: { transitions: [] },
    abandoned: { transitions: [] },
  },
};
