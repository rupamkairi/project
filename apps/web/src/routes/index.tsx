import { createRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { sharedRootRoute } from "@projectx/shared-router";

export const Route = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/",
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-3 max-w-sm px-4">
        <p className="text-sm text-muted-foreground">
          Platform management interface.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
