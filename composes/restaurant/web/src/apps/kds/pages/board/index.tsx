import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@projectx/ui";
import { rstApi, type Kot } from "../../../../lib/api/restaurant";
import { useOutletStore } from "../../../../stores/outlet-store";
import { useRestaurantSocket } from "../../../../hooks/use-restaurant-socket";
import { useElapsedMinutes } from "../../../../hooks/use-elapsed-time";
import { RstStatusBadge } from "../../../../components/shared/StatusBadge";

const STATIONS = ["grill", "cold", "pastry", "bar", "packaging"] as const;

function KotTimer({ sentAt }: { sentAt: string }) {
  const mins = useElapsedMinutes(sentAt);
  const urgent = mins >= 15;
  const warning = mins >= 10;
  return (
    <span
      className={cn(
        "font-mono text-xs font-bold px-2 py-0.5 rounded",
        urgent ? "bg-red-600 text-white" : warning ? "bg-amber-500 text-white" : "bg-zinc-700 text-zinc-200",
      )}
    >
      {mins}m
    </span>
  );
}

function KotCard({ kot, onAccept, onReady }: { kot: Kot; onAccept: () => void; onReady: () => void }) {
  const urgent = kot.status === "new";
  return (
    <div
      className={cn(
        "rounded-xl border p-3 space-y-2 transition-all",
        urgent ? "border-amber-500 bg-zinc-800" : "border-zinc-700 bg-zinc-900",
        kot.status === "ready" && "opacity-60",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold text-white text-sm">{kot.kotNumber}</span>
        <div className="flex items-center gap-2">
          {kot.sentAt && <KotTimer sentAt={kot.sentAt} />}
          <RstStatusBadge status={kot.status} />
        </div>
      </div>

      <div className="space-y-1">
        {kot.lines.map((line) => (
          <div key={line.id} className="flex gap-2 text-sm text-zinc-100">
            <span className="font-bold text-zinc-400">{line.qty}×</span>
            <span>{line.name}</span>
            {line.modifiers?.length > 0 && (
              <span className="text-zinc-400 text-xs">({line.modifiers.join(", ")})</span>
            )}
          </div>
        ))}
      </div>

      {kot.note && <p className="text-xs text-amber-300 italic">Note: {kot.note}</p>}

      <div className="flex gap-2 pt-1">
        {kot.status === "new" && (
          <button
            onClick={onAccept}
            className="flex-1 py-1.5 text-xs rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors"
          >
            Accept
          </button>
        )}
        {(kot.status === "new" || kot.status === "accepted") && (
          <button
            onClick={onReady}
            className="flex-1 py-1.5 text-xs rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold transition-colors"
          >
            Ready
          </button>
        )}
      </div>
    </div>
  );
}

function StationColumn({ station, kots, onAccept, onReady }: {
  station: string;
  kots: Kot[];
  onAccept: (id: string) => void;
  onReady: (id: string) => void;
}) {
  const activeKots = kots.filter((k) => k.status !== "bumped");
  return (
    <div className="flex flex-col h-full bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800">
        <span className="font-bold text-sm text-white capitalize">{station}</span>
        <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
          {activeKots.filter((k) => k.status !== "ready").length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {activeKots.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center pt-8">All clear</p>
        ) : (
          activeKots.map((kot) => (
            <KotCard
              key={kot.id}
              kot={kot}
              onAccept={() => onAccept(kot.id)}
              onReady={() => onReady(kot.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function KdsBoardPage() {
  const { outletId } = useOutletStore();
  const qc = useQueryClient();
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const socket = useRestaurantSocket(`/restaurants/ws/kds/${outletId}/${selectedStation ?? "all"}`);

  const { data } = useQuery({
    queryKey: ["rst-kds", outletId],
    queryFn: () => rstApi.getKots({ outletId: outletId! }),
    enabled: !!outletId,
    refetchInterval: 10_000,
  });

  useEffect(() => {
    const off = socket.on("kot-update", () => {
      qc.invalidateQueries({ queryKey: ["rst-kds", outletId] });
    });
    return off;
  }, [socket, outletId, qc]);

  const accept = useMutation({
    mutationFn: (id: string) => rstApi.acceptKot(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rst-kds"] }),
  });

  const ready = useMutation({
    mutationFn: (id: string) => rstApi.markKotReady(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rst-kds"] }),
  });

  const allKots: Kot[] = data?.data ?? [];
  const stations = [...new Set(allKots.map((k) => k.station).filter(Boolean))];
  const visibleStations = stations.length > 0 ? stations : STATIONS;

  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 bg-zinc-900 border-b border-zinc-800">
        <h1 className="text-white font-bold text-lg">KDS</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedStation(null)}
            className={cn(
              "text-xs px-3 py-1 rounded-full border transition-colors",
              !selectedStation ? "bg-white text-black border-white" : "text-zinc-300 border-zinc-700 hover:border-zinc-500",
            )}
          >
            All
          </button>
          {visibleStations.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedStation(s)}
              className={cn(
                "text-xs px-3 py-1 rounded-full border capitalize transition-colors",
                selectedStation === s ? "bg-white text-black border-white" : "text-zinc-300 border-zinc-700 hover:border-zinc-500",
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-3 text-xs text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />New
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Accepted
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Ready
          </span>
        </div>
      </div>

      {/* Board */}
      <div
        className="flex-1 grid gap-3 p-4 overflow-hidden"
        style={{ gridTemplateColumns: `repeat(${selectedStation ? 1 : Math.min(visibleStations.length, 5)}, 1fr)` }}
      >
        {(selectedStation ? [selectedStation] : visibleStations).map((station) => (
          <StationColumn
            key={station}
            station={station}
            kots={allKots.filter((k) => !selectedStation || k.station === station)}
            onAccept={(id) => accept.mutate(id)}
            onReady={(id) => ready.mutate(id)}
          />
        ))}
      </div>
    </div>
  );
}
