// Platform Compose - Web exports
// Re-export all client-side functionality

// API Client
export { platformApi } from "./lib/api/platform";

// Auth Store
export { useAuthStore } from "./stores/auth";

// Routes for host app integration
export { platformRoutes, platformRootRoute } from "./routes/index";
