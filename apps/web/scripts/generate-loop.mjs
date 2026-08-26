import { writeFileSync } from "node:fs";

const sr = 44100;
const dur = 4;
const N = sr * dur;
const data = new Float32Array(N);

const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
const step = 0.25;
const arp = [57, 60, 64, 60, 53, 57, 60, 57, 60, 64, 67, 64, 55, 59, 62, 59];
const bass = [45, 41, 48, 43];

for (let s = 0; s < arp.length; s++) {
  const f = midiToFreq(arp[s]);
  const start = Math.floor(s * step * sr);
  const len = Math.floor(step * sr);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const env = Math.exp(-t * 9);
    let v = 0;
    for (let h = 1; h <= 6; h++) v += Math.sin(2 * Math.PI * f * h * t) / h;
    data[start + i] += 0.18 * env * v;
  }
}

for (let b = 0; b < 4; b++) {
  const f = midiToFreq(bass[b]);
  const start = Math.floor(b * 4 * step * sr);
  const len = Math.floor(4 * step * sr);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const env = Math.exp(-t * 1.5) * 0.9 + 0.1;
    data[start + i] += 0.35 * env * Math.sin(2 * Math.PI * f * t);
  }
}

let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(data[i]));
const g = 0.85 / peak;

const dataLen = N * 2;
const buf = Buffer.alloc(44 + dataLen);
buf.write("RIFF", 0);
buf.writeUInt32LE(36 + dataLen, 4);
buf.write("WAVE", 8);
buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(1, 22);
buf.writeUInt32LE(sr, 24);
buf.writeUInt32LE(sr * 2, 28);
buf.writeUInt16LE(2, 32);
buf.writeUInt16LE(16, 34);
buf.write("data", 36);
buf.writeUInt32LE(dataLen, 40);
for (let i = 0; i < N; i++) {
  const s = Math.max(-1, Math.min(1, data[i] * g));
  buf.writeInt16LE((s * 32767) | 0, 44 + i * 2);
}

writeFileSync(process.argv[2], buf);
console.log("wrote", process.argv[2], buf.length, "bytes");
