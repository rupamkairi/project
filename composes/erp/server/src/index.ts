import { Elysia } from "elysia";
import type { Mediator, EventBus, Scheduler } from "@core";

import { createVendorRoutes } from "./routes/procurement/vendors";
import { createPurchaseRequisitionRoutes } from "./routes/procurement/purchase-requisitions";
import { createPurchaseOrderRoutes } from "./routes/procurement/purchase-orders";
import { createGrnRoutes } from "./routes/procurement/goods-receipts";
import { createVendorInvoiceRoutes } from "./routes/procurement/vendor-invoices";
import { createPaymentRoutes } from "./routes/procurement/payments";

import { createCustomerRoutes } from "./routes/sales/customers";
import { createQuotationRoutes } from "./routes/sales/quotations";
import { createSalesOrderRoutes } from "./routes/sales/sales-orders";
import { createDeliveryNoteRoutes } from "./routes/sales/delivery-notes";
import { createSalesInvoiceRoutes } from "./routes/sales/sales-invoices";

import { createItemRoutes } from "./routes/inventory/items";
import { createWarehouseRoutes } from "./routes/inventory/warehouses";
import { createStockRoutes } from "./routes/inventory/stock";

import { createAccountRoutes } from "./routes/finance/accounts";
import { createFinanceReportRoutes } from "./routes/finance/reports";

import { createBomRoutes } from "./routes/manufacturing/bom";
import { createWorkOrderRoutes } from "./routes/manufacturing/work-orders";
import { createManufacturingDashboardRoutes } from "./routes/manufacturing/dashboard";

import { createDepartmentRoutes } from "./routes/hr/departments";
import { createEmployeeRoutes } from "./routes/hr/employees";
import { createLeaveRoutes } from "./routes/hr/leave";
import { createAttendanceRoutes } from "./routes/hr/attendance";

import { createSalaryStructureRoutes } from "./routes/payroll/salary-structures";
import { createPayrollEntryRoutes } from "./routes/payroll/payroll-entries";
import { createSalarySlipRoutes } from "./routes/payroll/salary-slips";

import { createGstRoutes } from "./routes/tax/gst";

import { registerErpHooks } from "./hooks/erp.hooks";
import { registerErpJobs } from "./jobs/erp.jobs";

export function createErpCompose(mediator: Mediator, bus: EventBus, scheduler: Scheduler) {
  registerErpHooks(bus);
  registerErpJobs(scheduler);

  return new Elysia({ prefix: "/erp" })
    // Procurement
    .use(createVendorRoutes(mediator))
    .use(createPurchaseRequisitionRoutes(mediator))
    .use(createPurchaseOrderRoutes(mediator))
    .use(createGrnRoutes(mediator))
    .use(createVendorInvoiceRoutes(mediator))
    .use(createPaymentRoutes(mediator))
    // Sales
    .use(createCustomerRoutes(mediator))
    .use(createQuotationRoutes(mediator))
    .use(createSalesOrderRoutes(mediator))
    .use(createDeliveryNoteRoutes(mediator))
    .use(createSalesInvoiceRoutes(mediator))
    // Inventory
    .use(createItemRoutes(mediator))
    .use(createWarehouseRoutes(mediator))
    .use(createStockRoutes(mediator))
    // Finance
    .use(createAccountRoutes(mediator))
    .use(createFinanceReportRoutes(mediator))
    // Manufacturing
    .use(createBomRoutes(mediator))
    .use(createWorkOrderRoutes(mediator))
    .use(createManufacturingDashboardRoutes(mediator))
    // HR
    .use(createDepartmentRoutes(mediator))
    .use(createEmployeeRoutes(mediator))
    .use(createLeaveRoutes(mediator))
    .use(createAttendanceRoutes(mediator))
    // Payroll
    .use(createSalaryStructureRoutes(mediator))
    .use(createPayrollEntryRoutes(mediator))
    .use(createSalarySlipRoutes(mediator))
    // Tax
    .use(createGstRoutes(mediator));
}

export { seedErp } from "./db/seed/erp.seed";
export * from "./db/schema/erp";
