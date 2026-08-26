import {
  cutoffForQuality,
  gainForQuality,
  dryWetForQuality,
  makeDistortionCurve,
} from "./reactions";

export class StemPlayer {
  private ctx: AudioContext;
  private lowpass: BiquadFilterNode;
  private shaper: WaveShaperNode;
  private dry: GainNode;
  private wet: GainNode;
  private out: GainNode;
  private comp: DynamicsCompressorNode;
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;

  constructor() {
    this.ctx = new AudioContext();
    this.lowpass = new BiquadFilterNode(this.ctx, { type: "lowpass", frequency: 18000 });
    this.shaper = new WaveShaperNode(this.ctx, { curve: makeDistortionCurve(400) });
    this.dry = new GainNode(this.ctx, { gain: 1 });
    this.wet = new GainNode(this.ctx, { gain: 0 });
    this.out = new GainNode(this.ctx, { gain: 1 });
    this.comp = new DynamicsCompressorNode(this.ctx);

    this.lowpass.connect(this.dry).connect(this.out);
    this.lowpass.connect(this.shaper).connect(this.wet).connect(this.out);
    this.out.connect(this.comp).connect(this.ctx.destination);
  }

  async load(url: string): Promise<void> {
    const res = await fetch(url);
    const bytes = await res.arrayBuffer();
    this.buffer = await this.ctx.decodeAudioData(bytes);
  }

  async start(): Promise<void> {
    await this.ctx.resume();
    if (!this.buffer) return;
    const source = new AudioBufferSourceNode(this.ctx, { buffer: this.buffer, loop: true });
    source.connect(this.lowpass);
    source.start();
    this.source = source;
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

  stop(): void {
    this.source?.stop();
    this.source = null;
    void this.ctx.close();
  }
}
