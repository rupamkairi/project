import type { AppModule, BootRegistry } from '@core'
import {
  createBomHandler,
  activateBomHandler,
  createPriceListHandler,
  updatePriceListHandler,
  createPriceRuleHandler,
  updatePriceRuleHandler,
  createItemHandler,
  updateItemHandler,
  deleteItemHandler,
  setItemStatusHandler,
  createVariantHandler,
  updateVariantHandler,
  deleteVariantHandler,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
} from './commands'
import {
  listBomsHandler,
  getBomHandler,
  resolvePriceHandler,
  listPriceListsHandler,
  listPriceRulesHandler,
  listItemsHandler,
  getItemHandler,
  listVariantsHandler,
  listCategoriesHandler,
  getCategoryHandler,
} from './queries'

export const CatalogModule: AppModule = {
  manifest: {
    id: 'catalog',
    version: '0.1.0',
    dependsOn: [],
    entities: [],
    idPrefixes: { CatBom: 'bom_' },
    events: [],
    commands: [
      'catalog.createBom',
      'catalog.activateBom',
      'catalog.createPriceList',
      'catalog.updatePriceList',
      'catalog.createPriceRule',
      'catalog.updatePriceRule',
      'catalog.createItem',
      'catalog.updateItem',
      'catalog.deleteItem',
      'catalog.setItemStatus',
      'catalog.createVariant',
      'catalog.updateVariant',
      'catalog.deleteVariant',
      'catalog.createCategory',
      'catalog.updateCategory',
      'catalog.deleteCategory',
    ],
    queries: [
      'catalog.listBoms',
      'catalog.getBom',
      'catalog.resolvePrice',
      'catalog.listPriceLists',
      'catalog.listPriceRules',
      'catalog.listItems',
      'catalog.getItem',
      'catalog.listVariants',
      'catalog.listCategories',
      'catalog.getCategory',
    ],
    fsms: [],
    migrations: [],
  },

  async boot(registry: BootRegistry): Promise<void> {
    const { mediator } = registry
    mediator.registerCommand('catalog.createBom', createBomHandler)
    mediator.registerCommand('catalog.activateBom', activateBomHandler)
    mediator.registerCommand('catalog.createPriceList', createPriceListHandler)
    mediator.registerCommand('catalog.updatePriceList', updatePriceListHandler)
    mediator.registerCommand('catalog.createPriceRule', createPriceRuleHandler)
    mediator.registerCommand('catalog.updatePriceRule', updatePriceRuleHandler)
    mediator.registerCommand('catalog.createItem', createItemHandler)
    mediator.registerCommand('catalog.updateItem', updateItemHandler)
    mediator.registerCommand('catalog.deleteItem', deleteItemHandler)
    mediator.registerCommand('catalog.setItemStatus', setItemStatusHandler)
    mediator.registerCommand('catalog.createVariant', createVariantHandler)
    mediator.registerCommand('catalog.updateVariant', updateVariantHandler)
    mediator.registerCommand('catalog.deleteVariant', deleteVariantHandler)
    mediator.registerCommand('catalog.createCategory', createCategoryHandler)
    mediator.registerCommand('catalog.updateCategory', updateCategoryHandler)
    mediator.registerCommand('catalog.deleteCategory', deleteCategoryHandler)
    mediator.registerQuery('catalog.listBoms', listBomsHandler)
    mediator.registerQuery('catalog.getBom', getBomHandler)
    mediator.registerQuery('catalog.resolvePrice', resolvePriceHandler)
    mediator.registerQuery('catalog.listPriceLists', listPriceListsHandler)
    mediator.registerQuery('catalog.listPriceRules', listPriceRulesHandler)
    mediator.registerQuery('catalog.listItems', listItemsHandler)
    mediator.registerQuery('catalog.getItem', getItemHandler)
    mediator.registerQuery('catalog.listVariants', listVariantsHandler)
    mediator.registerQuery('catalog.listCategories', listCategoriesHandler)
    mediator.registerQuery('catalog.getCategory', getCategoryHandler)
  },

  async shutdown(): Promise<void> {},
}
