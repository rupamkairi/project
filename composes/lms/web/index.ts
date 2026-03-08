import { Route as loginRoute } from "./routes/login";
import { Route as layoutRoute } from "./routes/layout";
import { Route as dashboardRoute } from "./routes/dashboard/index";
import { Route as analyticsIndexRoute } from "./routes/analytics/index";
import { Route as analyticsRevenueRoute } from "./routes/analytics/revenue";
import { Route as analyticsCoursesRoute } from "./routes/analytics/courses";
import { Route as analyticsInstructorsRoute } from "./routes/analytics/instructors";
import { Route as coursesIndexRoute } from "./routes/courses/index";
import { Route as courseDetailRoute } from "./routes/courses/$courseId";
import { Route as reviewQueueIndexRoute } from "./routes/review-queue/index";
import { Route as reviewQueueWorkflowRoute } from "./routes/review-queue/$workflowInstanceId";
import { Route as learnersIndexRoute } from "./routes/learners/index";
import { Route as learnerDetailRoute } from "./routes/learners/$learnerId";
import { Route as enrollmentsIndexRoute } from "./routes/enrollments/index";
import { Route as certificatesIndexRoute } from "./routes/certificates/index";
import { Route as certificateDetailRoute } from "./routes/certificates/$certId";
import { Route as notificationsIndexRoute } from "./routes/notifications/index";
import { Route as notificationsTemplateRoute } from "./routes/notifications/$templateKey";
import { Route as settingsIndexRoute } from "./routes/settings/index";
import { Route as settingsPaymentsRoute } from "./routes/settings/payments";
import { Route as settingsTeamRoute } from "./routes/settings/team";
import { lmsMeta, lmsNavigation } from "./config";

export * from "./types";
export * from "./lib/mock-data";
export * from "./lib/store";
export { lmsNavigation, lmsMeta } from "./config";
export type { NavItem, NavGroup, NavigationItem } from "./config";

export {
  loginRoute,
  layoutRoute,
  dashboardRoute,
  analyticsIndexRoute,
  analyticsRevenueRoute,
  analyticsCoursesRoute,
  analyticsInstructorsRoute,
  coursesIndexRoute,
  courseDetailRoute,
  reviewQueueIndexRoute,
  reviewQueueWorkflowRoute,
  learnersIndexRoute,
  learnerDetailRoute,
  enrollmentsIndexRoute,
  certificatesIndexRoute,
  certificateDetailRoute,
  notificationsIndexRoute,
  notificationsTemplateRoute,
  settingsIndexRoute,
  settingsPaymentsRoute,
  settingsTeamRoute,
};

export const childRoutes = [
  dashboardRoute,
  analyticsIndexRoute,
  analyticsRevenueRoute,
  analyticsCoursesRoute,
  analyticsInstructorsRoute,
  coursesIndexRoute,
  courseDetailRoute,
  reviewQueueIndexRoute,
  reviewQueueWorkflowRoute,
  learnersIndexRoute,
  learnerDetailRoute,
  enrollmentsIndexRoute,
  certificatesIndexRoute,
  certificateDetailRoute,
  notificationsIndexRoute,
  notificationsTemplateRoute,
  settingsIndexRoute,
  settingsPaymentsRoute,
  settingsTeamRoute,
] as const;

export const navigation = lmsNavigation;
export const meta = lmsMeta;

export const lmsWebCompose = {
  id: "lms",
  loginRoute,
  layoutRoute,
  childRoutes,
  navigation,
  meta,
} as const;
