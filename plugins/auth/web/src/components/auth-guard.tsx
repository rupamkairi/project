import { type ReactNode } from "react";
import { useAuth } from "../hooks/use-auth";

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}

export function AuthGuard({ children, fallback = null, redirectTo }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  if (!isAuthenticated) {
    if (redirectTo && typeof window !== "undefined") {
      window.location.href = redirectTo;
      return null;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
