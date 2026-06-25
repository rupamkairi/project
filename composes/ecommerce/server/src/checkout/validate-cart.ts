import { eq, and } from "drizzle-orm";
import { db } from "@db/client";
import { transactions, transactionLines } from "@db/schema/commerce";
import { catItems } from "@db/schema/catalog";

export interface CartValidationResult {
  valid: boolean;
  errors: string[];
}

export async function validateCart(cartId: string, orgId: string): Promise<CartValidationResult> {
  const errors: string[] = [];

  const cart = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, cartId), eq(transactions.organizationId, orgId)))
    .limit(1);

  if (!cart.length) {
    return { valid: false, errors: ["Cart not found"] };
  }

  if (cart[0].type !== "order") {
    errors.push("Transaction is not an order");
  }

  const lines = await db
    .select()
    .from(transactionLines)
    .where(eq(transactionLines.transactionId, cartId));

  if (!lines.length) {
    errors.push("Cart is empty");
  }

  for (const line of lines) {
    const item = await db
      .select()
      .from(catItems)
      .where(eq(catItems.id, line.itemId))
      .limit(1);

    if (!item.length) {
      errors.push(`Item ${line.itemId} not found`);
    } else if (item[0].status !== "published") {
      errors.push(`Item ${line.itemId} is not published`);
    }
  }

  return { valid: errors.length === 0, errors };
}
