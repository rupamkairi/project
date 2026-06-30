import type { Scheduler } from "@core";
import { db } from "@db/client";
import { eq, lte, and } from "drizzle-orm";
import { erpAsset, erpAssetDepreciation, erpPayrollRun } from "../db/schema/erp";
import { transactions } from "@db/schema/commerce";

export function registerErpJobs(scheduler: Scheduler) {
  // Daily: depreciate assets
  scheduler.add("erp.depreciate-assets", "0 2 * * *", async () => {
    const assets = await db.select().from(erpAsset)
      .where(and(eq(erpAsset.status, "active")));

    const today = new Date();
    for (const asset of assets) {
      const purchaseDate = new Date(asset.purchaseDate);
      const ageMonths = (today.getFullYear() - purchaseDate.getFullYear()) * 12
        + (today.getMonth() - purchaseDate.getMonth());

      const usefulLifeMonths = Number(asset.usefulLifeMonths ?? 60);
      if (ageMonths >= usefulLifeMonths) {
        await db.update(erpAsset).set({ status: "fully-depreciated" }).where(eq(erpAsset.id, asset.id));
        continue;
      }

      const monthlyDepreciation = Number(asset.purchaseValue ?? 0) / usefulLifeMonths;
      const [dep] = await db.insert(erpAssetDepreciation).values({
        assetId: asset.id,
        date: today,
        amount: String(monthlyDepreciation.toFixed(2)),
        method: (asset.depreciationMethod as string) ?? "straight-line",
      }).returning().catch(() => [null]);

      if (dep) {
        const newBook = Math.max(0, Number(asset.bookValue ?? asset.purchaseValue) - monthlyDepreciation);
        await db.update(erpAsset).set({
          bookValue: String(newBook.toFixed(2)),
        }).where(eq(erpAsset.id, asset.id));
      }
    }
  });

  // Daily: flag overdue invoices
  scheduler.add("erp.flag-overdue-invoices", "0 6 * * *", async () => {
    const today = new Date();
    const invoices = await db.select().from(transactions)
      .where(and(eq(transactions.type, "invoice")));

    for (const inv of invoices) {
      const meta = inv.meta as any;
      if (meta?.direction === "inbound" && inv.status === "approved") {
        const dueDate = meta?.dueDate ? new Date(meta.dueDate) : null;
        if (dueDate && dueDate < today) {
          await db.update(transactions).set({
            status: "overdue",
          }).where(eq(transactions.id, inv.id));
        }
      }
    }
  });

  // Monthly on 25th: create draft payroll run
  scheduler.add("erp.create-monthly-payroll", "0 9 25 * *", async () => {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Get all orgs with ERP (in real impl: query org settings)
    // Placeholder: emit event for orchestration layer
    await db.insert(erpPayrollRun).values({
      organizationId: "default",
      period,
      status: "draft",
    }).onConflictDoNothing();
  });

  // Daily: send stock reorder alerts
  scheduler.add("erp.stock-reorder-alerts", "0 8 * * *", async () => {
    // Aggregated by inventory module; job just ensures check runs daily
    // Real impl: mediator.dispatch("erp.CheckReorderLevels", { all: true })
  });
}
