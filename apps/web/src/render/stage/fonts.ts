// The cabinet's two faces on the canvas: Silkscreen for every piece of chrome,
// a plain mono for note words (Silkscreen is unreadable at note size).
export function pixelFont(px: number): string {
  return `700 ${px}px Silkscreen, monospace`;
}

export function noteFont(px: number): string {
  return `600 ${px}px ui-monospace, SFMono-Regular, Menlo, monospace`;
}
