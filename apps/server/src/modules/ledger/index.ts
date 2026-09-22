import type { AppModule, BootRegistry } from '@core'
import {
  createAccountHandler,
  updateAccountHandler,
  createJournalHandler,
  postJournalHandler,
  voidJournalHandler,
} from './commands'
import {
  listAccountsHandler,
  getAccountHandler,
  getAccountBalanceHandler,
  listJournalsHandler,
  getJournalHandler,
} from './queries'

export const LedgerModule: AppModule = {
  manifest: {
    id: 'ledger',
    version: '0.1.0',
    dependsOn: [],
    entities: [],
    idPrefixes: { LdgAccount: 'acc_', LdgTransaction: 'jnl_' },
    events: [
      'ledger.account.created',
      'ledger.account.updated',
      'ledger.journal.created',
      'ledger.journal.posted',
      'ledger.journal.voided',
    ],
    commands: [
      'ledger.createAccount',
      'ledger.updateAccount',
      'ledger.createJournal',
      'ledger.postJournal',
      'ledger.voidJournal',
    ],
    queries: [
      'ledger.listAccounts',
      'ledger.getAccount',
      'ledger.getAccountBalance',
      'ledger.listJournals',
      'ledger.getJournal',
    ],
    fsms: [],
    migrations: [],
  },

  async boot(registry: BootRegistry): Promise<void> {
    const { mediator } = registry
    mediator.registerCommand('ledger.createAccount', createAccountHandler)
    mediator.registerCommand('ledger.updateAccount', updateAccountHandler)
    mediator.registerCommand('ledger.createJournal', createJournalHandler)
    mediator.registerCommand('ledger.postJournal', postJournalHandler)
    mediator.registerCommand('ledger.voidJournal', voidJournalHandler)
    mediator.registerQuery('ledger.listAccounts', listAccountsHandler)
    mediator.registerQuery('ledger.getAccount', getAccountHandler)
    mediator.registerQuery('ledger.getAccountBalance', getAccountBalanceHandler)
    mediator.registerQuery('ledger.listJournals', listJournalsHandler)
    mediator.registerQuery('ledger.getJournal', getJournalHandler)
  },

  async shutdown(): Promise<void> {},
}
