import React from "react";
import { Navigate } from "@tanstack/react-router";
import { useAuthStore } from "../../lib/store";
import type { LMSRole } from "../../types";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: LMSRole[];
}

export function AuthGuard({ children, requiredRoles }: AuthGuardProps) {
  const { isAuthenticated, isLoading, hasRole } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/lms/login" replace />;
  }

  if (requiredRoles && !hasRole(requiredRoles)) {
    return <Navigate to="/lms/dashboard" replace />;
  }

  return <>{children}</>;
}

export function usePermission(_permission: string): boolean {
  const { user } = useAuthStore();

  if (!user) return false;

  const rolePermissions: Record<LMSRole, string[]> = {
    "lms-admin": [
      "courses:read",
      "courses:write",
      "courses:approve",
      "courses:reject",
      "learners:read",
      "learners:write",
      "learners:suspend",
      "enrollments:read",
      "certificates:read",
      "certificates:revoke",
      "settings:read",
      "settings:write",
      "notifications:read",
      "notifications:write",
      "team:read",
      "team:write",
      "analytics:read",
    ],
    "content-reviewer": [
      "courses:read",
      "courses:review",
      "notifications:read",
    ],
  };

  const permissions = rolePermissions[user.role] || [];
  return permissions.includes(_permission);
}
