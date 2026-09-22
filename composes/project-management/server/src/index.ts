import Elysia from 'elysia'
import type { Mediator } from '@core'
import { createPortfolioRoutes } from './routes/portfolios'
import { createProjectsRoutes } from './routes/projects'
import { createWorkItemsRoutes } from './routes/work-items'
import { createSprintsRoutes } from './routes/sprints'
import { createBoardsRoutes } from './routes/boards'
import { createCommentsRoutes } from './routes/comments'
import { createWorklogsRoutes } from './routes/worklogs'
import { createClientsRoutes } from './routes/clients'
import { createPsaRoutes } from './routes/psa'
import { createReportsRoutes } from './routes/reports'
import { createMyWorkRoutes } from './routes/my-work'

export function createProjectManagementCompose(mediator: Mediator) {
  return new Elysia({ prefix: '/projects' })
    .use(createPortfolioRoutes(mediator))
    .use(createProjectsRoutes(mediator))
    .use(createWorkItemsRoutes(mediator))
    .use(createSprintsRoutes(mediator))
    .use(createBoardsRoutes(mediator))
    .use(createCommentsRoutes(mediator))
    .use(createWorklogsRoutes(mediator))
    .use(createClientsRoutes(mediator))
    .use(createPsaRoutes(mediator))
    .use(createReportsRoutes(mediator))
    .use(createMyWorkRoutes(mediator))
}

export { seedProjectManagement } from './db/seed/project-management'
export { projectManagementAccessManifest } from './access/manifest'
export * from './db/schema/project-management'
export { registerProjectManagementHooks } from './hooks'
export { registerProjectManagementJobs } from './jobs'
export type { PjmJobScheduler } from './jobs'
export type { EventBus } from './hooks'
