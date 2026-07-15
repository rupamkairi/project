import { Route as ErpLayoutRoute } from './layout'
import { Route as ErpIndexRoute } from './index-page'
import { Route as ProcurementRoute } from './procurement'
import { Route as SalesRoute } from './sales'
import { Route as InventoryRoute } from './inventory'
import { Route as FinanceRoute } from './finance'
import { Route as ManufacturingRoute } from './manufacturing'
import { Route as TaxRoute } from './tax'

export const erpRoutes = [
  ErpLayoutRoute.addChildren([
    ErpIndexRoute,
    ProcurementRoute,
    SalesRoute,
    InventoryRoute,
    FinanceRoute,
    ManufacturingRoute,
    TaxRoute,
  ]),
]

export {
  ErpLayoutRoute,
  ErpIndexRoute,
  ProcurementRoute,
  SalesRoute,
  InventoryRoute,
  FinanceRoute,
  ManufacturingRoute,
  TaxRoute,
}
