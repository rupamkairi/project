import React from 'react'
import { Badge } from '@projectx/ui'
import { cn } from '@projectx/ui'

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  // Order statuses
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  placed: { label: 'Placed', className: 'bg-secondary text-secondary-foreground' },
  accepted: { label: 'Accepted', className: 'bg-accent text-foreground' },
  preparing: { label: 'Preparing', className: 'bg-accent text-foreground' },
  ready: { label: 'Ready', className: 'bg-primary/10 text-primary' },
  served: { label: 'Served', className: 'bg-muted text-muted-foreground' },
  collected: { label: 'Collected', className: 'bg-muted text-muted-foreground' },
  'handed-off': { label: 'Handed Off', className: 'bg-muted text-muted-foreground' },
  'ready-for-handoff': { label: 'Ready for Hand-off', className: 'bg-primary/10 text-primary' },
  completed: { label: 'Completed', className: 'bg-muted text-muted-foreground' },
  rejected: { label: 'Rejected', className: 'bg-destructive/10 text-destructive' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/10 text-destructive' },
  refunded: { label: 'Refunded', className: 'bg-destructive/10 text-destructive' },
  // Bill
  open: { label: 'Open', className: 'bg-secondary text-secondary-foreground' },
  printed: { label: 'Printed', className: 'bg-muted text-muted-foreground' },
  settled: { label: 'Settled', className: 'bg-primary/10 text-primary' },
  partial: { label: 'Partial', className: 'bg-accent text-foreground' },
  voided: { label: 'Voided', className: 'bg-destructive/10 text-destructive' },
  // Tables
  active: { label: 'Available', className: 'bg-primary/10 text-primary' },
  occupied: { label: 'Occupied', className: 'bg-muted text-muted-foreground' },
  inactive: { label: 'Inactive', className: 'bg-muted text-muted-foreground' },
  // KOT
  new: { label: 'New', className: 'bg-secondary text-secondary-foreground' },
  sent: { label: 'Sent', className: 'bg-secondary text-secondary-foreground' },
  bumped: { label: 'Cleared', className: 'bg-muted text-muted-foreground' },
  // Reservation
  pending: { label: 'Pending', className: 'bg-secondary text-secondary-foreground' },
  confirmed: { label: 'Confirmed', className: 'bg-primary/10 text-primary' },
  seated: { label: 'Seated', className: 'bg-accent text-foreground' },
  'no-show': { label: 'No-Show', className: 'bg-destructive/10 text-destructive' },
  // Waitlist
  waiting: { label: 'Waiting', className: 'bg-secondary text-secondary-foreground' },
  notified: { label: 'Notified', className: 'bg-accent text-foreground' },
  // Equipment
  'out-of-service': { label: 'Out of Service', className: 'bg-destructive/10 text-destructive' },
  // Shift
  'variance-flagged': { label: 'Variance', className: 'bg-destructive/10 text-destructive' },
  closing: { label: 'Closing', className: 'bg-accent text-foreground' },
  closed: { label: 'Closed', className: 'bg-muted text-muted-foreground' },
}

interface StatusBadgeProps {
  status?: string | null
  className?: string
}

export function RstStatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_MAP[status ?? ''] ?? {
    label: status ?? 'Unknown',
    className: 'bg-muted text-muted-foreground',
  }
  return (
    <Badge variant="secondary" className={cn('text-xs font-medium', config.className, className)}>
      {config.label}
    </Badge>
  )
}
