import React from "react";
import { Navigate } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/store";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: ("admin" | "manager" | "user")[];
}

export function AuthGuard({ children, requiredRoles }: AuthGuardProps) {
  const { isAuthenticated, user, isLoading } = useAuthStore();

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
    return <Navigate to="/" replace />;
  }

  if (requiredRoles && user) {
    if (!requiredRoles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

export function usePermission(_permission: string): boolean {
  const { user } = useAuthStore();

  if (!user) return false;

  const rolePermissions: Record<string, string[]> = {
    admin: [
      "users:read",
      "users:write",
      "users:delete",
      "products:read",
      "products:write",
      "products:delete",
      "orders:read",
      "orders:write",
      "settings:read",
      "settings:write",
    ],
    manager: ["products:read", "products:write", "orders:read", "orders:write"],
    user: ["products:read", "orders:read"],
  };

  const permissions = rolePermissions[user.role] || [];
  return permissions.includes(_permission);
}
