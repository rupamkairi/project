import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "@/router";
import { useAuthStore } from "@projectx/platform-web";
import "@projectx/ui/index.css";

// Initialize auth on app startup
function initializeAuth() {
  const { checkAuth } = useAuthStore.getState();
  checkAuth();
}

// Call auth initialization
initializeAuth();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
