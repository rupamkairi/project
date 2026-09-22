import type { AppModule, BootRegistry } from '@core'
import { bookWindowHandler } from './commands'

export const SchedulingModule: AppModule = {
  manifest: {
    id: 'scheduling',
    version: '0.1.0',
    dependsOn: ['identity', 'catalog'],
    entities: [],
    idPrefixes: { SchBooking: 'bkg_' },
    events: [],
    commands: ['scheduling.bookWindow'],
    queries: [],
    fsms: [],
    migrations: [],
  },

  async boot(registry: BootRegistry): Promise<void> {
    registry.mediator.registerCommand('scheduling.bookWindow', bookWindowHandler)
  },

  async shutdown(): Promise<void> {},
}
