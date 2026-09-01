import { useEffect, useState } from "react";

export function useCountIn(startAtMs: number | null): { waiting: boolean; remainingMs: number } {
  const [remainingMs, setRemainingMs] = useState(() =>
    startAtMs === null ? 0 : Math.max(0, startAtMs - Date.now()),
  );

  useEffect(() => {
    if (startAtMs === null) {
      setRemainingMs(0);
      return;
    }
    let raf = 0;
    function tick() {
      const left = Math.max(0, startAtMs! - Date.now());
      setRemainingMs(left);
      if (left > 0) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [startAtMs]);

  return { waiting: remainingMs > 0, remainingMs };
}
