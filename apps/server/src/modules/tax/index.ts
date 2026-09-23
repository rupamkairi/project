import type { AppModule, BootRegistry } from '@core'
import { resolveRateHandler } from './queries'

export const TaxModule: AppModule = {
  manifest: {
    id: 'tax',
    version: '0.1.0',
    dependsOn: [],
    entities: [],
    idPrefixes: {},
    events: [],
    commands: [],
    queries: ['tax.resolveRate'],
    fsms: [],
    migrations: [],
  },

  async boot(registry: BootRegistry): Promise<void> {
    registry.mediator.registerQuery('tax.resolveRate', resolveRateHandler)
  },

  async shutdown(): Promise<void> {},
}
