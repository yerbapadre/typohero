import type { InstrumentLane, Song } from "@typohero/engine";
import {
  cutoffForQuality,
  gainForQuality,
  dryWetForQuality,
  makeDistortionCurve,
} from "./reactions";

class StemChannel {
  private lowpass: BiquadFilterNode;
  private dry: GainNode;
  private wet: GainNode;
  private out: GainNode;
  buffer: AudioBuffer | null = null;

  constructor(
    private ctx: AudioContext,
    master: AudioNode,
    curve: Float32Array,
  ) {
    this.lowpass = new BiquadFilterNode(ctx, { type: "lowpass", frequency: 18000 });
    const shaper = new WaveShaperNode(ctx, { curve });
    this.dry = new GainNode(ctx, { gain: 1 });
    this.wet = new GainNode(ctx, { gain: 0 });
    this.out = new GainNode(ctx, { gain: 1 });

    this.lowpass.connect(this.dry).connect(this.out);
    this.lowpass.connect(shaper).connect(this.wet).connect(this.out);
    this.out.connect(master);
  }

  startAt(when: number): void {
    if (!this.buffer) return;
    const source = new AudioBufferSourceNode(this.ctx, { buffer: this.buffer, loop: true });
    source.connect(this.lowpass);
    source.start(when);
  }

  setQuality(q: number): void {
    const t = this.ctx.currentTime;
    const tc = 0.08;
    const { dry, wet } = dryWetForQuality(q);
    this.lowpass.frequency.setTargetAtTime(cutoffForQuality(q), t, tc);
    this.dry.gain.setTargetAtTime(dry, t, tc);
    this.wet.gain.setTargetAtTime(wet, t, tc);
    this.out.gain.setTargetAtTime(gainForQuality(q), t, tc);
  }
}

export class MultiStemPlayer {
  private ctx: AudioContext;
  private master: GainNode;
  private channels = new Map<InstrumentLane, StemChannel>();

  constructor() {
    this.ctx = new AudioContext();
    this.master = new GainNode(this.ctx, { gain: 1 });
    const comp = new DynamicsCompressorNode(this.ctx);
    this.master.connect(comp).connect(this.ctx.destination);
  }

  async load(song: Song, baseUrl: string): Promise<void> {
    const curve = makeDistortionCurve(400);
    await Promise.all(
      song.lanes.map(async (lane) => {
        const channel = new StemChannel(this.ctx, this.master, curve);
        const res = await fetch(`${baseUrl}/${lane.stem}`);
        channel.buffer = await this.ctx.decodeAudioData(await res.arrayBuffer());
        this.channels.set(lane.instrument, channel);
      }),
    );
  }

  async start(): Promise<void> {
    await this.ctx.resume();
    const when = this.ctx.currentTime + 0.1;
    for (const channel of this.channels.values()) channel.startAt(when);
  }

  setQuality(lane: InstrumentLane, q: number): void {
    this.channels.get(lane)?.setQuality(q);
  }

  setAll(q: number): void {
    for (const channel of this.channels.values()) channel.setQuality(q);
  }

  stop(): void {
    void this.ctx.close();
  }
}
