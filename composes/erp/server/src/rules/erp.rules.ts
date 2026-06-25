// ERP business rules — pure fns, no DB, no side effects

export const THREE_WAY_MATCH_TOLERANCE = 0.05; // 5%

export function isThreeWayMatchValid(
  poAmount: number,
  grnAmount: number,
  invoiceAmount: number,
): { valid: boolean; reason?: string } {
  const maxAmount = poAmount * (1 + THREE_WAY_MATCH_TOLERANCE);
  if (invoiceAmount > maxAmount) {
    return { valid: false, reason: `Invoice ${invoiceAmount} exceeds PO ${poAmount} by more than 5%` };
  }
  if (grnAmount < invoiceAmount * (1 - THREE_WAY_MATCH_TOLERANCE)) {
    return { valid: false, reason: `GRN qty insufficient for invoice amount` };
  }
  return { valid: true };
}

export function isCreditLimitOk(
  orderAmount: number,
  outstanding: number,
  creditLimit: number,
): boolean {
  return outstanding + orderAmount <= creditLimit;
}

export function isOverReceived(orderedQty: number, receivedQty: number, alreadyReceivedQty: number): boolean {
  return alreadyReceivedQty + receivedQty > orderedQty;
}

export function computeGrn3WayVariance(
  poLineAmount: number,
  grnLineAmount: number,
): { variance: number; withinTolerance: boolean } {
  const variance = Math.abs(grnLineAmount - poLineAmount) / poLineAmount;
  return {
    variance,
    withinTolerance: variance <= THREE_WAY_MATCH_TOLERANCE,
  };
}

export function canPostJournalEntry(isFiscalYearClosed: boolean): { allowed: boolean; reason?: string } {
  if (isFiscalYearClosed) {
    return { allowed: false, reason: "Fiscal year is closed. Cannot post journal entries." };
  }
  return { allowed: true };
}

export function isDoubleEntryBalanced(lines: { amount: number; type: "debit" | "credit" }[]): boolean {
  const totalDebit = lines.filter((l) => l.type === "debit").reduce((s, l) => s + l.amount, 0);
  const totalCredit = lines.filter((l) => l.type === "credit").reduce((s, l) => s + l.amount, 0);
  return Math.abs(totalDebit - totalCredit) < 0.01;
}

export function isNegativeStockAllowed(): boolean {
  // Future: config per warehouse; default deny
  return false;
}

export const MAX_BOM_DEPTH = 5;

export function isLeaveBalanceSufficient(balance: number, requested: number): boolean {
  return balance >= requested;
}

export function computeLeaveBalance(allocated: number, taken: number): number {
  return Math.max(0, allocated - taken);
}
