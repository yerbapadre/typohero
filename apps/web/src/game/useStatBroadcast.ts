import { useEffect, useRef } from "react";
import type { LiveStat } from "@typohero/engine";
import type { ClientMsg } from "@typohero/protocol";

export function useStatBroadcast(
  stat: () => LiveStat,
  send: (msg: ClientMsg) => void,
  hz = 20,
  // A director has no lane, so nothing to report — and a phantom stat would
  // land in the band total.
  enabled = true,
) {
  const statRef = useRef(stat);
  statRef.current = stat;

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      send({ type: "stats", stat: statRef.current() });
    }, 1000 / hz);
    return () => clearInterval(id);
  }, [send, hz, enabled]);
}
