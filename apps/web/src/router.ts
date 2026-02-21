import { createRouter } from "@tanstack/react-router";
import { Route as rootRoute } from "./routes/__root";
import { Route as indexRoute } from "./routes/index";
import { Route as loginRoute } from "./routes/login";
import { Route as dashboardLayoutRoute } from "./routes/__dashboard";
import { Route as dashboardIndexRoute } from "./routes/dashboard/index";

import { Route as analyticsIndexRoute } from "./routes/analytics/index";
import { Route as analyticsRevenueRoute } from "./routes/analytics/revenue";
import { Route as analyticsCoursesRoute } from "./routes/analytics/courses";
import { Route as analyticsInstructorsRoute } from "./routes/analytics/instructors";

import { Route as coursesIndexRoute } from "./routes/courses/index";
import { Route as courseIdRoute } from "./routes/courses/$courseId";

import { Route as reviewQueueIndexRoute } from "./routes/review-queue/index";
import { Route as reviewQueueWorkflowRoute } from "./routes/review-queue/$workflowInstanceId";

import { Route as learnersIndexRoute } from "./routes/learners/index";
import { Route as learnerIdRoute } from "./routes/learners/$learnerId";

import { Route as enrollmentsIndexRoute } from "./routes/enrollments/index";

import { Route as certificatesIndexRoute } from "./routes/certificates/index";
import { Route as certificateIdRoute } from "./routes/certificates/$certId";

import { Route as notificationsIndexRoute } from "./routes/notifications/index";
import { Route as notificationsTemplateRoute } from "./routes/notifications/$templateKey";

import { Route as settingsIndexRoute } from "./routes/settings/index";
import { Route as settingsPaymentsRoute } from "./routes/settings/payments";
import { Route as settingsTeamRoute } from "./routes/settings/team";

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  dashboardLayoutRoute.addChildren([
    dashboardIndexRoute,
    analyticsIndexRoute,
    analyticsRevenueRoute,
    analyticsCoursesRoute,
    analyticsInstructorsRoute,
    coursesIndexRoute,
    courseIdRoute,
    reviewQueueIndexRoute,
    reviewQueueWorkflowRoute,
    learnersIndexRoute,
    learnerIdRoute,
    enrollmentsIndexRoute,
    certificatesIndexRoute,
    certificateIdRoute,
    notificationsIndexRoute,
    notificationsTemplateRoute,
    settingsIndexRoute,
    settingsPaymentsRoute,
    settingsTeamRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
