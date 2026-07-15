import { Elysia } from 'elysia'
import type { Mediator, EventBus, Scheduler } from '@core'

import { createVendorRoutes } from './routes/procurement/vendors'
import { createPurchaseRequisitionRoutes } from './routes/procurement/purchase-requisitions'
import { createPurchaseOrderRoutes } from './routes/procurement/purchase-orders'
import { createGrnRoutes } from './routes/procurement/goods-receipts'
import { createVendorInvoiceRoutes } from './routes/procurement/vendor-invoices'
import { createPaymentRoutes } from './routes/procurement/payments'

import { createCustomerRoutes } from './routes/sales/customers'
import { createQuotationRoutes } from './routes/sales/quotations'
import { createSalesOrderRoutes } from './routes/sales/sales-orders'
import { createDeliveryNoteRoutes } from './routes/sales/delivery-notes'
import { createSalesInvoiceRoutes } from './routes/sales/sales-invoices'

import { createItemRoutes } from './routes/inventory/items'
import { createWarehouseRoutes } from './routes/inventory/warehouses'
import { createStockRoutes } from './routes/inventory/stock'

import { createAccountRoutes } from './routes/finance/accounts'
import { createFinanceReportRoutes } from './routes/finance/reports'

import { createBomRoutes } from './routes/manufacturing/bom'
import { createWorkOrderRoutes } from './routes/manufacturing/work-orders'
import { createManufacturingDashboardRoutes } from './routes/manufacturing/dashboard'

import { createGstRoutes } from './routes/tax/gst'

import { registerErpHooks } from './hooks/index'
import { registerErpJobs } from './jobs/index'

export function createErpCompose(mediator: Mediator, bus: EventBus, scheduler: Scheduler) {
  registerErpHooks(bus)
  registerErpJobs(scheduler)

  return (
    new Elysia({ prefix: '/erp' })
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
      // Tax
      .use(createGstRoutes(mediator))
  )
}

export { seedErp } from './db/seed/index'
export * from './db/schema/erp'
