import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { PRINT_H, PRINT_W } from "./shirts";

export type Tool = "brush" | "eraser" | "fill" | "stamp";

export type DrawHandle = {
  undo(): void;
  redo(): void;
  clear(): void;
  /** The print as a PNG data URL, or null if nothing has been painted. */
  toArt(): string | null;
  /** Replace the print wholesale (loading a saved design). Clears history. */
  loadArt(art: string | null): void;
};

// Snapshots are full ImageData, so the depth is a memory trade, not a feel one.
const HISTORY_LIMIT = 15;
// How far a pixel may drift from the one you clicked and still be flooded.
const FILL_TOLERANCE = 40;

function floodFill(img: ImageData, startX: number, startY: number, hex: string) {
  const { width, height, data } = img;
  const at = (x: number, y: number) => (y * width + x) * 4;

  const target = at(startX, startY);
  const tr = data[target]!, tg = data[target + 1]!, tb = data[target + 2]!, ta = data[target + 3]!;

  const fr = parseInt(hex.slice(1, 3), 16);
  const fg = parseInt(hex.slice(3, 5), 16);
  const fb = parseInt(hex.slice(5, 7), 16);
  if (tr === fr && tg === fg && tb === fb && ta === 255) return;

  const matches = (i: number) =>
    Math.abs(data[i]! - tr) <= FILL_TOLERANCE &&
    Math.abs(data[i + 1]! - tg) <= FILL_TOLERANCE &&
    Math.abs(data[i + 2]! - tb) <= FILL_TOLERANCE &&
    Math.abs(data[i + 3]! - ta) <= FILL_TOLERANCE;

  // Scanline flood: walk each row out to its edges, then queue the rows above
  // and below. Keeps the stack small enough for a full-bleed fill.
  const stack: [number, number][] = [[startX, startY]];
  const seen = new Uint8Array(width * height);

  while (stack.length) {
    const [sx, sy] = stack.pop()!;
    if (seen[sy * width + sx]) continue;

    let left = sx;
    while (left > 0 && matches(at(left - 1, sy))) left--;
    let right = sx;
    while (right < width - 1 && matches(at(right + 1, sy))) right++;

    for (let x = left; x <= right; x++) {
      const i = at(x, sy);
      data[i] = fr;
      data[i + 1] = fg;
      data[i + 2] = fb;
      data[i + 3] = 255;
      seen[sy * width + x] = 1;

      if (sy > 0 && !seen[(sy - 1) * width + x] && matches(at(x, sy - 1))) stack.push([x, sy - 1]);
      if (sy < height - 1 && !seen[(sy + 1) * width + x] && matches(at(x, sy + 1)))
        stack.push([x, sy + 1]);
    }
  }
}

export const DrawCanvas = forwardRef<
  DrawHandle,
  {
    tool: Tool;
    color: string;
    size: number;
    stamp: string;
    /** Painted straight onto the garment colour so you see the real print. */
    garment: string;
    onChange: (art: string | null) => void;
    onHistory: (state: { canUndo: boolean; canRedo: boolean }) => void;
    className?: string;
  }
>(function DrawCanvas({ tool, color, size, stamp, garment, onChange, onHistory, className = "" }, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const past = useRef<ImageData[]>([]);
  const future = useRef<ImageData[]>([]);
  const painting = useRef(false);
  const dirty = useRef(false);

  // Tool settings change every render; a ref keeps the pointer handlers stable.
  const opts = useRef({ tool, color, size, stamp });
  opts.current = { tool, color, size, stamp };

  const ctx = () => canvasRef.current?.getContext("2d", { willReadFrequently: true }) ?? null;

  const reportHistory = useCallback(() => {
    onHistory({ canUndo: past.current.length > 0, canRedo: future.current.length > 0 });
  }, [onHistory]);

  const emit = useCallback(() => {
    onChange(dirty.current ? (canvasRef.current?.toDataURL("image/png") ?? null) : null);
  }, [onChange]);

  const pushHistory = useCallback(() => {
    const c = ctx();
    if (!c) return;
    past.current.push(c.getImageData(0, 0, PRINT_W, PRINT_H));
    if (past.current.length > HISTORY_LIMIT) past.current.shift();
    future.current = [];
    reportHistory();
  }, [reportHistory]);

  function pointAt(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * PRINT_W,
      y: ((e.clientY - rect.top) / rect.height) * PRINT_H,
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = ctx();
    if (!c) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pushHistory();
    const { x, y } = pointAt(e);
    const { tool: t, color: col, size: s, stamp: st } = opts.current;

    if (t === "fill") {
      const img = c.getImageData(0, 0, PRINT_W, PRINT_H);
      floodFill(img, Math.round(x), Math.round(y), col);
      c.putImageData(img, 0, 0);
      dirty.current = true;
      emit();
      return;
    }

    if (t === "stamp") {
      c.save();
      c.globalCompositeOperation = "source-over";
      // Stamps read as a print, not a sticker — a mid brush lands ~1/5 of the
      // print wide.
      c.font = `${s * 8}px serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(st, x, y);
      c.restore();
      dirty.current = true;
      emit();
      return;
    }

    painting.current = true;
    c.globalCompositeOperation = t === "eraser" ? "destination-out" : "source-over";
    c.strokeStyle = col;
    c.fillStyle = col;
    c.lineWidth = s;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(x, y);
    // A tap with no drag should still leave a dot.
    c.lineTo(x + 0.01, y);
    c.stroke();
    dirty.current = true;
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!painting.current) return;
    const c = ctx();
    if (!c) return;
    const { x, y } = pointAt(e);
    c.lineTo(x, y);
    c.stroke();
  }

  function endStroke() {
    if (!painting.current) return;
    painting.current = false;
    const c = ctx();
    if (c) c.globalCompositeOperation = "source-over";
    emit();
  }

  const restore = useCallback(
    (from: ImageData[], to: ImageData[]) => {
      const c = ctx();
      const snapshot = from.pop();
      if (!c || !snapshot) return;
      to.push(c.getImageData(0, 0, PRINT_W, PRINT_H));
      c.putImageData(snapshot, 0, 0);
      dirty.current = true;
      reportHistory();
      emit();
    },
    [emit, reportHistory],
  );

  useImperativeHandle(
    ref,
    (): DrawHandle => ({
      undo: () => restore(past.current, future.current),
      redo: () => restore(future.current, past.current),
      clear: () => {
        const c = ctx();
        if (!c) return;
        pushHistory();
        c.clearRect(0, 0, PRINT_W, PRINT_H);
        dirty.current = false;
        emit();
      },
      toArt: () => (dirty.current ? (canvasRef.current?.toDataURL("image/png") ?? null) : null),
      loadArt: (art) => {
        const c = ctx();
        if (!c) return;
        past.current = [];
        future.current = [];
        reportHistory();
        c.clearRect(0, 0, PRINT_W, PRINT_H);
        if (!art) {
          dirty.current = false;
          emit();
          return;
        }
        const img = new Image();
        img.onload = () => {
          c.drawImage(img, 0, 0, PRINT_W, PRINT_H);
          dirty.current = true;
          emit();
        };
        img.src = art;
      },
    }),
    [emit, pushHistory, reportHistory, restore],
  );

  useEffect(() => {
    reportHistory();
  }, [reportHistory]);

  const cursor = tool === "fill" ? "cell" : tool === "stamp" ? "copy" : "crosshair";

  return (
    <canvas
      ref={canvasRef}
      width={PRINT_W}
      height={PRINT_H}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endStroke}
      onPointerLeave={endStroke}
      onPointerCancel={endStroke}
      className={"touch-none select-none " + className}
      style={{ background: garment, cursor }}
    />
  );
});
