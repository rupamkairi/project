export interface MockOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  paymentStatus: "paid" | "pending" | "failed" | "refunded";
  fulfillmentStatus: "unfulfilled" | "partial" | "fulfilled";
  total: number;
  itemCount: number;
  createdAt: Date;
  shippingAddress: {
    line1: string;
    city: string;
    state: string;
    country: string;
    postcode: string;
  };
  items: {
    productId: string;
    productName: string;
    variant: string;
    quantity: number;
    price: number;
  }[];
}

export interface MockProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  status: "draft" | "published" | "archived";
  variants: number;
  priceMin: number;
  priceMax: number;
  images: string[];
  createdAt: Date;
}

export interface MockCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  productCount: number;
  children: MockCategory[];
}

export interface MockInventory {
  id: string;
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  sku: string;
  location: string;
  onHand: number;
  reserved: number;
  available: number;
  reorderPoint: number;
}

export interface MockCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  orders: number;
  totalSpent: number;
  status: "active" | "suspended";
  joinedAt: Date;
  addresses: {
    label: string;
    line1: string;
    city: string;
    state: string;
    country: string;
    postcode: string;
    isDefault: boolean;
  }[];
}

export interface MockCoupon {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minOrder: number;
  usageLimit: number;
  usageCount: number;
  validFrom: Date;
  validTo: Date;
  status: "active" | "expired" | "exhausted";
}

export interface MockDeliveryZone {
  id: string;
  name: string;
  description: string;
  fee: number;
  freeShippingThreshold: number;
  enabled: boolean;
  pincodes: string[];
}

export interface MockWorkflowInstance {
  id: string;
  orderId: string;
  customerName: string;
  itemCount: number;
  currentStage: "pick_pack" | "quality_check" | "dispatch" | "delivered";
  stageEnteredAt: Date;
  assignee: string | null;
  tasks: {
    id: string;
    title: string;
    completed: boolean;
  }[];
}

export interface MockNotificationTemplate {
  key: string;
  channel: "email" | "sms" | "in_app" | "push";
  subject: string;
  body: string;
  lastUpdated: Date;
  variables: string[];
}

export interface MockTeamMember {
  id: string;
  name: string;
  email: string;
  role: "store-admin" | "store-staff";
  status: "active" | "pending" | "suspended";
  joinedAt: Date;
}

export const mockOrders: MockOrder[] = [
  {
    id: "ORD-001",
    customerName: "John Smith",
    customerEmail: "john@example.com",
    status: "delivered",
    paymentStatus: "paid",
    fulfillmentStatus: "fulfilled",
    total: 12999,
    itemCount: 2,
    createdAt: new Date("2024-01-15T10:30:00"),
    shippingAddress: {
      line1: "123 Main Street",
      city: "New York",
      state: "NY",
      country: "USA",
      postcode: "10001",
    },
    items: [
      {
        productId: "P1",
        productName: "Wireless Headphones",
        variant: "Black",
        quantity: 1,
        price: 9999,
      },
      {
        productId: "P2",
        productName: "Phone Case",
        variant: "Large",
        quantity: 1,
        price: 3000,
      },
    ],
  },
  {
    id: "ORD-002",
    customerName: "Sarah Johnson",
    customerEmail: "sarah@example.com",
    status: "shipped",
    paymentStatus: "paid",
    fulfillmentStatus: "fulfilled",
    total: 4599,
    itemCount: 1,
    createdAt: new Date("2024-01-16T14:20:00"),
    shippingAddress: {
      line1: "456 Oak Avenue",
      city: "Los Angeles",
      state: "CA",
      country: "USA",
      postcode: "90001",
    },
    items: [
      {
        productId: "P3",
        productName: "Smart Watch",
        variant: "Silver",
        quantity: 1,
        price: 4599,
      },
    ],
  },
  {
    id: "ORD-003",
    customerName: "Mike Wilson",
    customerEmail: "mike@example.com",
    status: "processing",
    paymentStatus: "paid",
    fulfillmentStatus: "unfulfilled",
    total: 8920,
    itemCount: 3,
    createdAt: new Date("2024-01-17T09:15:00"),
    shippingAddress: {
      line1: "789 Pine Road",
      city: "Chicago",
      state: "IL",
      country: "USA",
      postcode: "60601",
    },
    items: [
      {
        productId: "P4",
        productName: "Bluetooth Speaker",
        variant: "White",
        quantity: 2,
        price: 2990,
      },
      {
        productId: "P5",
        productName: "USB Cable",
        variant: "2m",
        quantity: 1,
        price: 2940,
      },
    ],
  },
  {
    id: "ORD-004",
    customerName: "Emily Brown",
    customerEmail: "emily@example.com",
    status: "pending",
    paymentStatus: "pending",
    fulfillmentStatus: "unfulfilled",
    total: 15999,
    itemCount: 1,
    createdAt: new Date("2024-01-17T16:45:00"),
    shippingAddress: {
      line1: "321 Elm Street",
      city: "Houston",
      state: "TX",
      country: "USA",
      postcode: "77001",
    },
    items: [
      {
        productId: "P6",
        productName: "Laptop Stand",
        variant: "Aluminum",
        quantity: 1,
        price: 15999,
      },
    ],
  },
  {
    id: "ORD-005",
    customerName: "David Lee",
    customerEmail: "david@example.com",
    status: "cancelled",
    paymentStatus: "refunded",
    fulfillmentStatus: "unfulfilled",
    total: 5999,
    itemCount: 1,
    createdAt: new Date("2024-01-14T11:00:00"),
    shippingAddress: {
      line1: "555 Cedar Lane",
      city: "Phoenix",
      state: "AZ",
      country: "USA",
      postcode: "85001",
    },
    items: [
      {
        productId: "P7",
        productName: "Keyboard",
        variant: "Mechanical",
        quantity: 1,
        price: 5999,
      },
    ],
  },
];

export const mockProducts: MockProduct[] = [
  {
    id: "P1",
    name: "Wireless Headphones",
    slug: "wireless-headphones",
    description: "Premium wireless headphones with active noise cancellation",
    category: "Electronics",
    status: "published",
    variants: 3,
    priceMin: 9999,
    priceMax: 12999,
    images: ["/placeholder-product.jpg"],
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "P2",
    name: "Smart Watch",
    slug: "smart-watch",
    description: "Fitness tracking smartwatch with heart rate monitor",
    category: "Electronics",
    status: "published",
    variants: 2,
    priceMin: 4599,
    priceMax: 4999,
    images: ["/placeholder-product.jpg"],
    createdAt: new Date("2024-01-02"),
  },
  {
    id: "P3",
    name: "Phone Case",
    slug: "phone-case",
    description: "Durable phone case with drop protection",
    category: "Accessories",
    status: "published",
    variants: 5,
    priceMin: 1999,
    priceMax: 2999,
    images: ["/placeholder-product.jpg"],
    createdAt: new Date("2024-01-03"),
  },
  {
    id: "P4",
    name: "Bluetooth Speaker",
    slug: "bluetooth-speaker",
    description: "Portable bluetooth speaker with 360 sound",
    category: "Electronics",
    status: "published",
    variants: 2,
    priceMin: 2990,
    priceMax: 3490,
    images: ["/placeholder-product.jpg"],
    createdAt: new Date("2024-01-04"),
  },
  {
    id: "P5",
    name: "Laptop Stand",
    slug: "laptop-stand",
    description: "Ergonomic aluminum laptop stand",
    category: "Accessories",
    status: "draft",
    variants: 1,
    priceMin: 15999,
    priceMax: 15999,
    images: ["/placeholder-product.jpg"],
    createdAt: new Date("2024-01-05"),
  },
  {
    id: "P6",
    name: "Mechanical Keyboard",
    slug: "mechanical-keyboard",
    description: "RGB mechanical keyboard with cherry switches",
    category: "Electronics",
    status: "archived",
    variants: 3,
    priceMin: 5999,
    priceMax: 7999,
    images: ["/placeholder-product.jpg"],
    createdAt: new Date("2024-01-06"),
  },
];

export const mockCategories: MockCategory[] = [
  {
    id: "C1",
    name: "Electronics",
    slug: "electronics",
    parentId: null,
    productCount: 45,
    children: [
      {
        id: "C1-1",
        name: "Audio",
        slug: "audio",
        parentId: "C1",
        productCount: 12,
        children: [],
      },
      {
        id: "C1-2",
        name: "Wearables",
        slug: "wearables",
        parentId: "C1",
        productCount: 8,
        children: [],
      },
    ],
  },
  {
    id: "C2",
    name: "Accessories",
    slug: "accessories",
    parentId: null,
    productCount: 32,
    children: [
      {
        id: "C2-1",
        name: "Cases",
        slug: "cases",
        parentId: "C2",
        productCount: 15,
        children: [],
      },
      {
        id: "C2-2",
        name: "Cables",
        slug: "cables",
        parentId: "C2",
        productCount: 10,
        children: [],
      },
    ],
  },
  {
    id: "C3",
    name: "Clothing",
    slug: "clothing",
    parentId: null,
    productCount: 28,
    children: [],
  },
];

export const mockInventory: MockInventory[] = [
  {
    id: "I1",
    productId: "P1",
    productName: "Wireless Headphones",
    variantId: "V1",
    variantName: "Black",
    sku: "WH-BLK-001",
    location: "Main Warehouse",
    onHand: 45,
    reserved: 5,
    available: 40,
    reorderPoint: 10,
  },
  {
    id: "I2",
    productId: "P1",
    productName: "Wireless Headphones",
    variantId: "V2",
    variantName: "White",
    sku: "WH-WHT-001",
    location: "Main Warehouse",
    onHand: 3,
    reserved: 0,
    available: 3,
    reorderPoint: 10,
  },
  {
    id: "I3",
    productId: "P2",
    productName: "Smart Watch",
    variantId: "V3",
    variantName: "Silver",
    sku: "SW-SLV-001",
    location: "Main Warehouse",
    onHand: 28,
    reserved: 2,
    available: 26,
    reorderPoint: 5,
  },
  {
    id: "I4",
    productId: "P3",
    productName: "Phone Case",
    variantId: "V4",
    variantName: "iPhone 15",
    sku: "PC-IP15-001",
    location: "Main Warehouse",
    onHand: 0,
    reserved: 0,
    available: 0,
    reorderPoint: 20,
  },
  {
    id: "I5",
    productId: "P4",
    productName: "Bluetooth Speaker",
    variantId: "V5",
    variantName: "Black",
    sku: "BS-BLK-001",
    location: "Secondary Warehouse",
    onHand: 15,
    reserved: 3,
    available: 12,
    reorderPoint: 5,
  },
];

export const mockCustomers: MockCustomer[] = [
  {
    id: "CU1",
    name: "John Smith",
    email: "john@example.com",
    phone: "+1 555-0101",
    orders: 5,
    totalSpent: 45000,
    status: "active",
    joinedAt: new Date("2023-06-15"),
    addresses: [
      {
        label: "Home",
        line1: "123 Main Street",
        city: "New York",
        state: "NY",
        country: "USA",
        postcode: "10001",
        isDefault: true,
      },
    ],
  },
  {
    id: "CU2",
    name: "Sarah Johnson",
    email: "sarah@example.com",
    phone: "+1 555-0102",
    orders: 12,
    totalSpent: 125000,
    status: "active",
    joinedAt: new Date("2023-03-20"),
    addresses: [
      {
        label: "Home",
        line1: "456 Oak Avenue",
        city: "Los Angeles",
        state: "CA",
        country: "USA",
        postcode: "90001",
        isDefault: true,
      },
      {
        label: "Office",
        line1: "789 Business Blvd",
        city: "Los Angeles",
        state: "CA",
        country: "USA",
        postcode: "90002",
        isDefault: false,
      },
    ],
  },
  {
    id: "CU3",
    name: "Mike Wilson",
    email: "mike@example.com",
    phone: "+1 555-0103",
    orders: 3,
    totalSpent: 18999,
    status: "active",
    joinedAt: new Date("2023-11-10"),
    addresses: [
      {
        label: "Home",
        line1: "789 Pine Road",
        city: "Chicago",
        state: "IL",
        country: "USA",
        postcode: "60601",
        isDefault: true,
      },
    ],
  },
  {
    id: "CU4",
    name: "Emily Brown",
    email: "emily@example.com",
    phone: "+1 555-0104",
    orders: 1,
    totalSpent: 15999,
    status: "suspended",
    joinedAt: new Date("2024-01-05"),
    addresses: [],
  },
];

export const mockCoupons: MockCoupon[] = [
  {
    id: "CP1",
    code: "SAVE10",
    type: "percentage",
    value: 10,
    minOrder: 5000,
    usageLimit: 100,
    usageCount: 45,
    validFrom: new Date("2024-01-01"),
    validTo: new Date("2024-12-31"),
    status: "active",
  },
  {
    id: "CP2",
    code: "FLAT20",
    type: "fixed",
    value: 2000,
    minOrder: 10000,
    usageLimit: 50,
    usageCount: 50,
    validFrom: new Date("2024-01-01"),
    validTo: new Date("2024-06-30"),
    status: "exhausted",
  },
  {
    id: "CP3",
    code: "NEWYEAR",
    type: "percentage",
    value: 15,
    minOrder: 0,
    usageLimit: 200,
    usageCount: 23,
    validFrom: new Date("2023-01-01"),
    validTo: new Date("2023-01-31"),
    status: "expired",
  },
  {
    id: "CP4",
    code: "FREESHIP",
    type: "fixed",
    value: 0,
    minOrder: 2500,
    usageLimit: 500,
    usageCount: 123,
    validFrom: new Date("2024-01-01"),
    validTo: new Date("2024-12-31"),
    status: "active",
  },
];

export const mockDeliveryZones: MockDeliveryZone[] = [
  {
    id: "DZ1",
    name: "Local Delivery",
    description: "Same-day delivery within city limits",
    fee: 500,
    freeShippingThreshold: 2500,
    enabled: true,
    pincodes: ["10001", "10002", "10003"],
  },
  {
    id: "DZ2",
    name: "Metro Areas",
    description: "2-3 day delivery to metro areas",
    fee: 999,
    freeShippingThreshold: 5000,
    enabled: true,
    pincodes: ["20001", "30001", "40001"],
  },
  {
    id: "DZ3",
    name: "National",
    description: "5-7 day delivery nationwide",
    fee: 1499,
    freeShippingThreshold: 10000,
    enabled: true,
    pincodes: ["*"],
  },
  {
    id: "DZ4",
    name: "International",
    description: "Express international shipping",
    fee: 4999,
    freeShippingThreshold: 25000,
    enabled: false,
    pincodes: [],
  },
];

export const mockWorkflowInstances: MockWorkflowInstance[] = [
  {
    id: "WF1",
    orderId: "ORD-003",
    customerName: "Mike Wilson",
    itemCount: 3,
    currentStage: "pick_pack",
    stageEnteredAt: new Date("2024-01-17T10:00:00"),
    assignee: "John D.",
    tasks: [
      { id: "T1", title: "Pick items from shelf", completed: true },
      { id: "T2", title: "Verify quantities", completed: false },
      { id: "T3", title: "Pack items", completed: false },
    ],
  },
  {
    id: "WF2",
    orderId: "ORD-002",
    customerName: "Sarah Johnson",
    itemCount: 1,
    currentStage: "quality_check",
    stageEnteredAt: new Date("2024-01-16T15:00:00"),
    assignee: "Mary S.",
    tasks: [
      { id: "T4", title: "Inspect package", completed: true },
      { id: "T5", title: "Verify shipping label", completed: false },
    ],
  },
  {
    id: "WF3",
    orderId: "ORD-001",
    customerName: "John Smith",
    itemCount: 2,
    currentStage: "dispatch",
    stageEnteredAt: new Date("2024-01-15T14:00:00"),
    assignee: "Tom K.",
    tasks: [
      { id: "T6", title: "Generate shipping label", completed: true },
      { id: "T7", title: "Hand off to carrier", completed: false },
    ],
  },
  {
    id: "WF4",
    orderId: "ORD-000",
    customerName: "Test Customer",
    itemCount: 1,
    currentStage: "delivered",
    stageEnteredAt: new Date("2024-01-14T16:00:00"),
    assignee: null,
    tasks: [{ id: "T8", title: "Delivery confirmed", completed: true }],
  },
];

export const mockNotificationTemplates: MockNotificationTemplate[] = [
  {
    key: "order.confirmed",
    channel: "email",
    subject: "Your order has been confirmed",
    body: "Hi {{customerName}}, your order {{orderId}} has been confirmed.",
    lastUpdated: new Date("2024-01-10"),
    variables: ["customerName", "orderId"],
  },
  {
    key: "order.shipped",
    channel: "email",
    subject: "Your order is on the way",
    body: "Hi {{customerName}}, your order {{orderId}} has been shipped. Track: {{trackingUrl}}",
    lastUpdated: new Date("2024-01-10"),
    variables: ["customerName", "orderId", "trackingUrl"],
  },
  {
    key: "order.delivered",
    channel: "email",
    subject: "Your order has been delivered",
    body: "Hi {{customerName}}, your order {{orderId}} has been delivered.",
    lastUpdated: new Date("2024-01-10"),
    variables: ["customerName", "orderId"],
  },
  {
    key: "order.cancelled",
    channel: "email",
    subject: "Your order has been cancelled",
    body: "Hi {{customerName}}, your order {{orderId}} has been cancelled.",
    lastUpdated: new Date("2024-01-10"),
    variables: ["customerName", "orderId"],
  },
  {
    key: "stock.low",
    channel: "in_app",
    subject: "",
    body: "Low stock alert: {{productName}} has only {{quantity}} units left.",
    lastUpdated: new Date("2024-01-08"),
    variables: ["productName", "quantity"],
  },
];

export const mockTeamMembers: MockTeamMember[] = [
  {
    id: "TM1",
    name: "Admin User",
    email: "admin@store.com",
    role: "store-admin",
    status: "active",
    joinedAt: new Date("2023-01-01"),
  },
  {
    id: "TM2",
    name: "John Doe",
    email: "john@store.com",
    role: "store-staff",
    status: "active",
    joinedAt: new Date("2023-06-15"),
  },
  {
    id: "TM3",
    name: "Jane Smith",
    email: "jane@store.com",
    role: "store-staff",
    status: "active",
    joinedAt: new Date("2023-08-20"),
  },
  {
    id: "TM4",
    name: "Pending User",
    email: "pending@store.com",
    role: "store-staff",
    status: "pending",
    joinedAt: new Date("2024-01-15"),
  },
];

export const mockDashboardStats = {
  totalRevenue: 1250000,
  revenueChange: 12.5,
  ordersToday: 23,
  ordersChange: 8.3,
  activeOrders: 45,
  activeChange: -2.1,
  lowStockCount: 7,
  lowStockChange: 3,
};

export const mockSalesData = [
  { date: "Jan 1", sales: 45000, orders: 12 },
  { date: "Jan 2", sales: 52000, orders: 15 },
  { date: "Jan 3", sales: 38000, orders: 10 },
  { date: "Jan 4", sales: 61000, orders: 18 },
  { date: "Jan 5", sales: 48000, orders: 14 },
  { date: "Jan 6", sales: 72000, orders: 21 },
  { date: "Jan 7", sales: 55000, orders: 16 },
];

export interface MockPriceList {
  id: string;
  name: string;
  currency: string;
  status: "active" | "scheduled" | "expired";
  validFrom: Date;
  validTo: Date;
  rules: {
    variantSku: string;
    price: number;
  }[];
  createdAt: Date;
}

export const mockPriceLists: MockPriceList[] = [
  {
    id: "PL1",
    name: "Summer Sale",
    currency: "USD",
    status: "active",
    validFrom: new Date("2024-06-01"),
    validTo: new Date("2024-08-31"),
    rules: [
      { variantSku: "WH-BLK-001", price: 7999 },
      { variantSku: "SW-SLV-001", price: 3999 },
    ],
    createdAt: new Date("2024-05-15"),
  },
  {
    id: "PL2",
    name: "Flash Sale",
    currency: "USD",
    status: "scheduled",
    validFrom: new Date("2024-02-01"),
    validTo: new Date("2024-02-14"),
    rules: [{ variantSku: "BS-BLK-001", price: 1999 }],
    createdAt: new Date("2024-01-20"),
  },
  {
    id: "PL3",
    name: "Holiday Promo",
    currency: "USD",
    status: "expired",
    validFrom: new Date("2023-12-01"),
    validTo: new Date("2023-12-31"),
    rules: [],
    createdAt: new Date("2023-11-15"),
  },
];
