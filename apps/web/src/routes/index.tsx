import { createRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@projectx/ui";
import { sharedRootRoute } from "@projectx/shared-router";
import { composeRegistry } from "@/lib/compose-registry";

export const Route = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/",
  component: HomePage,
});

function HomePage() {
  const primaryItems = composeRegistry.map((compose) => ({
    ...compose,
    href: compose.navItems[0]?.path ?? compose.prefix,
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-10">
        <div className="mb-8 space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            ProjectX
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Compose entry points
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Pick a compose. Each card uses that compose&apos;s public manifest
            instead of hardcoded shell links.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {primaryItems.map((compose) => {
            const Icon = compose.icon;
            return (
              <Link key={compose.id} to={compose.href} className="block">
                <Card className="h-full transition-colors hover:bg-accent/50">
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {compose.navItems.length} links
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-base">{compose.label}</CardTitle>
                      <CardDescription className="mt-1 text-xs">
                        {compose.description ?? compose.prefix}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">
                      Open {compose.href}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
