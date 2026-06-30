import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button, Badge, Switch,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@projectx/ui";
import { rstApi } from "../../../../lib/api/restaurant";
import { useOutletStore } from "../../../../stores/outlet-store";
import { RstStatusBadge } from "../../../../components/shared/StatusBadge";

const PLATFORMS = ["swiggy", "zomato", "uber_eats", "dunzo", "custom"] as const;

function AggregatorCard({ agg, onToggle, onTest }: {
  agg: any;
  onToggle: () => void;
  onTest: () => void;
}) {
  return (
    <div className="border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium capitalize">{agg.platform}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{agg.meta?.storeId}</p>
        </div>
        <Switch checked={agg.meta?.active ?? false} onCheckedChange={onToggle} />
      </div>
      <div className="flex gap-2">
        <RstStatusBadge status={agg.meta?.syncStatus ?? "unknown"} />
        {agg.meta?.lastSyncAt && (
          <span className="text-xs text-muted-foreground">
            Last sync: {new Date(agg.meta.lastSyncAt).toLocaleTimeString()}
          </span>
        )}
      </div>
      <Button size="sm" variant="outline" className="w-full" onClick={onTest}>
        Test Connection
      </Button>
    </div>
  );
}

function AddAggregatorDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { outletId } = useOutletStore();
  const [form, setForm] = useState({ platform: "", storeId: "", apiKey: "" });

  const save = useMutation({
    mutationFn: () => rstApi.createAggregatorMapping({ outletId: outletId!, ...form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rst-aggregators"] }); onClose(); },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Aggregator</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
            <SelectTrigger><SelectValue placeholder="Platform" /></SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Store / Restaurant ID" value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })} />
          <Input placeholder="API Key / Token" value={form.apiKey} type="password" onChange={(e) => setForm({ ...form, apiKey: e.target.value })} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!form.platform || !form.storeId || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminAggregatorsPage() {
  const { outletId } = useOutletStore();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["rst-aggregators", outletId],
    queryFn: () => rstApi.getAggregatorMappings({ outletId: outletId! }),
    enabled: !!outletId,
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      rstApi.updateAggregatorMapping(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rst-aggregators"] }),
  });

  const test = useMutation({
    mutationFn: (id: string) => rstApi.testAggregator(id),
  });

  const aggregators = data?.data ?? [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Aggregators</h1>
        <Button onClick={() => setAddOpen(true)}>+ Add Platform</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : aggregators.length === 0 ? (
        <div className="text-center py-12 border rounded-xl">
          <p className="text-3xl mb-3">🔌</p>
          <p className="text-sm text-muted-foreground">No aggregators connected</p>
          <Button className="mt-4" onClick={() => setAddOpen(true)}>Connect First Platform</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {aggregators.map((agg) => (
            <AggregatorCard
              key={agg.id}
              agg={agg}
              onToggle={() => toggle.mutate({ id: agg.id, active: !(agg.meta?.active ?? false) })}
              onTest={() => test.mutate(agg.id)}
            />
          ))}
        </div>
      )}

      {addOpen && <AddAggregatorDialog onClose={() => setAddOpen(false)} />}
    </div>
  );
}
