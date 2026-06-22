import { createRoute } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "./dashboard.layout";
import { useState, useEffect } from "react";
import { platformApi } from "../lib/api/platform";
import {
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Skeleton,
} from "@projectx/ui";

type Column = { header: string; accessor: (row: any) => any };

type MasterConfig = {
  title: string;
  description: string;
  fetch: (params: { page: number; limit: number }) => Promise<{ data?: { data: any[]; pagination: any }; error?: string }>;
  columns: Column[];
};

const fmtDate = (v?: string) => (v ? new Date(v).toLocaleDateString() : "—");
const name = (r: any) => [r.firstName, r.lastName].filter(Boolean).join(" ") || "—";

const CONFIGS: Record<string, MasterConfig> = {
  persons: {
    title: "Persons",
    description: "Leads, contacts, customers and other external people.",
    fetch: (p) => platformApi.getPersons(p),
    columns: [
      { header: "Name", accessor: name },
      { header: "Type", accessor: (r) => r.type },
      { header: "Email", accessor: (r) => r.email ?? "—" },
      { header: "Phone", accessor: (r) => r.phone ?? "—" },
      { header: "Created", accessor: (r) => fmtDate(r.createdAt) },
    ],
  },
  parties: {
    title: "Parties",
    description: "External organizations a tenant manages.",
    fetch: (p) => platformApi.getParties(p),
    columns: [
      { header: "Name", accessor: (r) => r.name },
      { header: "Type", accessor: (r) => r.type },
      { header: "Domain", accessor: (r) => r.domain ?? "—" },
      { header: "Industry", accessor: (r) => r.industry ?? "—" },
      { header: "Created", accessor: (r) => fmtDate(r.createdAt) },
    ],
  },
  locations: {
    title: "Locations",
    description: "Outlets, rooms, warehouses and other places.",
    fetch: (p) => platformApi.getLocations(p),
    columns: [
      { header: "Name", accessor: (r) => r.name },
      { header: "Type", accessor: (r) => r.type },
      { header: "Code", accessor: (r) => r.code ?? "—" },
      { header: "Status", accessor: (r) => r.status },
      { header: "Created", accessor: (r) => fmtDate(r.createdAt) },
    ],
  },
  transactions: {
    title: "Transactions",
    description: "Orders, invoices, bills, folios and other documents.",
    fetch: (p) => platformApi.getTransactions(p),
    columns: [
      { header: "Reference", accessor: (r) => r.referenceNo ?? r.id },
      { header: "Type", accessor: (r) => r.type },
      { header: "Total", accessor: (r) => `${r.totalAmount ?? 0} ${r.totalCurrency ?? ""}` },
      { header: "Created", accessor: (r) => fmtDate(r.createdAt) },
    ],
  },
  pipelines: {
    title: "Pipelines",
    description: "Status flows seeded by composes.",
    fetch: (p) => platformApi.getPipelines(p),
    columns: [
      { header: "Name", accessor: (r) => r.name },
      { header: "Entity Type", accessor: (r) => r.entityType },
      { header: "Default", accessor: (r) => (r.isDefault ? "Yes" : "No") },
      { header: "Created", accessor: (r) => fmtDate(r.createdAt) },
    ],
  },
  activities: {
    title: "Activities",
    description: "Calls, emails, notes, tasks and other interactions.",
    fetch: (p) => platformApi.getActivities(p),
    columns: [
      { header: "Subject", accessor: (r) => r.subject ?? "—" },
      { header: "Type", accessor: (r) => r.type },
      { header: "Status", accessor: (r) => r.status },
      { header: "Created", accessor: (r) => fmtDate(r.createdAt) },
    ],
  },
};

function MasterListPage({ resource }: { resource: keyof typeof CONFIGS }) {
  const config = CONFIGS[resource]!;
  const [rows, setRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const { data } = await config.fetch({ page: 1, limit: 50 });
      if (data) setRows(data.data);
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource]);

  return (
    <div className="space-y-6 p-4">
      <PageHeader title={config.title} description={config.description} />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {config.columns.map((c) => (
                <TableHead key={c.header}>{c.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={config.columns.length}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={config.columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No {config.title.toLowerCase()} found
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {config.columns.map((c) => (
                    <TableCell key={c.header} className="text-sm">
                      {c.accessor(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function makeRoute(resource: keyof typeof CONFIGS) {
  return createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: `/${resource}`,
    component: () => <MasterListPage resource={resource} />,
  });
}

export const personsRoute = makeRoute("persons");
export const partiesRoute = makeRoute("parties");
export const locationsRoute = makeRoute("locations");
export const transactionsRoute = makeRoute("transactions");
export const pipelinesRoute = makeRoute("pipelines");
export const activitiesRoute = makeRoute("activities");

export const masterRoutes = [
  personsRoute,
  partiesRoute,
  locationsRoute,
  transactionsRoute,
  pipelinesRoute,
  activitiesRoute,
];
