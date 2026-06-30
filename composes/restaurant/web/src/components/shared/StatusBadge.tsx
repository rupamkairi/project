import React from "react";
import { Badge } from "@projectx/ui";
import { cn } from "@projectx/ui";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  // Order statuses
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  placed: { label: "Placed", className: "bg-secondary text-secondary-foreground" },
  accepted: { label: "Accepted", className: "bg-accent text-foreground" },
  preparing: { label: "Preparing", className: "bg-accent text-foreground" },
  ready: { label: "Ready", className: "bg-primary/10 text-primary" },
  served: { label: "Served", className: "bg-muted text-muted-foreground" },
  completed: { label: "Completed", className: "bg-muted text-muted-foreground" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive" },
  // Bill
  open: { label: "Open", className: "bg-secondary text-secondary-foreground" },
  printed: { label: "Printed", className: "bg-muted text-muted-foreground" },
  settled: { label: "Settled", className: "bg-primary/10 text-primary" },
  voided: { label: "Voided", className: "bg-destructive/10 text-destructive" },
  // Delivery
  "pending-assignment": { label: "Unassigned", className: "bg-secondary text-secondary-foreground" },
  assigned: { label: "Assigned", className: "bg-secondary text-secondary-foreground" },
  "rider-heading-to-outlet": { label: "Heading Out", className: "bg-secondary text-secondary-foreground" },
  "reached-outlet": { label: "At Outlet", className: "bg-secondary text-secondary-foreground" },
  "picked-up": { label: "Picked Up", className: "bg-accent text-foreground" },
  "out-for-delivery": { label: "On The Way", className: "bg-accent text-foreground" },
  delivered: { label: "Delivered", className: "bg-primary/10 text-primary" },
  failed: { label: "Failed", className: "bg-destructive/10 text-destructive" },
  returned: { label: "Returned", className: "bg-destructive/10 text-destructive" },
  // Tables
  active: { label: "Available", className: "bg-primary/10 text-primary" },
  occupied: { label: "Occupied", className: "bg-muted text-muted-foreground" },
  inactive: { label: "Inactive", className: "bg-muted text-muted-foreground" },
  // KOT
  sent: { label: "Sent", className: "bg-secondary text-secondary-foreground" },
  // Riders
  available: { label: "Available", className: "bg-primary/10 text-primary" },
  busy: { label: "Busy", className: "bg-accent text-foreground" },
  offline: { label: "Offline", className: "bg-muted text-muted-foreground" },
  // Shift
  "variance-flagged": { label: "Variance", className: "bg-destructive/10 text-destructive" },
  closing: { label: "Closing", className: "bg-accent text-foreground" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground" },
};

interface StatusBadgeProps {
  status?: string | null;
  className?: string;
}

export function RstStatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_MAP[status ?? ""] ?? { label: status ?? "Unknown", className: "bg-muted text-muted-foreground" };
  return (
    <Badge variant="secondary" className={cn("text-xs font-medium", config.className, className)}>
      {config.label}
    </Badge>
  );
}
