import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { cn, Button, Badge } from "@projectx/ui";
import { rstApi } from "../../../../lib/api/restaurant";
import { useOutletStore } from "../../../../stores/outlet-store";

function TableCard({ table, onClick }: { table: any; onClick: () => void }) {
  const statusColor: Record<string, string> = {
    active: "bg-green-50 border-green-200 hover:bg-green-100",
    occupied: "bg-zinc-100 border-zinc-300 hover:bg-zinc-200",
    reserved: "bg-amber-50 border-amber-200 hover:bg-amber-100",
    inactive: "bg-slate-50 border-slate-200",
  };

  return (
    <button
      onClick={onClick}
      disabled={table.status === "inactive"}
      className={cn(
        "rounded-xl border p-4 text-left transition-colors w-full",
        statusColor[table.status] ?? "bg-muted border-border",
      )}
    >
      <p className="font-bold text-xl">{table.code}</p>
      <p className="text-xs text-muted-foreground mt-1">
        {table.meta?.section} · {table.capacity} pax
      </p>
      <Badge
        variant="secondary"
        className="mt-2 text-xs capitalize"
      >
        {table.status === "active" ? "Available" : table.status}
      </Badge>
    </button>
  );
}

export function PosTablesPage() {
  const { outletId } = useOutletStore();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["rst-tables", outletId],
    queryFn: () => rstApi.getTables(outletId!),
    enabled: !!outletId,
    refetchInterval: 30_000,
  });

  const tables = data?.data ?? [];

  if (isLoading) return <div className="p-6 text-muted-foreground text-sm">Loading tables…</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tables</h1>
        <Button size="sm" onClick={() => navigate({ to: "/pos/orders/new" })}>
          New Takeaway / Delivery
        </Button>
      </div>

      <div className="flex gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 inline-block" />Available</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-zinc-300 inline-block" />Occupied</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200 inline-block" />Reserved</span>
      </div>

      {tables.length === 0 ? (
        <p className="text-muted-foreground text-sm">No tables configured for this outlet.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {tables.map((t) => (
            <TableCard
              key={t.id}
              table={t}
              onClick={() => {
                if (t.status === "occupied") {
                  navigate({ to: "/pos/orders", search: { tableId: t.id } as any });
                } else {
                  navigate({ to: "/pos/orders/new", search: { tableId: t.id, type: "dine-in" } as any });
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
