// Chunky square particles — the cabinet language has no soft glows, so hits
// throw pixels and alpha is quantized into hard steps instead of fading smooth.
export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  ttl: number;
  size: number;
  color: string;
};

const GRAVITY = 0.0009;
const MAX_PARTICLES = 400;

export function createParticles() {
  let live: Particle[] = [];

  function burst(opts: {
    x: number;
    y: number;
    count: number;
    color: string;
    spread?: number;
    speed?: number;
    size?: number;
    ttl?: number;
    up?: number;
  }) {
    const spread = opts.spread ?? 1;
    const speed = opts.speed ?? 0.22;
    const size = opts.size ?? 3;
    const ttl = opts.ttl ?? 520;
    for (let i = 0; i < opts.count; i++) {
      const a = (i / opts.count) * Math.PI * 2;
      const jitter = 0.55 + ((i * 37) % 45) / 100;
      live.push({
        x: opts.x,
        y: opts.y,
        vx: Math.cos(a) * speed * spread * jitter,
        vy: Math.sin(a) * speed * jitter - (opts.up ?? 0.16),
        age: 0,
        ttl,
        size: size + ((i * 13) % 3),
        color: opts.color,
      });
    }
    if (live.length > MAX_PARTICLES) live = live.slice(-MAX_PARTICLES);
  }

  function update(dtMs: number) {
    const next: Particle[] = [];
    for (const p of live) {
      p.age += dtMs;
      if (p.age >= p.ttl) continue;
      p.x += p.vx * dtMs;
      p.y += p.vy * dtMs;
      p.vy += GRAVITY * dtMs;
      next.push(p);
    }
    live = next;
  }

  function draw(ctx: CanvasRenderingContext2D) {
    for (const p of live) {
      const remaining = 1 - p.age / p.ttl;
      ctx.globalAlpha = Math.ceil(remaining * 4) / 4;
      ctx.fillStyle = p.color;
      const s = Math.max(1, Math.round(p.size * (0.5 + remaining * 0.5)));
      ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
    }
    ctx.globalAlpha = 1;
  }

  return { burst, update, draw, count: () => live.length };
}

export type Particles = ReturnType<typeof createParticles>;
