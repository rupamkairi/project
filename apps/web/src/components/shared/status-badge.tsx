import { Badge } from "@/components/ui/badge";
import { cva, type VariantProps } from "class-variance-authority";

const statusBadgeVariants = cva("", {
  variants: {
    variant: {
      default: "",
      success: "bg-green-100 text-green-800 hover:bg-green-100",
      warning: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      danger: "bg-red-100 text-red-800 hover:bg-red-100",
      info: "bg-blue-100 text-blue-800 hover:bg-blue-100",
      secondary: "bg-gray-100 text-gray-800 hover:bg-gray-100",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export type StatusVariant = VariantProps<typeof statusBadgeVariants>["variant"];

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
}

const statusVariantMap: Record<string, StatusVariant> = {
  pending: "warning",
  processing: "info",
  confirmed: "info",
  shipped: "info",
  delivered: "success",
  completed: "success",
  cancelled: "danger",
  refunded: "danger",
  failed: "danger",
  active: "success",
  inactive: "secondary",
  draft: "secondary",
  published: "success",
  archived: "secondary",
  suspended: "danger",
  paid: "success",
  unpaid: "warning",
  partial: "info",
};

export function StatusBadge({ status, variant }: StatusBadgeProps) {
  const computedVariant =
    variant ?? statusVariantMap[status.toLowerCase()] ?? "default";

  return (
    <Badge
      variant="secondary"
      className={statusBadgeVariants({ variant: computedVariant })}
    >
      {status}
    </Badge>
  );
}
