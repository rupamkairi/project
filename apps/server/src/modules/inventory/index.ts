import type { AppModule, BootRegistry } from '@core'
import { recordMovementHandler } from './commands'
import { listStockUnitsHandler, listMovementsHandler } from './queries'

export const InventoryModule: AppModule = {
  manifest: {
    id: 'inventory',
    version: '0.1.0',
    dependsOn: ['catalog'],
    entities: [],
    idPrefixes: { InvMovement: 'mvt_' },
    events: ['inventory.moved'],
    commands: ['inventory.recordMovement'],
    queries: ['inventory.listStockUnits', 'inventory.listMovements'],
    fsms: [],
    migrations: [],
  },

  async boot(registry: BootRegistry): Promise<void> {
    const { mediator } = registry
    mediator.registerCommand('inventory.recordMovement', recordMovementHandler)
    mediator.registerQuery('inventory.listStockUnits', listStockUnitsHandler)
    mediator.registerQuery('inventory.listMovements', listMovementsHandler)
  },

  async shutdown(): Promise<void> {},
}
