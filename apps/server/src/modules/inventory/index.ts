import type { AppModule, BootRegistry } from '@core'
import { recordMovementHandler, reserveHandler, releaseHandler, deductHandler } from './commands'
import { listStockUnitsHandler, listMovementsHandler, getAvailabilityHandler } from './queries'

export const InventoryModule: AppModule = {
  manifest: {
    id: 'inventory',
    version: '0.1.0',
    dependsOn: ['catalog'],
    entities: [],
    idPrefixes: { InvMovement: 'mvt_' },
    events: ['inventory.moved', 'inventory.reserved', 'inventory.released', 'inventory.deducted'],
    commands: [
      'inventory.recordMovement',
      'inventory.reserve',
      'inventory.release',
      'inventory.deduct',
    ],
    queries: ['inventory.listStockUnits', 'inventory.listMovements', 'inventory.getAvailability'],
    fsms: [],
    migrations: [],
  },

  async boot(registry: BootRegistry): Promise<void> {
    const { mediator } = registry
    mediator.registerCommand('inventory.recordMovement', recordMovementHandler)
    mediator.registerCommand('inventory.reserve', reserveHandler)
    mediator.registerCommand('inventory.release', releaseHandler)
    mediator.registerCommand('inventory.deduct', deductHandler)
    mediator.registerQuery('inventory.listStockUnits', listStockUnitsHandler)
    mediator.registerQuery('inventory.listMovements', listMovementsHandler)
    mediator.registerQuery('inventory.getAvailability', getAvailabilityHandler)
  },

  async shutdown(): Promise<void> {},
}
