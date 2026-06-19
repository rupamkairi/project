import { createRootRoute, Link, Outlet } from "@tanstack/react-router";

export const rootRouteLayout = () => (
  <div className="min-h-screen">
    <header className="bg-white"></header>
    <main>
      <Outlet />
    </main>
  </div>
);
