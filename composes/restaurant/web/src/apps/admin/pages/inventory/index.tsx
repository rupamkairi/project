import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button, Input, Badge,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  cn,
} from "@projectx/ui";
import { rstApi, type Ingredient } from "../../../../lib/api/restaurant";
import { useOutletStore } from "../../../../stores/outlet-store";

function IngredientRow({ item, onAdjust }: { item: Ingredient; onAdjust: (id: string) => void }) {
  const low = item.stock <= (item.reorderLevel ?? 0);
  return (
    <div className="flex items-center gap-3 p-3 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{item.name}</p>
          {low && <Badge variant="destructive" className="text-xs">Low Stock</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">{item.unit}</p>
      </div>
      <div className="text-right">
        <p className={cn("font-mono font-bold text-sm", low ? "text-red-500" : "text-foreground")}>
          {item.stock}
        </p>
        {item.reorderLevel && (
          <p className="text-xs text-muted-foreground">min {item.reorderLevel}</p>
        )}
      </div>
      <Button size="sm" variant="outline" onClick={() => onAdjust(item.id)}>Adjust</Button>
    </div>
  );
}

function AdjustDialog({ id, name, onClose }: { id: string; name: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("restock");

  const adjust = useMutation({
    mutationFn: () => rstApi.adjustIngredient(id, { delta: parseFloat(delta), reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rst-inventory"] }); onClose(); },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Adjust: {name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input
            type="number"
            placeholder="Delta (+ or –)"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
          />
          <Input
            placeholder="Reason (restock, wastage, use…)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!delta || adjust.isPending} onClick={() => adjust.mutate()}>
            {adjust.isPending ? "Saving…" : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminInventoryPage() {
  const { outletId } = useOutletStore();
  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["rst-inventory", outletId],
    queryFn: () => rstApi.getIngredients({ outletId: outletId! }),
    enabled: !!outletId,
    refetchInterval: 60_000,
  });

  const ingredients: Ingredient[] = data?.data ?? [];
  const filtered = search
    ? ingredients.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : ingredients;

  const lowCount = ingredients.filter((i) => i.stock <= (i.reorderLevel ?? 0)).length;
  const adjustItem = adjustId ? ingredients.find((i) => i.id === adjustId) : null;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Inventory</h1>
          {lowCount > 0 && (
            <p className="text-sm text-red-500 mt-0.5">{lowCount} item{lowCount > 1 ? "s" : ""} below reorder level</p>
          )}
        </div>
      </div>

      <Input
        placeholder="Search ingredients…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

      <div className="border rounded-xl overflow-hidden">
        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No items found</p>
        ) : (
          filtered.map((item) => (
            <IngredientRow key={item.id} item={item} onAdjust={setAdjustId} />
          ))
        )}
      </div>

      {adjustId && adjustItem && (
        <AdjustDialog id={adjustId} name={adjustItem.name} onClose={() => setAdjustId(null)} />
      )}
    </div>
  );
}
