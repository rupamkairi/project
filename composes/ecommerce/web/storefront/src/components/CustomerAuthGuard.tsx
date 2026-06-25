import { useCustomerStore } from "../stores/customer";
import { Navigate } from "@tanstack/react-router";

export function CustomerAuthGuard({ children }: { children: React.ReactNode }) {
  const token = useCustomerStore((s) => s.token);
  if (!token) return <Navigate to="/store/auth/login" />;
  return <>{children}</>;
}
