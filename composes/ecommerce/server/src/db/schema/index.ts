export { ecoRegions, type EcoRegion } from "./regions";
export { ecoTaxProfiles, type EcoTaxProfile } from "./tax-profiles";
export { ecoTaxRates, type EcoTaxRate } from "./tax-rates";
export { ecoShippingOptions, type EcoShippingOption } from "./shipping-options";
export { ecoCustomerGroups, ecoCustomerGroupMembers, type EcoCustomerGroup, type EcoCustomerGroupMember } from "./customer-groups";
export { ecoReturns, ecoReturnItems, type EcoReturn, type EcoReturnItem } from "./returns";
export { ecoClaims, type EcoClaim } from "./claims";
export { ecoSwaps, ecoSwapItems, ecoSwapNewItems, type EcoSwap, type EcoSwapItem, type EcoSwapNewItem } from "./swaps";
export { ecoDraftOrders, ecoDraftOrderItems, type EcoDraftOrder, type EcoDraftOrderItem } from "./draft-orders";
export { ecoOrderEdits, ecoOrderEditItems, type EcoOrderEdit, type EcoOrderEditItem } from "./order-edits";
export { ecoGiftCards, type EcoGiftCard } from "./gift-cards";
export { ecoFulfillments, ecoFulfillmentItems, type EcoFulfillment, type EcoFulfillmentItem } from "./fulfillments";
export { ecoCart, type EcoCart } from "./cart";

// Core catalog tables — re-exported for compose route access
export {
  catItems,
  catVariants,
  catCategories,
  catPriceLists,
  catPriceRules,
  type CatItem,
  type CatVariant,
  type CatCategory,
  type CatPriceList,
  type CatPriceRule,
} from "@db/schema/catalog";
export {
  transactions,
  transactionLines,
  type Transaction,
  type TransactionLine,
} from "@db/schema/commerce";
export {
  persons,
  type Person,
} from "@db/schema/party";
