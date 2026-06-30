import { useState, useEffect } from "react";

export function useElapsedMinutes(sentAt: string | null | undefined): number {
  const [elapsed, setElapsed] = useState(() =>
    sentAt ? Math.floor((Date.now() - new Date(sentAt).getTime()) / 60000) : 0,
  );

  useEffect(() => {
    if (!sentAt) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(sentAt).getTime()) / 60000));
    }, 10_000);
    return () => clearInterval(interval);
  }, [sentAt]);

  return elapsed;
}
