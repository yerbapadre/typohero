import { useEffect, useRef } from "react";
import { liveStatFromRun, type TypingRun } from "@typohero/engine";
import type { ClientMsg } from "@typohero/protocol";

export function useStatBroadcast(run: TypingRun, send: (msg: ClientMsg) => void, hz = 20) {
  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    const id = setInterval(() => {
      send({ type: "stats", stat: liveStatFromRun(runRef.current) });
    }, 1000 / hz);
    return () => clearInterval(id);
  }, [send, hz]);
}
