import { createRoute } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../__dashboard";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/analytics",
  component: AnalyticsOverview,
});

function AnalyticsOverview() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics Overview</h1>
        <p className="text-muted-foreground">
          Platform-wide analytics and insights
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">
            Total Enrollments
          </p>
          <p className="text-2xl font-bold">2,847</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">
            Completion Rate
          </p>
          <p className="text-2xl font-bold">72%</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">
            Avg. Rating
          </p>
          <p className="text-2xl font-bold">4.7</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">
            Certificates Issued
          </p>
          <p className="text-2xl font-bold">892</p>
        </div>
      </div>
      <div className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Navigation</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <a
            href="/analytics/revenue"
            className="rounded-lg border p-4 hover:bg-muted transition-colors"
          >
            <h3 className="font-medium">Revenue Analytics</h3>
            <p className="text-sm text-muted-foreground">
              Realized vs deferred revenue
            </p>
          </a>
          <a
            href="/analytics/courses"
            className="rounded-lg border p-4 hover:bg-muted transition-colors"
          >
            <h3 className="font-medium">Course Analytics</h3>
            <p className="text-sm text-muted-foreground">Per-course metrics</p>
          </a>
          <a
            href="/analytics/instructors"
            className="rounded-lg border p-4 hover:bg-muted transition-colors"
          >
            <h3 className="font-medium">Instructor Analytics</h3>
            <p className="text-sm text-muted-foreground">
              Instructor performance
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
