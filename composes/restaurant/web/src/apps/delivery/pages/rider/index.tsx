import React, { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn, Button } from "@projectx/ui";
import { rstApi, type Rider } from "../../../../lib/api/restaurant";
import { useOutletStore } from "../../../../stores/outlet-store";
import { RstStatusBadge } from "../../../../components/shared/StatusBadge";

const STATUS_FLOW: Record<string, string | null> = {
  assigned: "picked_up",
  picked_up: "en_route",
  en_route: "delivered",
  delivered: null,
};

const NEXT_LABEL: Record<string, string> = {
  assigned: "Mark Picked Up",
  picked_up: "En Route",
  en_route: "Mark Delivered",
};

function RiderCard({ rider }: { rider: Rider }) {
  const isAvailable = rider.meta?.isAvailable;
  return (
    <div className={cn(
      "border rounded-xl p-3 flex items-center gap-3",
      isAvailable ? "border-green-200 bg-green-50/20" : "border-border",
    )}>
      <div className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm",
        isAvailable ? "bg-green-200 text-green-900" : "bg-zinc-100 text-zinc-500",
      )}>
        {rider.name.slice(0, 1)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{rider.name}</p>
        <p className="text-xs text-muted-foreground">{rider.meta?.phone}</p>
      </div>
      <span className={cn(
        "text-xs px-2 py-0.5 rounded-full font-medium",
        isAvailable ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500",
      )}>
        {isAvailable ? "Available" : "On delivery"}
      </span>
    </div>
  );
}

export function DeliveryRiderPage() {
  const { outletId } = useOutletStore();
  const qc = useQueryClient();

  const { data: ridersData, isLoading } = useQuery({
    queryKey: ["rst-riders-all", outletId],
    queryFn: () => rstApi.getRiders({ outletId: outletId! }),
    enabled: !!outletId,
    refetchInterval: 30_000,
  });

  const { data: deliveriesData } = useQuery({
    queryKey: ["rst-deliveries-active", outletId],
    queryFn: () => rstApi.getDeliveries({ outletId: outletId!, status: "assigned,picked_up,en_route" }),
    enabled: !!outletId,
    refetchInterval: 15_000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      rstApi.updateDeliveryStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rst-deliveries-active"] });
      qc.invalidateQueries({ queryKey: ["rst-riders-all"] });
    },
  });

  const riders: Rider[] = ridersData?.data ?? [];
  const activeDeliveries = deliveriesData?.data ?? [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Riders</h1>

      {/* Active deliveries */}
      {activeDeliveries.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Active Deliveries</h2>
          <div className="space-y-3">
            {activeDeliveries.map((d) => {
              const nextStatus = STATUS_FLOW[d.status];
              return (
                <div key={d.id} className="border rounded-xl p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-mono font-bold text-sm">{d.trackingCode}</p>
                      <RstStatusBadge status={d.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{d.meta?.customerName} · {d.meta?.address}</p>
                    {d.meta?.riderName && (
                      <p className="text-xs mt-0.5">Rider: <span className="font-medium">{d.meta.riderName}</span></p>
                    )}
                  </div>
                  {nextStatus && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus.mutate({ id: d.id, status: nextStatus })}
                      disabled={updateStatus.isPending}
                    >
                      {NEXT_LABEL[d.status] ?? nextStatus}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Riders roster */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Riders ({riders.length})
        </h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : riders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No riders configured</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {riders.map((r) => <RiderCard key={r.id} rider={r} />)}
          </div>
        )}
      </section>
    </div>
  );
}
