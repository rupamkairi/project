import { createRoute } from "@tanstack/react-router"
import { sharedRootRoute } from "@projectx/shared-router"
import { LmsLayout } from "../../components/shared/LmsLayout"
import { LmsAdminDashboard } from "./pages/dashboard"
import { AdminCoursesPage } from "./pages/courses"
import { AdminEnrollmentsPage } from "./pages/enrollments"
import { AdminInstructorsPage } from "./pages/instructors"
import { LmsConfigPage } from "./pages/config"
import { LmsRevenueReportPage } from "./pages/revenue"
import { AdminCouponsPage } from "./pages/coupons"

export const adminLayoutRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/lms/admin",
  component: () => <LmsLayout app="admin" />,
})

export const adminDashboardRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/dashboard",
  component: LmsAdminDashboard,
})

export const adminCoursesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/courses",
  component: AdminCoursesPage,
})

export const adminEnrollmentsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/enrollments",
  component: AdminEnrollmentsPage,
})

export const adminInstructorsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/instructors",
  component: AdminInstructorsPage,
})

export const adminAnalyticsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/analytics",
  component: LmsRevenueReportPage,
})

export const adminCouponsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/coupons",
  component: AdminCouponsPage,
})

export const adminConfigRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/config",
  component: LmsConfigPage,
})

export const adminRoutes = [
  adminLayoutRoute.addChildren([
    adminDashboardRoute,
    adminCoursesRoute,
    adminEnrollmentsRoute,
    adminInstructorsRoute,
    adminAnalyticsRoute,
    adminCouponsRoute,
    adminConfigRoute,
  ]),
]
