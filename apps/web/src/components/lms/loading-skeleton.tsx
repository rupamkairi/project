import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function TableSkeleton({
  columns = 5,
  rows = 5,
}: {
  columns?: number;
  rows?: number;
}) {
  const columnHeaders = Array.from({ length: columns }, (_, i) => `col-${i}`);
  const rowKeys = Array.from({ length: rows }, (_, i) => `row-${i}`);

  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        {columnHeaders.map((key) => (
          <Skeleton key={key} className="h-8 flex-1" />
        ))}
      </div>
      {rowKeys.map((rowKey) => (
        <div key={rowKey} className="flex gap-4">
          {columnHeaders.map((colKey) => (
            <Skeleton key={`${rowKey}-${colKey}`} className="h-12 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-8 w-16" />
      </CardContent>
    </Card>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <TableSkeleton />
    </div>
  );
}
