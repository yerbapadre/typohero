import { useEffect, useRef } from "react";
import type { LiveStat } from "@typohero/engine";
import type { ClientMsg } from "@typohero/protocol";

export function useStatBroadcast(stat: () => LiveStat, send: (msg: ClientMsg) => void, hz = 20) {
  const statRef = useRef(stat);
  statRef.current = stat;

  useEffect(() => {
    const id = setInterval(() => {
      send({ type: "stats", stat: statRef.current() });
    }, 1000 / hz);
    return () => clearInterval(id);
  }, [send, hz]);
}
