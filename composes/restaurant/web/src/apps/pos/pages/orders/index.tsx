import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { cn, Button, Badge } from "@projectx/ui";
import { rstApi, type Order } from "../../../../lib/api/restaurant";
import { useOutletStore } from "../../../../stores/outlet-store";
import { RstStatusBadge } from "../../../../components/shared/StatusBadge";
import { AmountDisplay } from "../../../../components/shared/AmountDisplay";

function OrderRow({ order, onClick }: { order: Order; onClick: () => void }) {
  const statusBorder: Record<string, string> = {
    draft: "border-l-zinc-300",
    placed: "border-l-blue-400",
    accepted: "border-l-amber-400",
    preparing: "border-l-amber-500",
    ready: "border-l-green-500",
    served: "border-l-zinc-400",
  };

  const status = order.meta?.status ?? "";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left border border-l-4 rounded-lg p-3 hover:bg-muted/50 transition-colors",
        statusBorder[status] ?? "border-l-zinc-300",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="font-mono font-bold text-sm">{order.meta?.orderNumber ?? order.id.slice(0, 8)}</p>
        <RstStatusBadge status={status} />
      </div>
      <p className="text-xs text-muted-foreground mt-1 capitalize">
        {order.meta?.orderType ?? "order"} · {order.meta?.tableId ? `Table` : ""}
      </p>
      {order.meta?.total && (
        <p className="text-xs text-muted-foreground">
          <AmountDisplay amount={order.meta.total} />
        </p>
      )}
    </button>
  );
}

export function PosOrdersPage() {
  const { outletId } = useOutletStore();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["rst-orders", outletId],
    queryFn: () => rstApi.getOrders({ limit: "50" }),
    refetchInterval: 15_000,
  });

  const orders = (data?.data ?? []).filter(
    (o) => !["completed", "rejected", "served"].includes(o.meta?.status ?? ""),
  );

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main — tables quick access */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold">Active Orders</h1>
          <Button onClick={() => navigate({ to: "/restaurants/pos/orders/new" })}>+ New Order</Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active orders</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {orders.map((o) => (
              <OrderRow
                key={o.id}
                order={o}
                onClick={() => navigate({ to: `/restaurants/pos/orders/$id`, params: { id: o.id } })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sidebar — tables */}
      <aside className="w-64 border-l p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Tables</h3>
          <Button size="sm" variant="ghost" onClick={() => navigate({ to: "/restaurants/pos/tables" })}>
            View All
          </Button>
        </div>
        <TableMiniGrid outletId={outletId} />
      </aside>
    </div>
  );
}

function TableMiniGrid({ outletId }: { outletId: string | null }) {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["rst-tables-mini", outletId],
    queryFn: () => rstApi.getTables(outletId!),
    enabled: !!outletId,
    refetchInterval: 30_000,
  });

  const tables = data?.data ?? [];

  return (
    <div className="grid grid-cols-3 gap-2">
      {tables.map((t) => (
        <button
          key={t.id}
          onClick={() => {
            if (t.status === "occupied") {
              navigate({ to: "/restaurants/pos/orders", search: { tableId: t.id } as any });
            } else {
              navigate({ to: "/restaurants/pos/orders/new", search: { tableId: t.id, type: "dine-in" } as any });
            }
          }}
          className={cn(
            "rounded-lg border p-2 text-center text-xs font-medium transition-colors",
            t.status === "active" && "bg-green-50 border-green-200",
            t.status === "occupied" && "bg-zinc-100 border-zinc-300",
            t.status === "reserved" && "bg-amber-50 border-amber-200",
          )}
        >
          {t.code}
        </button>
      ))}
    </div>
  );
}
