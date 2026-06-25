import { ecommerceStorefrontLayoutRoute } from "./store.layout";
import { ecommerceStorefrontIndexRoute } from "./store.index";
import { ecoStoreProductsRoute } from "./products";
import { ecoStoreProductDetailRoute } from "./product-detail";
import { ecoStoreSearchRoute } from "./search";
import { ecoStoreCategoriesRoute, ecoStoreCategoryDetailRoute } from "./categories";
import { ecoStoreCartRoute } from "./cart";
import { ecoStoreCheckoutRoute } from "./checkout";
import { ecoStoreLoginRoute, ecoStoreRegisterRoute, ecoStoreForgotRoute } from "./auth";
import { ecoStoreAccountRoute, ecoStoreAccountOrderDetailRoute } from "./account";

export const ecommerceStorefrontRoutes = [
  ecommerceStorefrontLayoutRoute.addChildren([
    ecommerceStorefrontIndexRoute,
    ecoStoreProductsRoute,
    ecoStoreProductDetailRoute,
    ecoStoreSearchRoute,
    ecoStoreCategoriesRoute,
    ecoStoreCategoryDetailRoute,
    ecoStoreCartRoute,
    ecoStoreCheckoutRoute,
    ecoStoreLoginRoute,
    ecoStoreRegisterRoute,
    ecoStoreForgotRoute,
    ecoStoreAccountRoute,
    ecoStoreAccountOrderDetailRoute,
  ]),
];
