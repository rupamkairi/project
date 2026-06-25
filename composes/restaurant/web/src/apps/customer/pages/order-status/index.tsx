import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "@tanstack/react-router";
import { Button } from "@projectx/ui";
import { rstApi } from "../../../../lib/api/restaurant";
import { RstStatusBadge } from "../../../../components/shared/StatusBadge";
import { AmountDisplay } from "../../../../components/shared/AmountDisplay";

const STEPS = [
  { key: "placed", label: "Order Placed" },
  { key: "accepted", label: "Accepted" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "served", label: "Served" },
];

function ProgressBar({ currentStatus }: { currentStatus: string }) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStatus);
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const done = i <= currentIndex;
        const active = i === currentIndex;
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-bold
                ${done ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                {done ? "✓" : i + 1}
              </div>
              <span className={`text-xs mt-1 text-center max-w-14 ${active ? "font-bold" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mb-5 ${i < currentIndex ? "bg-primary" : "bg-border"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function CustomerOrderStatusPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();

  const { data: order, isLoading } = useQuery({
    queryKey: ["rst-order-pub", id],
    queryFn: () => rstApi.getOrder(id),
    refetchInterval: 10_000,
  });

  if (isLoading) {
    return <div className="max-w-lg mx-auto p-6 text-center text-muted-foreground">Loading…</div>;
  }

  if (!order) {
    return <div className="max-w-lg mx-auto p-6 text-center text-red-500">Order not found</div>;
  }

  const status = order.meta?.status ?? "";
  const isFinal = ["served", "completed", "rejected"].includes(status);

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <p className="text-4xl mb-2">
          {status === "ready" ? "🍽️" : status === "served" ? "✅" : status === "preparing" ? "👨‍🍳" : "📋"}
        </p>
        <h1 className="text-xl font-bold">Order #{order.meta?.orderNumber ?? id.slice(0, 8)}</h1>
        <div className="flex justify-center mt-2">
          <RstStatusBadge status={status} />
        </div>
      </div>

      <ProgressBar currentStatus={status} />

      <div className="border rounded-xl divide-y">
        {(order.lines ?? []).map((line) => (
          <div key={line.id} className="flex justify-between text-sm px-4 py-3">
            <span>{line.qty}× {line.meta?.name ?? line.itemId}</span>
            <AmountDisplay amount={line.unitPriceAmount ?? line.unitPrice} />
          </div>
        ))}
        {order.meta?.total && (
          <div className="flex justify-between font-bold px-4 py-3">
            <span>Total</span>
            <AmountDisplay amount={order.meta.total} />
          </div>
        )}
      </div>

      {status === "ready" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="font-bold text-green-700">Your order is ready!</p>
          <p className="text-sm text-green-600 mt-1">Please collect from the counter.</p>
        </div>
      )}

      {isFinal && (
        <Button className="w-full" onClick={() => navigate({ to: "/customer/menu" })}>
          Order Again
        </Button>
      )}
    </div>
  );
}
