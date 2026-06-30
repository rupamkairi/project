import { createDomainEvent, type EventBus } from "@core";

export function registerErpHooks(bus: EventBus) {
  // PO approved -> notify procurement officer
  bus.subscribe("erp.po.approved", async (event: any) => {
    const payload = event.payload ?? event;
    await bus.publish(createDomainEvent(
      "notification.send",
      payload.poId ?? payload.id ?? crypto.randomUUID(),
      "erp.po",
      {
        userId: payload.createdBy,
        message: `PO ${payload.refNo} approved`,
        type: "success",
      },
      payload.orgId,
      { actorId: payload.createdBy, correlationId: payload.correlationId, source: "erp" },
    ));
  });

  // GRN confirmed -> check reorder levels
  bus.subscribe("erp.grn.confirmed", async (event: any) => {
    const payload = event.payload ?? event;
    await bus.publish(createDomainEvent(
      "erp.inventory.check-reorder",
      payload.grnId ?? payload.id ?? crypto.randomUUID(),
      "erp.grn",
      {
        warehouseId: payload.warehouseId,
        itemIds: payload.items?.map((i: any) => i.itemId) ?? [],
      },
      payload.orgId,
      { correlationId: payload.correlationId, source: "erp" },
    ));
  });

  // Invoice 3-way match passed -> auto-schedule payment
  bus.subscribe("erp.invoice.matched", async (event: any) => {
    const payload = event.payload ?? event;
    await bus.publish(createDomainEvent(
      "erp.payment.due",
      payload.invoiceId ?? payload.id ?? crypto.randomUUID(),
      "erp.invoice",
      {
        invoiceId: payload.invoiceId,
        dueDate: payload.dueDate,
        amount: payload.amount,
      },
      payload.orgId,
      { correlationId: payload.correlationId, source: "erp" },
    ));
  });

  // Payroll submitted -> emit for ledger posting
  bus.subscribe("erp.payroll.submitted", async (event: any) => {
    const payload = event.payload ?? event;
    await bus.publish(createDomainEvent(
      "erp.finance.post-payroll-je",
      payload.payrollRunId ?? payload.id ?? crypto.randomUUID(),
      "erp.payroll",
      {
        payrollRunId: payload.payrollRunId,
        period: payload.period,
        totalNet: payload.totalNet,
      },
      payload.orgId,
      { correlationId: payload.correlationId, source: "erp" },
    ));
  });

  // Work order completed -> check BOM and reorder
  bus.subscribe("erp.workorder.completed", async (event: any) => {
    const payload = event.payload ?? event;
    await bus.publish(createDomainEvent(
      "erp.inventory.check-reorder",
      payload.workOrderId ?? payload.id ?? crypto.randomUUID(),
      "erp.workorder",
      { itemIds: payload.outputItemIds ?? [] },
      payload.orgId,
      { correlationId: payload.correlationId, source: "erp" },
    ));
  });

  // Period close -> lock all draft JEs warning
  bus.subscribe("erp.period.closing", async (event: any) => {
    const payload = event.payload ?? event;
    await bus.publish(createDomainEvent(
      "notification.broadcast",
      payload.orgId ?? crypto.randomUUID(),
      "erp.period",
      {
        orgId: payload.orgId,
        message: `Period ${payload.period} closing in 24 hours. Submit all draft journal entries.`,
        type: "warning",
      },
      payload.orgId,
      { correlationId: payload.correlationId, source: "erp" },
    ));
  });
}
