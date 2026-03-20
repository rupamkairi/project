// Platform Compose - Web exports
// Re-export all client-side functionality

import "@projectx/ui/index.css";

// API Client
export { platformApi } from "./lib/api/platform";

// Auth Store
export { useAuthStore } from "./stores/auth";

// Auth Guard & Helpers
export { AuthGuard, requireAuth, useAuth } from "./components/auth-guard";

// Routes for host app integration
export { platformRoutes } from "./routes/index";
