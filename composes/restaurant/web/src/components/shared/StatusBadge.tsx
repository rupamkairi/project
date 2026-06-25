import React from "react";
import { Badge } from "@projectx/ui";
import { cn } from "@projectx/ui";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  // Order statuses
  draft: { label: "Draft", className: "bg-zinc-100 text-zinc-600" },
  placed: { label: "Placed", className: "bg-blue-100 text-blue-700" },
  accepted: { label: "Accepted", className: "bg-amber-100 text-amber-700" },
  preparing: { label: "Preparing", className: "bg-amber-100 text-amber-800" },
  ready: { label: "Ready", className: "bg-green-100 text-green-700" },
  served: { label: "Served", className: "bg-zinc-100 text-zinc-500" },
  completed: { label: "Completed", className: "bg-zinc-100 text-zinc-500" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-600" },
  // Bill
  open: { label: "Open", className: "bg-blue-100 text-blue-700" },
  printed: { label: "Printed", className: "bg-zinc-100 text-zinc-600" },
  settled: { label: "Settled", className: "bg-green-100 text-green-700" },
  voided: { label: "Voided", className: "bg-red-100 text-red-600" },
  // Delivery
  "pending-assignment": { label: "Unassigned", className: "bg-amber-100 text-amber-700" },
  assigned: { label: "Assigned", className: "bg-blue-100 text-blue-700" },
  "rider-heading-to-outlet": { label: "Heading Out", className: "bg-blue-100 text-blue-700" },
  "reached-outlet": { label: "At Outlet", className: "bg-indigo-100 text-indigo-700" },
  "picked-up": { label: "Picked Up", className: "bg-purple-100 text-purple-700" },
  "out-for-delivery": { label: "On The Way", className: "bg-purple-100 text-purple-800" },
  delivered: { label: "Delivered", className: "bg-green-100 text-green-700" },
  failed: { label: "Failed", className: "bg-red-100 text-red-600" },
  returned: { label: "Returned", className: "bg-red-100 text-red-500" },
  // Tables
  active: { label: "Available", className: "bg-green-100 text-green-700" },
  occupied: { label: "Occupied", className: "bg-zinc-100 text-zinc-600" },
  inactive: { label: "Inactive", className: "bg-zinc-100 text-zinc-400" },
  // KOT
  sent: { label: "Sent", className: "bg-blue-100 text-blue-700" },
  // Riders
  available: { label: "Available", className: "bg-green-100 text-green-700" },
  busy: { label: "Busy", className: "bg-amber-100 text-amber-700" },
  offline: { label: "Offline", className: "bg-zinc-100 text-zinc-400" },
  // Shift
  "variance-flagged": { label: "Variance", className: "bg-red-100 text-red-700" },
  closing: { label: "Closing", className: "bg-amber-100 text-amber-700" },
  closed: { label: "Closed", className: "bg-zinc-100 text-zinc-500" },
};

interface StatusBadgeProps {
  status?: string | null;
  className?: string;
}

export function RstStatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_MAP[status ?? ""] ?? { label: status ?? "Unknown", className: "bg-zinc-100 text-zinc-500" };
  return (
    <Badge variant="secondary" className={cn("text-xs font-medium", config.className, className)}>
      {config.label}
    </Badge>
  );
}
