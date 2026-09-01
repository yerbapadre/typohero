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

  startAt(when: number, offsetSec: number): void {
    if (!this.buffer) return;
    const source = new AudioBufferSourceNode(this.ctx, { buffer: this.buffer, loop: true });
    source.connect(this.lowpass);
    source.start(when, offsetSec % this.buffer.duration);
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

const LEAD_IN_SEC = 0.1;

export class MultiStemPlayer {
  private ctx: AudioContext;
  private master: GainNode;
  private channels = new Map<InstrumentLane, StemChannel>();
  private startedAtCtxTime: number | null = null;
  private startedAtOffsetSec = 0;

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

  /**
   * Aligns song position 0 with `anchorEpochMs` so the chart, the highway and
   * what comes out of the speakers all agree. Loading six stems takes long
   * enough that the anchor is usually already in the past, in which case
   * playback seeks into the song instead of starting late.
   */
  async start(anchorEpochMs?: number | null): Promise<void> {
    await this.ctx.resume();

    let when = this.ctx.currentTime + LEAD_IN_SEC;
    let offsetSec = 0;
    if (anchorEpochMs != null) {
      const aheadMs = anchorEpochMs - Date.now();
      if (aheadMs >= 0) {
        when = this.ctx.currentTime + aheadMs / 1000;
      } else {
        when = this.ctx.currentTime;
        offsetSec = -aheadMs / 1000;
      }
    }

    this.startedAtCtxTime = when;
    this.startedAtOffsetSec = offsetSec;
    for (const channel of this.channels.values()) channel.startAt(when, offsetSec);
  }

  /**
   * Song position from the audio clock, which is the only clock that matches
   * what the room is hearing. Null until playback has been scheduled.
   */
  songTimeMs(): number | null {
    if (this.startedAtCtxTime === null) return null;
    const latencySec = this.ctx.outputLatency || this.ctx.baseLatency || 0;
    const elapsed = this.ctx.currentTime - this.startedAtCtxTime - latencySec;
    return (elapsed + this.startedAtOffsetSec) * 1000;
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
