import type { AppModule, BootRegistry } from '@core'
import {
  createBomHandler,
  activateBomHandler,
  createPriceListHandler,
  updatePriceListHandler,
  createPriceRuleHandler,
  updatePriceRuleHandler,
} from './commands'
import {
  listBomsHandler,
  getBomHandler,
  resolvePriceHandler,
  listPriceListsHandler,
  listPriceRulesHandler,
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
    ],
    queries: [
      'catalog.listBoms',
      'catalog.getBom',
      'catalog.resolvePrice',
      'catalog.listPriceLists',
      'catalog.listPriceRules',
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
    mediator.registerQuery('catalog.listBoms', listBomsHandler)
    mediator.registerQuery('catalog.getBom', getBomHandler)
    mediator.registerQuery('catalog.resolvePrice', resolvePriceHandler)
    mediator.registerQuery('catalog.listPriceLists', listPriceListsHandler)
    mediator.registerQuery('catalog.listPriceRules', listPriceRulesHandler)
  },

  async shutdown(): Promise<void> {},
}
