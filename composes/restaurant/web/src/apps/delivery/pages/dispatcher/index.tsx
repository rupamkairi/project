import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn, Button, Badge } from "@projectx/ui";
import { rstApi, type Delivery } from "../../../../lib/api/restaurant";
import { useOutletStore } from "../../../../stores/outlet-store";
import { RstStatusBadge } from "../../../../components/shared/StatusBadge";

function DeliveryCard({ delivery, onAssign, assigning }: {
  delivery: Delivery;
  onAssign: () => void;
  assigning: boolean;
}) {
  const needsRider = delivery.status === "unassigned";
  return (
    <div className={cn(
      "border rounded-xl p-4 space-y-3",
      needsRider ? "border-amber-400 bg-amber-50/30" : "border-border",
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono font-bold text-sm">{delivery.trackingCode}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{delivery.meta?.orderNumber}</p>
        </div>
        <RstStatusBadge status={delivery.status} />
      </div>

      <div className="text-sm space-y-1">
        <p className="font-medium">{delivery.meta?.customerName}</p>
        <p className="text-muted-foreground text-xs">{delivery.meta?.address}</p>
        {delivery.meta?.distance && (
          <p className="text-xs text-muted-foreground">{delivery.meta.distance} km</p>
        )}
      </div>

      {delivery.meta?.riderId ? (
        <p className="text-xs text-muted-foreground">
          Rider: <span className="font-medium text-foreground">{delivery.meta?.riderName}</span>
        </p>
      ) : (
        <Button size="sm" className="w-full" onClick={onAssign} disabled={assigning}>
          {assigning ? "Assigning…" : "Auto-assign Rider"}
        </Button>
      )}
    </div>
  );
}

export function DeliveryDispatcherPage() {
  const { outletId } = useOutletStore();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["rst-deliveries", outletId],
    queryFn: () => rstApi.getDeliveries({ outletId: outletId! }),
    refetchInterval: 20_000,
    enabled: !!outletId,
  });

  const { data: ridersData } = useQuery({
    queryKey: ["rst-riders", outletId],
    queryFn: () => rstApi.getRiders({ outletId: outletId!, available: "true" }),
    refetchInterval: 30_000,
    enabled: !!outletId,
  });

  const assign = useMutation({
    mutationFn: (deliveryId: string) => rstApi.assignRider(deliveryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rst-deliveries"] }),
  });

  const deliveries: Delivery[] = data?.data ?? [];
  const riders = ridersData?.data ?? [];

  const activeDeliveries = deliveries.filter((d) => !["delivered", "cancelled"].includes(d.status));
  const pendingCount = activeDeliveries.filter((d) => d.status === "unassigned").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dispatch</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeDeliveries.length} active · {riders.length} riders available
            {pendingCount > 0 && <span className="ml-2 text-amber-600 font-medium">{pendingCount} need assignment</span>}
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : activeDeliveries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">🛵</p>
          <p className="text-sm">No active deliveries</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeDeliveries.map((d) => (
            <DeliveryCard
              key={d.id}
              delivery={d}
              onAssign={() => assign.mutate(d.id)}
              assigning={assign.isPending && assign.variables === d.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
