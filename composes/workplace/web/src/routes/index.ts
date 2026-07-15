import { Route as WorkplaceLayoutRoute } from './layout'
import { Route as WorkplaceIndexRoute } from './dashboard'
import { Route as RecruitmentRoute } from './recruitment'
import { Route as OnboardingRoute } from './onboarding'
import { Route as PeopleRoute } from './people'
import { Route as TimeRoute } from './time'
import { Route as PerformanceRoute } from './performance'
import { Route as PayrollRoute } from './payroll'
import { Route as ExpensesRoute } from './expenses'
import { Route as OfficeRoute } from './office'
import { Route as ReportsRoute } from './reports'
import { Route as MyWorkplaceRoute } from './my'
import { Route as SettingsRoute } from './settings'

export const workplaceRoutes = [
  WorkplaceLayoutRoute.addChildren([
    WorkplaceIndexRoute,
    RecruitmentRoute,
    OnboardingRoute,
    PeopleRoute,
    TimeRoute,
    PerformanceRoute,
    PayrollRoute,
    ExpensesRoute,
    OfficeRoute,
    ReportsRoute,
    MyWorkplaceRoute,
    SettingsRoute,
  ]),
]

export {
  WorkplaceLayoutRoute,
  WorkplaceIndexRoute,
  RecruitmentRoute,
  OnboardingRoute,
  PeopleRoute,
  TimeRoute,
  PerformanceRoute,
  PayrollRoute,
  ExpensesRoute,
  OfficeRoute,
  ReportsRoute,
  MyWorkplaceRoute,
  SettingsRoute,
}
