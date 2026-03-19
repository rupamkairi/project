// AuthGuard Component
// Provides route protection by checking authentication state
// Redirects to login if not authenticated

import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "../stores/auth";

interface AuthGuardProps {
  children: ReactNode;
  /**
   * Optional: Specify paths that don't require authentication
   * Useful for public routes within protected areas
   */
  publicPaths?: string[];
}

/**
 * AuthGuard - Higher-order component that protects routes
 *
 * Usage:
 * ```tsx
 * // Wrap a route component
 * function ProtectedPage() {
 *   return (
 *     <AuthGuard>
 *       <YourProtectedContent />
 *     </AuthGuard>
 *   );
 * }
 *
 * // Or use with route's beforeLoad for server-side redirect
 * beforeLoad: () => {
 *   requireAuth();
 * }
 * ```
 */
export function AuthGuard({ children, publicPaths = [] }: AuthGuardProps) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    // If not checking auth, trigger a check
    if (!isLoading && !isAuthenticated) {
      checkAuth();
    }
  }, [isLoading, isAuthenticated, checkAuth]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying session...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    // Use effect to navigate after render to avoid React errors
    useEffect(() => {
      navigate({ to: "/login", replace: true });
    }, [navigate]);

    return null;
  }

  return <>{children}</>;
}

/**
 * requireAuth - Function to use in route's beforeLoad hook
 * Throws an error that triggers redirect to login
 *
 * Usage:
 * ```tsx
 * const Route = createRoute({
 *   beforeLoad: () => {
 *     requireAuth();
 *   },
 * });
 * ```
 */
export function requireAuth() {
  const { isAuthenticated, isLoading } = useAuthStore.getState();

  if (!isAuthenticated && !isLoading) {
    // Return a flag that can be caught by the router's handleError
    // This will trigger the beforeLoad to throw and redirect
    throw new Error("AUTH_REQUIRED");
  }
}

/**
 * useAuth - Hook to access auth state in components
 * Provides a way to check auth without wrapping with AuthGuard
 */
export function useAuth() {
  const {
    actor,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    checkAuth,
    clearError,
  } = useAuthStore();

  return {
    actor,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    checkAuth,
    clearError,
  };
}

export default AuthGuard;
