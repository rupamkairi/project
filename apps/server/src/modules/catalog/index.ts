import type { AppModule, BootRegistry } from '@core'
import { createBomHandler, activateBomHandler } from './commands'
import { listBomsHandler, getBomHandler } from './queries'

export const CatalogModule: AppModule = {
  manifest: {
    id: 'catalog',
    version: '0.1.0',
    dependsOn: [],
    entities: [],
    idPrefixes: { CatBom: 'bom_' },
    events: [],
    commands: ['catalog.createBom', 'catalog.activateBom'],
    queries: ['catalog.listBoms', 'catalog.getBom'],
    fsms: [],
    migrations: [],
  },

  async boot(registry: BootRegistry): Promise<void> {
    const { mediator } = registry
    mediator.registerCommand('catalog.createBom', createBomHandler)
    mediator.registerCommand('catalog.activateBom', activateBomHandler)
    mediator.registerQuery('catalog.listBoms', listBomsHandler)
    mediator.registerQuery('catalog.getBom', getBomHandler)
  },

  async shutdown(): Promise<void> {},
}
