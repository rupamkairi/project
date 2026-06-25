import { useEffect, useRef, useCallback } from "react";
import { rstApi } from "../lib/api/restaurant";

const WS_BASE = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL)
  ? (import.meta as any).env.VITE_API_URL.replace(/^http/, "ws")
  : "ws://localhost:10050";

type Handler = (data: unknown) => void;

export function useRestaurantSocket(path: string) {
  const ws = useRef<WebSocket | null>(null);
  const handlers = useRef<Map<string, Handler>>(new Map());
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const token = rstApi.getToken();
    const url = `${WS_BASE}${path}${token ? `?token=${token}` : ""}`;

    ws.current = new WebSocket(url);

    ws.current.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        const { type, ...data } = msg;
        handlers.current.get(type)?.(data);
        handlers.current.get("*")?.(msg);
      } catch {
        // ignore malformed
      }
    };

    ws.current.onclose = () => {
      reconnectTimer.current = setTimeout(connect, 2000);
    };
  }, [path]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  const on = useCallback((type: string, handler: Handler) => {
    handlers.current.set(type, handler);
  }, []);

  const send = useCallback((data: unknown) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  return { on, send };
}
