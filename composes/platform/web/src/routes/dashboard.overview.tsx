import { createRoute, Link } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "./dashboard.layout";
import { useState, useEffect } from "react";
import { platformApi } from "../lib/api/platform";
import {
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Skeleton,
} from "@projectx/ui";
import {
  Users,
  Building2,
  MapPin,
  Receipt,
  GitBranch,
  Activity as ActivityIcon,
  type LucideIcon,
} from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/overview",
  component: OverviewPage,
});

type Counts = {
  persons: number;
  parties: number;
  locations: number;
  transactions: number;
  pipelines: number;
  activities: number;
};

const STATS: { key: keyof Counts; label: string; href: string; Icon: LucideIcon }[] = [
  { key: "persons", label: "Persons", href: "/dashboard/persons", Icon: Users },
  { key: "parties", label: "Parties", href: "/dashboard/parties", Icon: Building2 },
  { key: "locations", label: "Locations", href: "/dashboard/locations", Icon: MapPin },
  { key: "transactions", label: "Transactions", href: "/dashboard/transactions", Icon: Receipt },
  { key: "pipelines", label: "Pipelines", href: "/dashboard/pipelines", Icon: GitBranch },
  { key: "activities", label: "Activities", href: "/dashboard/activities", Icon: ActivityIcon },
];

function OverviewPage() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [schemas, setSchemas] = useState<any[]>([]);
  const [health, setHealth] = useState<{ status?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const [ov, mods, schs, hlth] = await Promise.all([
        platformApi.getOverview(),
        platformApi.getModules(),
        platformApi.getSchemas(),
        platformApi.getHealth(),
      ]);
      if (ov.data) setCounts(ov.data.counts);
      if (mods.data) setModules(mods.data.modules ?? []);
      if (schs.data) setSchemas(schs.data.schemas ?? []);
      if (hlth.data) setHealth(hlth.data);
      setIsLoading(false);
    })();
  }, []);

  const tableCount = schemas.reduce((n, s) => n + (s.tables?.length ?? 0), 0);

  return (
    <div className="space-y-6 p-4">
      <PageHeader
        title="System Overview"
        description="Live view of master data, modules, and tables across the system."
        actions={
          <Badge variant={health?.status === "ok" ? "default" : "destructive"}>
            {health ? `Health: ${health.status}` : "Health: …"}
          </Badge>
        }
      />

      {/* Master-entity stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {STATS.map(({ key, label, href, Icon }) => (
          <Link key={key} to={href} className="group block focus:outline-none">
            <Card className="cursor-pointer transition-colors group-hover:bg-accent/50">
              <CardHeader className="pb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                </div>
                <CardTitle className="mt-2 text-2xl font-semibold tabular-nums">
                  {isLoading || !counts ? <Skeleton className="h-7 w-12" /> : counts[key]}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {/* Modules + tables summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Modules <span className="text-muted-foreground">({modules.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead className="text-right">Cmds</TableHead>
                    <TableHead className="text-right">Queries</TableHead>
                    <TableHead className="text-right">Events</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ) : modules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                        No modules
                      </TableCell>
                    </TableRow>
                  ) : (
                    modules.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.id}</TableCell>
                        <TableCell className="text-muted-foreground">{m.version}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.commands?.length ?? 0}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.queries?.length ?? 0}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.events?.length ?? 0}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Database Tables <span className="text-muted-foreground">({tableCount})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Schema</TableHead>
                    <TableHead>Tables</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={2}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ) : (
                    schemas.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name ?? s.id}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {(s.tables ?? []).join(", ")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
