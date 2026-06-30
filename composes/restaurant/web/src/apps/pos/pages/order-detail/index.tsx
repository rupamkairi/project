import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "@tanstack/react-router";
import {
  Button, Badge, Card, CardHeader, CardTitle, CardContent,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  cn,
} from "@projectx/ui";
import { rstApi, type Payment } from "../../../../lib/api/restaurant";
import { RstStatusBadge } from "../../../../components/shared/StatusBadge";
import { AmountDisplay } from "../../../../components/shared/AmountDisplay";

function BillSettleDialog({ bill, onClose, onSettled }: { bill: any; onClose: () => void; onSettled: () => void }) {
  const [payments, setPayments] = useState<Payment[]>([{ method: "cash", amount: parseFloat(bill.meta?.total ?? "0") }]);
  const qc = useQueryClient();

  const settle = useMutation({
    mutationFn: () => rstApi.settleBill(bill.id, payments),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rst-order"] }); onSettled(); onClose(); },
  });

  const billTotal = parseFloat(bill.meta?.total ?? "0");
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const cashPmt = payments.find((p) => p.method === "cash");
  const changeDue = cashPmt ? Math.max(0, cashPmt.amount - (billTotal - (totalPaid - cashPmt.amount))) : 0;
  const balanced = Math.abs(totalPaid - billTotal) <= 0.01;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Settle Bill #{bill.meta?.billNumber}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span><AmountDisplay amount={bill.meta?.total} />
          </div>
          {payments.map((pmt, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Select value={pmt.method} onValueChange={(v) => {
                const next = [...payments];
                next[i] = { ...pmt, method: v as Payment["method"] };
                setPayments(next);
              }}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["cash", "card", "upi", "wallet"].map((m) => (
                    <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={pmt.amount}
                onChange={(e) => {
                  const next = [...payments];
                  next[i] = { ...pmt, amount: parseFloat(e.target.value) || 0 };
                  setPayments(next);
                }}
                className="flex-1"
              />
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setPayments([...payments, { method: "cash", amount: 0 }])}>
            + Add Payment
          </Button>
          {changeDue > 0 && (
            <div className="bg-green-50 rounded p-3 flex justify-between text-green-700 font-medium">
              <span>Change Due</span><AmountDisplay amount={changeDue} />
            </div>
          )}
          <div className={cn("flex justify-between text-sm", balanced ? "text-green-600" : "text-red-500")}>
            <span>Balance</span><AmountDisplay amount={billTotal - totalPaid} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!balanced || settle.isPending} onClick={() => settle.mutate()}>
            {settle.isPending ? "Settling…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OrderDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [bill, setBill] = useState<any>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ["rst-order", id],
    queryFn: () => rstApi.getOrder(id),
    refetchInterval: 10_000,
  });

  const createBill = useMutation({
    mutationFn: () => rstApi.createBill(id),
    onSuccess: (res) => { setBill(res.data); setSettleDialogOpen(true); },
  });

  const acceptOrder = useMutation({
    mutationFn: () => rstApi.acceptOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rst-order", id] }),
  });

  if (isLoading) return <div className="p-6 text-muted-foreground text-sm">Loading…</div>;
  if (!order) return <div className="p-6 text-sm text-red-500">Order not found</div>;

  const status = order.meta?.status ?? "";

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate({ to: "/restaurants/pos/orders" })} className="text-xs text-muted-foreground mb-1 hover:underline">
            ← Back
          </button>
          <h1 className="text-2xl font-mono font-bold">{order.meta?.orderNumber ?? id.slice(0, 8)}</h1>
          <p className="text-sm text-muted-foreground capitalize mt-1">{order.meta?.orderType}</p>
        </div>
        <div className="flex items-center gap-2">
          <RstStatusBadge status={status} />
          {status === "placed" && (
            <Button size="sm" onClick={() => acceptOrder.mutate()} disabled={acceptOrder.isPending}>
              Accept
            </Button>
          )}
          {["ready", "accepted", "preparing", "placed"].includes(status) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => createBill.mutate()}
              disabled={createBill.isPending}
            >
              Bill
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Items ({order.lines?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="kots">KOTs ({order.kots?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-4">
          {(order.lines ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No items</p>
          ) : (
            <div className="space-y-2">
              {(order.lines ?? []).map((line) => (
                <div key={line.id} className="flex justify-between text-sm py-2 border-b last:border-0">
                  <span>{line.meta?.name ?? line.itemId}</span>
                  <span className="text-muted-foreground">
                    {line.qty}× <AmountDisplay amount={line.unitPriceAmount ?? line.unitPrice} />
                  </span>
                </div>
              ))}
            </div>
          )}
          {["draft", "placed", "accepted", "preparing"].includes(status) && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => navigate({ to: "/restaurants/pos/orders/new", search: { addTo: id } as any })}
            >
              + Add Items
            </Button>
          )}
        </TabsContent>

        <TabsContent value="kots" className="mt-4">
          {(order.kots ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No KOTs yet</p>
          ) : (
            <div className="space-y-3">
              {(order.kots ?? []).map((kot) => (
                <Card key={kot.id} className="p-3">
                  <div className="flex justify-between items-center">
                    <p className="font-mono text-sm font-bold">{kot.kotNumber}</p>
                    <RstStatusBadge status={kot.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">Station: {kot.station}</p>
                  {kot.readyAt && <p className="text-xs text-green-600 mt-1">Ready {new Date(kot.readyAt).toLocaleTimeString()}</p>}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {settleDialogOpen && bill && (
        <BillSettleDialog
          bill={bill}
          onClose={() => setSettleDialogOpen(false)}
          onSettled={() => navigate({ to: "/restaurants/pos/orders" })}
        />
      )}
    </div>
  );
}
