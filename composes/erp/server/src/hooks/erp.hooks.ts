import type { EventBus } from "@core";

export function registerErpHooks(bus: EventBus) {
  // PO approved -> notify procurement officer
  bus.on("erp.po.approved", async (event: any) => {
    await bus.emit("notification.send", {
      userId: event.createdBy,
      message: `PO ${event.refNo} approved`,
      type: "success",
    });
  });

  // GRN confirmed -> check reorder levels
  bus.on("erp.grn.confirmed", async (event: any) => {
    await bus.emit("erp.inventory.check-reorder", {
      warehouseId: event.warehouseId,
      itemIds: event.items?.map((i: any) => i.itemId) ?? [],
    });
  });

  // Invoice 3-way match passed -> auto-schedule payment
  bus.on("erp.invoice.matched", async (event: any) => {
    await bus.emit("erp.payment.due", {
      invoiceId: event.invoiceId,
      dueDate: event.dueDate,
      amount: event.amount,
    });
  });

  // Payroll submitted -> emit for ledger posting
  bus.on("erp.payroll.submitted", async (event: any) => {
    await bus.emit("erp.finance.post-payroll-je", {
      payrollRunId: event.payrollRunId,
      period: event.period,
      totalNet: event.totalNet,
    });
  });

  // Work order completed -> check BOM and reorder
  bus.on("erp.workorder.completed", async (event: any) => {
    await bus.emit("erp.inventory.check-reorder", {
      itemIds: event.outputItemIds ?? [],
    });
  });

  // Period close -> lock all draft JEs warning
  bus.on("erp.period.closing", async (event: any) => {
    await bus.emit("notification.broadcast", {
      orgId: event.orgId,
      message: `Period ${event.period} closing in 24 hours. Submit all draft journal entries.`,
      type: "warning",
    });
  });
}
