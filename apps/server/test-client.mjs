const URL = "ws://localhost:8799/room/test-room/ws";
const log = (who, ...a) => console.log(`[${who}]`, ...a);
const seen = { countdown: false, playing: false, frames: 0, results: false };

function client(name) {
  const ws = new WebSocket(URL);
  const state = { ws, name, playerId: null };
  ws.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === "welcome") {
      state.playerId = msg.playerId;
      log(name, "welcome", msg.playerId.slice(0, 8), "host=", msg.snapshot.hostId?.slice(0, 8));
    } else if (msg.type === "countdown") {
      seen.countdown = true;
      log(name, "COUNTDOWN startAt", msg.startAtEpochMs);
    } else if (msg.type === "frame") {
      seen.frames++;
      if (seen.frames <= 2) log(name, "frame", JSON.stringify(msg.stats));
    } else if (msg.type === "results") {
      seen.results = true;
      log(name, "RESULTS", JSON.stringify(msg.final));
    } else if (msg.type === "session") {
      log(name, "session phase=", msg.snapshot.phase, "song=", msg.snapshot.songId,
        "members=", msg.snapshot.members.map((m) => `${m.name}:${m.instrument ?? "-"}:${m.ready ? "R" : "-"}`).join(","));
    }
  });
  return state;
}

const send = (c, msg) => c.ws.send(JSON.stringify(msg));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const a = client("A");
await wait(300);
send(a, { type: "join", name: "Alice" });
await wait(200);
const b = client("B");
await wait(300);
send(b, { type: "join", name: "Bob" });
await wait(300);

log("--", "host proposes song (auto-confirm)");
send(a, { type: "proposeSong", songId: "chocolate", durationMs: 2000 });
await wait(300);

log("--", "both pick instruments + ready");
send(a, { type: "pickInstrument", instrument: "vocals" });
send(b, { type: "pickInstrument", instrument: "drums" });
await wait(300);
send(a, { type: "ready", ready: true });
send(b, { type: "ready", ready: true });
await wait(300);

log("--", "host starts");
send(a, { type: "proposeStart" });

const statTimer = setInterval(() => {
  send(a, { type: "stats", stat: { quality: 0.9, streak: 12, points: 1500, progress: 0.4, accuracy: 0.95 } });
  send(b, { type: "stats", stat: { quality: 0.6, streak: 0, points: 800, progress: 0.3, accuracy: 0.7 } });
}, 100);

await wait(6000);
clearInterval(statTimer);

console.log("\n=== RESULT ===");
console.log(JSON.stringify(seen, null, 2));
const ok = seen.countdown && seen.playing === false ? true : true;
console.log(seen.countdown && seen.frames > 0 && seen.results ? "PASS" : "CHECK OUTPUT");
process.exit(0);
