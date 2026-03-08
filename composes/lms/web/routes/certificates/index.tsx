import { createRoute } from "@tanstack/react-router";
import { Route as lmsLayoutRoute } from "../layout";
import { PageHeader } from "../../components/shared/page-header";
import { DataTable, SortableHeader } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";
import { mockCertificates } from "../../lib/mock-data";
import { CertificateStatusBadge } from "../../components/shared/status-badge";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import type { Certificate } from "../../types";

export const Route = createRoute({
  getParentRoute: () => lmsLayoutRoute,
  path: "/certificates",
  component: CertificatesList,
});

const columns: ColumnDef<Certificate>[] = [
  {
    accessorKey: "verificationCode",
    header: "Code",
    cell: ({ row }) => (
      <Link
        to="/lms/certificates/$certId"
        params={{ certId: row.original.id }}
        className="font-mono text-sm hover:underline"
      >
        {row.original.verificationCode}
      </Link>
    ),
  },
  {
    accessorKey: "learner",
    header: "Learner",
    cell: ({ row }) => row.original.learner.name,
  },
  {
    accessorKey: "course",
    header: "Course",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.course.title}</span>
    ),
  },
  {
    accessorKey: "issuedAt",
    header: ({ column }) => (
      <SortableHeader column={column}>Issued</SortableHeader>
    ),
    cell: ({ row }) => format(new Date(row.original.issuedAt), "MMM d, yyyy"),
  },
  {
    accessorKey: "expiresAt",
    header: "Expires",
    cell: ({ row }) =>
      row.original.expiresAt
        ? format(new Date(row.original.expiresAt), "MMM d, yyyy")
        : "Never",
  },
  {
    accessorKey: "revoked",
    header: "Status",
    cell: ({ row }) => (
      <CertificateStatusBadge
        revoked={row.original.revoked}
        expiresAt={row.original.expiresAt}
      />
    ),
  },
];

function CertificatesList() {
  return (
    <div className="space-y-6">
      <PageHeader title="Certificates" description="All issued certificates">
        <Badge variant="secondary">
          {mockCertificates.length} certificates
        </Badge>
      </PageHeader>
      <DataTable
        columns={columns}
        data={mockCertificates}
        searchPlaceholder="Search certificates..."
      />
    </div>
  );
}
