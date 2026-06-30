import Elysia from "elysia";
import type { EventBus } from "@core";

export function wsRoutes(bus: EventBus) {
  return new Elysia()
    // KDS WebSocket: kitchen staff subscribe per outlet+station
    .ws("/restaurant/ws/kds/:outletId/:station", {
      open(ws: any) {
        const { outletId, station } = ws.data?.params ?? {};
        if (outletId && station) {
          ws.subscribe(`kds:${outletId}:${station}`);
          ws.subscribe(`kds:${outletId}:all`);
        }
      },
      close(ws: any) {
        const { outletId, station } = ws.data?.params ?? {};
        if (outletId && station) {
          ws.unsubscribe(`kds:${outletId}:${station}`);
          ws.unsubscribe(`kds:${outletId}:all`);
        }
      },
      message() {},
    })
    // POS WebSocket: waiters / cashiers subscribe per outlet
    .ws("/restaurant/ws/pos/:outletId", {
      open(ws: any) {
        const { outletId } = ws.data?.params ?? {};
        if (outletId) ws.subscribe(`pos:${outletId}`);
      },
      close(ws: any) {
        const { outletId } = ws.data?.params ?? {};
        if (outletId) ws.unsubscribe(`pos:${outletId}`);
      },
      message() {},
    })
    // Delivery WebSocket: dispatcher
    .ws("/restaurant/ws/delivery/:outletId", {
      open(ws: any) {
        const { outletId } = ws.data?.params ?? {};
        if (outletId) ws.subscribe(`delivery:${outletId}`);
      },
      close(ws: any) {
        const { outletId } = ws.data?.params ?? {};
        if (outletId) ws.unsubscribe(`delivery:${outletId}`);
      },
      message() {},
    });
}
