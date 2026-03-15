import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useState, useEffect, type ReactNode } from "react";
import {
  fetchCoreLayer,
  fetchModuleLayer,
  fetchSchemas,
  type CoreLayer,
  type ModuleLayer,
  type DatabaseSchema,
} from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Layers,
  Database,
  Box,
  Code2,
  DatabaseZap,
  FileText,
  Workflow,
  Calendar,
  Bell,
  Map,
  BarChart3,
  Shield,
  ShoppingCart,
  Package,
  BookOpen,
} from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardPage,
});

function DashboardPage() {
  const [coreLayers, setCoreLayers] = useState<CoreLayer[]>([]);
  const [moduleLayers, setModuleLayers] = useState<ModuleLayer[]>([]);
  const [schemas, setSchemas] = useState<DatabaseSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [coreData, modulesData, schemasData] = await Promise.all([
          fetchCoreLayer(),
          fetchModuleLayer(),
          fetchSchemas(),
        ]);
        setCoreLayers(coreData);
        setModuleLayers(modulesData);
        setSchemas(schemasData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Connection Error</CardTitle>
            <CardDescription>Unable to connect to the server</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <p className="text-sm">
              Make sure the server is running at{" "}
              <code className="bg-muted px-1 py-0.5 rounded">
                http://localhost:3000
              </code>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          ProjectX Dashboard
        </h1>
        <p className="text-muted-foreground">
          Overview of Layers (Core, Modules), and Database schemas
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Core Layer</CardTitle>
            <Code2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coreLayers.length}</div>
            <p className="text-xs text-muted-foreground">
              Foundation building blocks
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Module Layer</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{moduleLayers.length}</div>
            <p className="text-xs text-muted-foreground">
              Reusable bounded contexts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Database Schemas
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schemas.length}</div>
            <p className="text-xs text-muted-foreground">
              Persistent data stores
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed view */}
      <Tabs defaultValue="core" className="space-y-4">
        <TabsList>
          <TabsTrigger value="core">Core Layer</TabsTrigger>
          <TabsTrigger value="modules">Module Layer</TabsTrigger>
          <TabsTrigger value="schemas">Database Schemas</TabsTrigger>
        </TabsList>

        {/* Core Tab */}
        <TabsContent value="core">
          <Card>
            <CardHeader>
              <CardTitle>Core Layer Components</CardTitle>
              <CardDescription>
                The foundation layer providing primitives, contracts, and
                runtime machinery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  {coreLayers.map((component) => (
                    <Card key={component.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">{component.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {component.description}
                          </p>
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {component.filePath}
                          </code>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {component.types.map((type: string) => (
                          <Badge
                            key={type}
                            variant="secondary"
                            className="text-xs"
                          >
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Modules Tab */}
        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <CardTitle>Module Layer Components</CardTitle>
              <CardDescription>
                Reusable bounded contexts that own their entities, commands,
                queries, and events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Dependencies</TableHead>
                    <TableHead>Entities</TableHead>
                    <TableHead>Commands</TableHead>
                    <TableHead>Queries</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>FSMs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {moduleLayers.map((module) => (
                    <TableRow key={module.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <ModuleIcon id={module.id} />
                          {module.id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{module.version}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {module.dependsOn.length > 0 ? (
                            module.dependsOn.map((dep) => (
                              <Badge
                                key={dep}
                                variant="secondary"
                                className="text-xs"
                              >
                                {dep}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{module.entities.length}</TableCell>
                      <TableCell>{module.commands.length}</TableCell>
                      <TableCell>{module.queries.length}</TableCell>
                      <TableCell>{module.events.length}</TableCell>
                      <TableCell>{module.fsms.length}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Schemas Tab */}
        <TabsContent value="schemas">
          <Card>
            <CardHeader>
              <CardTitle>Database Schemas</CardTitle>
              <CardDescription>
                Persistent data stores organized by domain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-full">
                <div className="grid gap-4 md:grid-cols-2">
                  {schemas.map((schema) => (
                    <Card key={schema.id} className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <SchemaIcon id={schema.id} />
                        <p className="font-medium">{schema.name}</p>
                      </div>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded block mb-2">
                        {schema.filePath}
                      </code>
                      <div className="flex flex-wrap gap-1">
                        {schema.tables.map((table) => (
                          <Badge
                            key={table}
                            variant="outline"
                            className="text-xs"
                          >
                            {table}
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Icon helpers
function ModuleIcon({ id }: { id: string }): ReactNode {
  const icons: Record<string, ReactNode> = {
    identity: <Shield className="h-4 w-4" />,
    catalog: <ShoppingCart className="h-4 w-4" />,
    inventory: <Package className="h-4 w-4" />,
    ledger: <BookOpen className="h-4 w-4" />,
    workflow: <Workflow className="h-4 w-4" />,
    scheduling: <Calendar className="h-4 w-4" />,
    document: <FileText className="h-4 w-4" />,
    notification: <Bell className="h-4 w-4" />,
    geo: <Map className="h-4 w-4" />,
    analytics: <BarChart3 className="h-4 w-4" />,
  };
  return icons[id] || <Box className="h-4 w-4" />;
}

function SchemaIcon({ id }: { id: string }): ReactNode {
  const icons: Record<string, ReactNode> = {
    identity: <Shield className="h-4 w-4" />,
    catalog: <ShoppingCart className="h-4 w-4" />,
    inventory: <Package className="h-4 w-4" />,
    ledger: <BookOpen className="h-4 w-4" />,
    workflow: <Workflow className="h-4 w-4" />,
    scheduling: <Calendar className="h-4 w-4" />,
    document: <FileText className="h-4 w-4" />,
    notification: <Bell className="h-4 w-4" />,
    geo: <Map className="h-4 w-4" />,
    analytics: <BarChart3 className="h-4 w-4" />,
    events: <DatabaseZap className="h-4 w-4" />,
    outbox: <Database className="h-4 w-4" />,
  };
  return icons[id] || <Database className="h-4 w-4" />;
}
