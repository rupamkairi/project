import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  CourseStatus,
  EnrollmentStatus,
  LearnerStatus,
  NotificationChannel,
  WorkflowStage,
  TaskStatus,
} from "@/types/lms";

const statusConfig: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  draft: { label: "Draft", variant: "secondary" },
  "under-review": { label: "Under Review", variant: "outline" },
  published: { label: "Published", variant: "default" },
  archived: { label: "Archived", variant: "secondary" },
  active: { label: "Active", variant: "default" },
  completed: { label: "Completed", variant: "default" },
  expired: { label: "Expired", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "outline" },
  suspended: { label: "Suspended", variant: "destructive" },
  "content-check": { label: "Content Check", variant: "outline" },
  "policy-check": { label: "Policy Check", variant: "outline" },
  pending: { label: "Pending", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "outline" },
};

export function CourseStatusBadge({ status }: { status: CourseStatus }) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function EnrollmentStatusBadge({
  status,
}: {
  status: EnrollmentStatus;
}) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function LearnerStatusBadge({ status }: { status: LearnerStatus }) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function WorkflowStageBadge({ stage }: { stage: WorkflowStage }) {
  const config = statusConfig[stage];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function ChannelBadge({ channel }: { channel: NotificationChannel }) {
  const channelConfig: Record<
    NotificationChannel,
    { label: string; className: string }
  > = {
    email: { label: "Email", className: "bg-blue-100 text-blue-800" },
    in_app: { label: "In-App", className: "bg-purple-100 text-purple-800" },
    push: { label: "Push", className: "bg-orange-100 text-orange-800" },
  };
  const config = channelConfig[channel];
  return (
    <Badge variant="outline" className={cn("border-0", config.className)}>
      {config.label}
    </Badge>
  );
}

export function RoleBadge({
  role,
}: {
  role: "lms-admin" | "content-reviewer";
}) {
  const roleConfig = {
    "lms-admin": { label: "Admin", className: "bg-green-100 text-green-800" },
    "content-reviewer": {
      label: "Reviewer",
      className: "bg-yellow-100 text-yellow-800",
    },
  };
  const config = roleConfig[role];
  return (
    <Badge variant="outline" className={cn("border-0", config.className)}>
      {config.label}
    </Badge>
  );
}

export function CertificateStatusBadge({
  revoked,
  expiresAt,
}: {
  revoked: boolean;
  expiresAt?: string;
}) {
  if (revoked) {
    return <Badge variant="destructive">Revoked</Badge>;
  }
  if (expiresAt && new Date(expiresAt) < new Date()) {
    return <Badge variant="secondary">Expired</Badge>;
  }
  return <Badge variant="default">Valid</Badge>;
}
