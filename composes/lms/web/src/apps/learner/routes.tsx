import { createRoute } from "@tanstack/react-router"
import { sharedRootRoute } from "@projectx/shared-router"
import { LmsLayout } from "../../components/shared/LmsLayout"
import { LearnerDashboard } from "./pages/dashboard"
import { CatalogPage } from "./pages/catalog"
import { CourseDetailPage } from "./pages/course-detail"
import { ModulePlayerPage } from "./pages/module-player"
import { CertificatesPage } from "./pages/certificates"

export const learnerLayoutRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/learn",
  component: () => <LmsLayout app="learner" />,
})

export const learnerDashboardRoute = createRoute({
  getParentRoute: () => learnerLayoutRoute,
  path: "/dashboard",
  component: LearnerDashboard,
})

export const learnerCatalogRoute = createRoute({
  getParentRoute: () => learnerLayoutRoute,
  path: "/catalog",
  component: CatalogPage,
})

export const learnerCourseDetailRoute = createRoute({
  getParentRoute: () => learnerLayoutRoute,
  path: "/courses/$slug",
  component: CourseDetailPage,
})

export const learnerModulePlayerRoute = createRoute({
  getParentRoute: () => learnerLayoutRoute,
  path: "/courses/$slug/modules/$moduleId",
  component: ModulePlayerPage,
})

export const learnerCertificatesRoute = createRoute({
  getParentRoute: () => learnerLayoutRoute,
  path: "/certificates",
  component: CertificatesPage,
})

export const learnerRoutes = [
  learnerLayoutRoute.addChildren([
    learnerDashboardRoute,
    learnerCatalogRoute,
    learnerCourseDetailRoute,
    learnerModulePlayerRoute,
    learnerCertificatesRoute,
  ]),
]
