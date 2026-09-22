import type { AppModule, BootRegistry } from '@core'
import { startProcessHandler, completeProcessHandler } from './commands'

export const WorkflowModule: AppModule = {
  manifest: {
    id: 'workflow',
    version: '0.1.0',
    dependsOn: ['identity'],
    entities: [],
    idPrefixes: { WfProcess: 'wfp_' },
    events: [],
    commands: ['workflow.startProcess', 'workflow.completeProcess'],
    queries: [],
    fsms: [],
    migrations: [],
  },

  async boot(registry: BootRegistry): Promise<void> {
    registry.mediator.registerCommand('workflow.startProcess', startProcessHandler)
    registry.mediator.registerCommand('workflow.completeProcess', completeProcessHandler)
  },

  async shutdown(): Promise<void> {},
}
