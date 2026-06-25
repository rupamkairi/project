import { createRoute } from "@tanstack/react-router"
import { sharedRootRoute } from "@projectx/shared-router"
import { LmsLayout } from "../../components/shared/LmsLayout"
import { InstructorDashboard } from "./pages/dashboard"
import { InstructorCoursesPage } from "./pages/courses"
import { NewCoursePage } from "./pages/courses/NewCoursePage"
import { CourseEditorPage } from "./pages/course-editor"
import { CourseAnalyticsPage } from "./pages/analytics"
import { InstructorAnalyticsOverviewPage } from "./pages/analytics-overview"

export const instructorLayoutRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/teach",
  component: () => <LmsLayout app="instructor" />,
})

export const instructorDashboardRoute = createRoute({
  getParentRoute: () => instructorLayoutRoute,
  path: "/dashboard",
  component: InstructorDashboard,
})

export const instructorCoursesRoute = createRoute({
  getParentRoute: () => instructorLayoutRoute,
  path: "/courses",
  component: InstructorCoursesPage,
})

export const instructorNewCourseRoute = createRoute({
  getParentRoute: () => instructorLayoutRoute,
  path: "/courses/new",
  component: NewCoursePage,
})

export const instructorCourseEditorRoute = createRoute({
  getParentRoute: () => instructorLayoutRoute,
  path: "/courses/$id/edit",
  component: CourseEditorPage,
})

export const instructorCourseAnalyticsRoute = createRoute({
  getParentRoute: () => instructorLayoutRoute,
  path: "/courses/$id/analytics",
  component: CourseAnalyticsPage,
})

export const instructorAnalyticsOverviewRoute = createRoute({
  getParentRoute: () => instructorLayoutRoute,
  path: "/analytics",
  component: InstructorAnalyticsOverviewPage,
})

export const instructorRoutes = [
  instructorLayoutRoute.addChildren([
    instructorDashboardRoute,
    instructorCoursesRoute,
    instructorNewCourseRoute,
    instructorCourseEditorRoute,
    instructorCourseAnalyticsRoute,
    instructorAnalyticsOverviewRoute,
  ]),
]
