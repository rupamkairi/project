import { Route as ErpLayoutRoute } from "./erp.layout";
import { Route as ErpIndexRoute } from "./erp.index";
import { Route as ProcurementRoute } from "./erp.procurement";
import { Route as SalesRoute } from "./erp.sales";
import { Route as InventoryRoute } from "./erp.inventory";
import { Route as FinanceRoute } from "./erp.finance";
import { Route as ManufacturingRoute } from "./erp.manufacturing";
import { Route as HrRoute } from "./erp.hr";
import { Route as PayrollRoute } from "./erp.payroll";
import { Route as TaxRoute } from "./erp.tax";

export const erpRoutes = [
  ErpLayoutRoute.addChildren([
    ErpIndexRoute,
    ProcurementRoute,
    SalesRoute,
    InventoryRoute,
    FinanceRoute,
    ManufacturingRoute,
    HrRoute,
    PayrollRoute,
    TaxRoute,
  ]),
];

export {
  ErpLayoutRoute,
  ErpIndexRoute,
  ProcurementRoute,
  SalesRoute,
  InventoryRoute,
  FinanceRoute,
  ManufacturingRoute,
  HrRoute,
  PayrollRoute,
  TaxRoute,
};
