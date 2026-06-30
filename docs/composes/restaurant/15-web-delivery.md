# Phase 15 — Web: DeliveryApp

---

## 15.1 Dispatcher View

Route: `/delivery/dispatcher`

```tsx
export function DispatcherPage() {
  const { outletId } = useOutletStore();
  const { data, refetch } = useQuery({
    queryKey: ["deliveries", outletId],
    queryFn: () => rstApi.get(`/deliveries?outletId=${outletId}&status=pending-assignment,assigned,out-for-delivery`),
    refetchInterval: 30_000,
  });

  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      {/* Unassigned column */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-amber-600">Unassigned ({data?.pendingAssignment.length})</h2>
        {data?.pendingAssignment.map(d => (
          <DeliveryCard key={d.id} delivery={d} showAssign onAssign={(riderId) => assignDelivery(d.id, riderId)} />
        ))}
      </div>

      {/* In progress column */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-blue-600">In Progress ({data?.inProgress.length})</h2>
        {data?.inProgress.map(d => (
          <DeliveryCard key={d.id} delivery={d} showRiderLocation />
        ))}
      </div>

      {/* Riders panel */}
      <div className="border-l pl-4 space-y-3">
        <h2 className="text-sm font-semibold">Riders ({data?.riderStatuses.length})</h2>
        {data?.riderStatuses.map(r => (
          <RiderStatusCard key={r.riderId} rider={r} />
        ))}
      </div>
    </div>
  );
}
```

---

## 15.2 Delivery Card Component

```tsx
function DeliveryCard({ delivery, showAssign, showRiderLocation, onAssign }) {
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex justify-between">
        <div>
          <p className="font-mono font-bold">{delivery.orderNumber}</p>
          <p className="text-xs text-muted-foreground">{delivery.dropAddress?.formatted}</p>
        </div>
        <StatusBadge status={delivery.status} />
      </div>

      {showRiderLocation && delivery.riderLocation && (
        <div className="text-xs text-muted-foreground">
          Rider last seen {timeAgo(delivery.riderLocation.updatedAt)}
          {isStale(delivery.riderLocation.updatedAt, 5) && (
            <span className="text-amber-500 ml-1">⚠ Location stale</span>
          )}
        </div>
      )}

      {showAssign && (
        <AssignRiderSelect deliveryId={delivery.id} onAssign={onAssign} />
      )}
    </div>
  );
}
```

---

## 15.3 Assign Rider Select

```tsx
function AssignRiderSelect({ deliveryId, onAssign }) {
  const { data: riders } = useQuery({
    queryKey: ["riders", deliveryId],
    queryFn: () => rstApi.get(`/riders?status=available`),
  });

  return (
    <div className="flex gap-2">
      <Select onValueChange={(riderId) => onAssign(riderId)}>
        <SelectTrigger className="flex-1 h-8 text-xs">
          <SelectValue placeholder={riders?.length === 0 ? "No riders available" : "Assign rider"} />
        </SelectTrigger>
        <SelectContent>
          {riders?.map(r => (
            <SelectItem key={r.riderId} value={r.riderId}>
              {r.name} · {r.vehicleType}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" onClick={() => autoAssign(deliveryId)}>Auto</Button>
    </div>
  );
}
```

---

## 15.4 Rider View

Route: `/delivery/rider`

Mobile-optimized. Shows the active delivery with step-by-step status progression.

```tsx
export function RiderPage() {
  const { data: activeDelivery } = useQuery({ queryKey: ["active-delivery"], queryFn: () => rstApi.get("/deliveries/my-active"), refetchInterval: 30_000 });
  const updateStatus = useMutation({ mutationFn: (status: string) => rstApi.post(`/deliveries/${activeDelivery.id}/status`, { status }) });

  if (!activeDelivery) {
    return <div className="p-4 text-center text-muted-foreground">No active delivery</div>;
  }

  const steps = DELIVERY_STEPS[activeDelivery.status];

  return (
    <div className="p-4 space-y-6">
      <div>
        <p className="text-xl font-mono font-bold">{activeDelivery.orderNumber}</p>
        <StatusBadge status={activeDelivery.status} />
      </div>

      {/* Drop address */}
      <div className="bg-muted rounded p-3">
        <p className="text-sm font-medium">Deliver to:</p>
        <p className="text-sm">{activeDelivery.dropAddress?.formatted}</p>
        <a href={`https://maps.google.com/?q=${activeDelivery.dropAddress?.lat},${activeDelivery.dropAddress?.lng}`}
          className="text-primary text-sm" target="_blank">Open in Maps</a>
      </div>

      {/* Current step action */}
      {steps?.nextAction && (
        <Button className="w-full" size="lg" onClick={() => updateStatus.mutateAsync(steps.nextStatus)}>
          {steps.nextAction}
        </Button>
      )}

      {/* Location update (auto via hook) */}
      <RiderLocationUpdater deliveryId={activeDelivery.id} />
    </div>
  );
}

const DELIVERY_STEPS = {
  "assigned": { nextAction: "Heading to Outlet", nextStatus: "rider-heading-to-outlet" },
  "rider-heading-to-outlet": { nextAction: "Reached Outlet", nextStatus: "reached-outlet" },
  "reached-outlet": { nextAction: "Picked Up", nextStatus: "picked-up" },
  "picked-up": { nextAction: "Out for Delivery", nextStatus: "out-for-delivery" },
  "out-for-delivery": { nextAction: "Delivered", nextStatus: "delivered" },
};
```

---

## 15.5 Location Update Hook

```typescript
export function RiderLocationUpdater({ deliveryId }) {
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        rstApi.patch(`/riders/me/location`, { lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      undefined,
      { maximumAge: 5000, timeout: 10000, enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return null;  // no UI, just effect
}
```
