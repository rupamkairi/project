import type { AppModule, BootRegistry } from '@core'
import { createTemplateHandler, createRateHandler, updateRateHandler, deleteRateHandler } from './commands'
import { resolveRateHandler, listTemplatesHandler, listRatesHandler } from './queries'

export const TaxModule: AppModule = {
  manifest: {
    id: 'tax',
    version: '0.1.0',
    dependsOn: [],
    entities: [],
    idPrefixes: {},
    events: [],
    commands: ['tax.createTemplate', 'tax.createRate', 'tax.updateRate', 'tax.deleteRate'],
    queries: ['tax.resolveRate', 'tax.listTemplates', 'tax.listRates'],
    fsms: [],
    migrations: [],
  },

  async boot(registry: BootRegistry): Promise<void> {
    registry.mediator.registerCommand('tax.createTemplate', createTemplateHandler)
    registry.mediator.registerCommand('tax.createRate', createRateHandler)
    registry.mediator.registerCommand('tax.updateRate', updateRateHandler)
    registry.mediator.registerCommand('tax.deleteRate', deleteRateHandler)
    registry.mediator.registerQuery('tax.resolveRate', resolveRateHandler)
    registry.mediator.registerQuery('tax.listTemplates', listTemplatesHandler)
    registry.mediator.registerQuery('tax.listRates', listRatesHandler)
  },

  async shutdown(): Promise<void> {},
}
