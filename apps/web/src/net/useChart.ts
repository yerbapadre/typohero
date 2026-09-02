import { useEffect, useState } from "react";
import type { ChartFile } from "@typohero/engine";

/** Null while loading, and for songs that were never charted. */
export function useChart(songId: string | null): ChartFile | null {
  const [chart, setChart] = useState<ChartFile | null>(null);

  useEffect(() => {
    if (!songId) {
      setChart(null);
      return;
    }
    let cancelled = false;
    fetch(`/songs/${songId}/chart.json`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ChartFile | null) => {
        if (!cancelled) setChart(data);
      })
      .catch(() => {
        if (!cancelled) setChart(null);
      });
    return () => {
      cancelled = true;
    };
  }, [songId]);

  return chart;
}
