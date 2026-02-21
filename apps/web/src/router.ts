import { createRouter } from "@tanstack/react-router";
import { Route as rootRoute } from "./routes/__root";
import { Route as indexRoute } from "./routes/index";
import { Route as aboutRoute } from "./routes/about";
import { Route as contactRoute } from "./routes/contact";

import { Route as lmsLoginRoute } from "./modules/lms/routes/login";
import { Route as lmsLayoutRoute } from "./modules/lms/routes/layout";
import { Route as lmsDashboardIndexRoute } from "./modules/lms/routes/dashboard/index";

import { Route as lmsAnalyticsIndexRoute } from "./modules/lms/routes/analytics/index";
import { Route as lmsAnalyticsRevenueRoute } from "./modules/lms/routes/analytics/revenue";
import { Route as lmsAnalyticsCoursesRoute } from "./modules/lms/routes/analytics/courses";
import { Route as lmsAnalyticsInstructorsRoute } from "./modules/lms/routes/analytics/instructors";

import { Route as lmsCoursesIndexRoute } from "./modules/lms/routes/courses/index";
import { Route as lmsCourseIdRoute } from "./modules/lms/routes/courses/$courseId";

import { Route as lmsReviewQueueIndexRoute } from "./modules/lms/routes/review-queue/index";
import { Route as lmsReviewQueueWorkflowRoute } from "./modules/lms/routes/review-queue/$workflowInstanceId";

import { Route as lmsLearnersIndexRoute } from "./modules/lms/routes/learners/index";
import { Route as lmsLearnerIdRoute } from "./modules/lms/routes/learners/$learnerId";

import { Route as lmsEnrollmentsIndexRoute } from "./modules/lms/routes/enrollments/index";

import { Route as lmsCertificatesIndexRoute } from "./modules/lms/routes/certificates/index";
import { Route as lmsCertificateIdRoute } from "./modules/lms/routes/certificates/$certId";

import { Route as lmsNotificationsIndexRoute } from "./modules/lms/routes/notifications/index";
import { Route as lmsNotificationsTemplateRoute } from "./modules/lms/routes/notifications/$templateKey";

import { Route as lmsSettingsIndexRoute } from "./modules/lms/routes/settings/index";
import { Route as lmsSettingsPaymentsRoute } from "./modules/lms/routes/settings/payments";
import { Route as lmsSettingsTeamRoute } from "./modules/lms/routes/settings/team";

const routeTree = rootRoute.addChildren([
  indexRoute,
  aboutRoute,
  contactRoute,
  lmsLoginRoute,
  lmsLayoutRoute.addChildren([
    lmsDashboardIndexRoute,
    lmsAnalyticsIndexRoute,
    lmsAnalyticsRevenueRoute,
    lmsAnalyticsCoursesRoute,
    lmsAnalyticsInstructorsRoute,
    lmsCoursesIndexRoute,
    lmsCourseIdRoute,
    lmsReviewQueueIndexRoute,
    lmsReviewQueueWorkflowRoute,
    lmsLearnersIndexRoute,
    lmsLearnerIdRoute,
    lmsEnrollmentsIndexRoute,
    lmsCertificatesIndexRoute,
    lmsCertificateIdRoute,
    lmsNotificationsIndexRoute,
    lmsNotificationsTemplateRoute,
    lmsSettingsIndexRoute,
    lmsSettingsPaymentsRoute,
    lmsSettingsTeamRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
