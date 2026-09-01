// Frog cutouts on the canvas. Images are cached by URL and only handed back
// once decoded, so a frame that arrives before the PNG lands just skips it.
// Tints are pre-baked silhouettes — recolouring per frame would mean a
// composite pass on a 600KB sprite every rAF.
const images = new Map<string, HTMLImageElement>();
const tints = new Map<string, HTMLCanvasElement>();

export function loadSprite(src: string): HTMLImageElement | null {
  let img = images.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    images.set(src, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

// A flat-coloured copy of the sprite, alpha-matched to the original. Drawn
// over the frog at partial alpha it reads as a wash of that colour.
export function tintedSprite(src: string, color: string): HTMLCanvasElement | null {
  const img = loadSprite(src);
  if (!img) return null;

  const key = `${src}|${color}`;
  const cached = tints.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  tints.set(key, canvas);
  return canvas;
}
