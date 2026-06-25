export const INVOICE_STATES = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  PARTIALLY_PAID: "partially-paid",
  PAID: "paid",
  OVERDUE: "overdue",
  CANCELLED: "cancelled",
} as const;

export type InvoiceState = typeof INVOICE_STATES[keyof typeof INVOICE_STATES];

export const INVOICE_TRANSITIONS: Record<InvoiceState, InvoiceState[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["approved", "cancelled"],
  approved: ["partially-paid", "paid", "overdue"],
  "partially-paid": ["paid", "overdue"],
  paid: [],
  overdue: ["paid", "partially-paid"],
  cancelled: [],
};

export function canTransitionInvoice(from: InvoiceState, to: InvoiceState): boolean {
  return INVOICE_TRANSITIONS[from]?.includes(to) ?? false;
}
