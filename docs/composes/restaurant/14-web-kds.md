# Phase 14 — Web: KDSApp

---

## 14.1 KDS Board Page

Route: `/kds/board`

The primary screen — typically a dedicated tablet or large monitor in the kitchen. Dark mode default.

```tsx
export function KdsBoardPage() {
  const { outletId, station } = useKdsStore();
  const { kots, onKotUpdate } = useKdsSocket(outletId, station);

  // Sort: oldest first (most critical)
  const sorted = [...kots].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

  return (
    <div className="bg-zinc-900 min-h-screen p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-white text-xl font-bold">{station.toUpperCase()} STATION</h1>
        <div className="flex gap-3">
          <span className="text-zinc-400 text-sm">{sorted.length} active KOTs</span>
          <StationSelector outletId={outletId} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {sorted.map(kot => (
          <KotCard key={kot.id} kot={kot} onStatusChange={onKotUpdate} />
        ))}
      </div>
    </div>
  );
}
```

---

## 14.2 KOT Card Component

```tsx
export function KotCard({ kot, onStatusChange }) {
  const elapsed = useElapsedTime(kot.sentAt);

  const elapsedColor =
    elapsed < 10 ? "text-green-400" :
    elapsed < 20 ? "text-amber-400" :
    "text-red-400";

  const cardBg =
    kot.status === "ready" ? "bg-green-900 border-green-600" :
    kot.status === "preparing" ? "bg-zinc-800 border-zinc-600" :
    kot.status === "sent" ? "bg-blue-900 border-blue-600" :
    "bg-zinc-800 border-zinc-600";

  return (
    <div className={cn("rounded-lg border p-4 space-y-3", cardBg)}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-white font-mono font-bold text-lg">{kot.kotNumber}</p>
          <p className="text-zinc-400 text-xs">{kot.orderNumber} · {kot.orderType}</p>
        </div>
        <div className="text-right">
          <p className={cn("font-bold text-xl font-mono", elapsedColor)}>{elapsed}m</p>
          {kot.priority === "rush" && (
            <span className="text-xs bg-red-600 text-white px-1 py-0.5 rounded">RUSH</span>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="space-y-1">
        {kot.items.map(item => (
          <div key={item.id} className="flex gap-2">
            <span className="text-white font-bold w-8">{item.qty}×</span>
            <div>
              <p className="text-white text-sm">{item.name}</p>
              {item.modifiers.length > 0 && (
                <p className="text-zinc-400 text-xs">{item.modifiers.join(", ")}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Special instructions */}
      {kot.specialInstructions && (
        <p className="text-amber-300 text-xs border-t border-zinc-600 pt-2">
          ⚠ {kot.specialInstructions}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {kot.status === "sent" && (
          <Button size="sm" variant="outline" className="flex-1 text-white border-zinc-500"
            onClick={() => acceptKot(kot.id)}>Accept</Button>
        )}
        {kot.status === "accepted" && (
          <Button size="sm" variant="outline" className="flex-1 text-white border-zinc-500"
            onClick={() => startKot(kot.id)}>Start</Button>
        )}
        {kot.status === "preparing" && (
          <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => readyKot(kot.id)}>Ready</Button>
        )}
        {kot.status === "ready" && (
          <span className="text-green-400 text-sm font-medium">✓ Ready</span>
        )}
      </div>
    </div>
  );
}
```

---

## 14.3 Elapsed Time Hook

```typescript
export function useElapsedTime(sentAt: string): number {
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - new Date(sentAt).getTime()) / 60000));
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(sentAt).getTime()) / 60000));
    }, 10_000);  // update every 10s (no need for 1s precision)
    return () => clearInterval(interval);
  }, [sentAt]);
  return elapsed;
}
```

---

## 14.4 Station Selector

Kitchen staff can filter to their station or see all:

```tsx
export function StationSelector({ outletId }) {
  const { station, setStation } = useKdsStore();
  const { data: stations } = useQuery({ queryKey: ["stations", outletId], queryFn: () => getDistinctStations(outletId) });

  return (
    <Select value={station} onValueChange={setStation}>
      <SelectTrigger className="bg-zinc-800 text-white border-zinc-600 w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Stations</SelectItem>
        {stations?.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
```

---

## 14.5 KDS WebSocket Hook

```typescript
export function useKdsSocket(outletId: string, station: string) {
  const [kots, setKots] = useState<Kot[]>([]);
  const { on } = useRestaurantSocket(outletId);

  // Initial load
  useEffect(() => {
    rstApi.get(`/kots?outletId=${outletId}&status=sent,accepted,preparing&station=${station}`)
      .then(data => setKots(data.kots));
  }, [outletId, station]);

  // Real-time updates
  useEffect(() => {
    on("new-kot", (data) => {
      if (station === "all" || data.station === station) {
        setKots(prev => [data.kot, ...prev]);
      }
    });
    on("kot-update", (data) => {
      setKots(prev => prev.map(k => k.id === data.kotId ? { ...k, status: data.status } : k)
        .filter(k => !["ready", "cancelled"].includes(k.status)));  // remove completed from board
    });
    on("menu-update", (data) => {
      // No KDS action needed on menu update — just informational
    });
  }, [station]);

  const onKotUpdate = (kotId: string, status: string) => {
    rstApi.post(`/kots/${kotId}/${status === "accepted" ? "accept" : status === "preparing" ? "start" : "ready"}`);
  };

  return { kots, onKotUpdate };
}
```
