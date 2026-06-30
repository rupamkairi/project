// LMS Compose - Web exports

export { lmsApi, LmsApiClient } from "./api/lms-client";
export { useEnrollmentStore } from "./stores/enrollment-store";

import { learnerRoutes } from "./apps/learner/routes";
import { instructorRoutes } from "./apps/instructor/routes";
import { adminRoutes } from "./apps/admin/routes";
import { verifyCertificateRoute } from "./pages/verify-certificate";

export { learnerRoutes };
export { instructorRoutes };
export { adminRoutes };
export { verifyCertificateRoute };
export { lmsManifest } from "./manifest";

export const lmsRoutes = [
  ...learnerRoutes,
  ...instructorRoutes,
  ...adminRoutes,
  verifyCertificateRoute,
];
