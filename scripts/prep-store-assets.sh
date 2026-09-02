#!/usr/bin/env bash
# Turn a piece of pixel art into a store icon.
#
#   ./scripts/prep-store-assets.sh <source-image> <product-id>
#   ./scripts/prep-store-assets.sh ~/Downloads/pie.jpeg baja-blast-pie
#
# Generated pixel art arrives as a JPEG on a solid cream background, which would
# show as a light box against the dark pit and store menu. This flood-fills the
# background away from all four corners (only the connected outer region goes,
# so interior detail survives), trims to the art, and downscales with
# nearest-neighbour so the pixel edges stay hard instead of blurring.
#
# Output lands in apps/web/public/store/<product-id>.png, which is the path the
# products table's `icon` column points at (e.g. '/store/baja-blast-pie.png').
set -euo pipefail

if [ $# -ne 2 ]; then
  sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
fi

src="$1"
id="$2"
out_dir="$(cd "$(dirname "$0")/.." && pwd)/apps/web/public/store"
out="$out_dir/$id.png"

command -v magick >/dev/null || { echo "ImageMagick not found: brew install imagemagick" >&2; exit 1; }
[ -f "$src" ] || { echo "no such image: $src" >&2; exit 1; }

mkdir -p "$out_dir"

magick "$src" -alpha set -fuzz 18% \
  -fill none -draw "alpha 0,0 floodfill" \
  -fill none -draw "alpha %[fx:w-1],0 floodfill" \
  -fill none -draw "alpha 0,%[fx:h-1] floodfill" \
  -fill none -draw "alpha %[fx:w-1],%[fx:h-1] floodfill" \
  -trim +repage -filter point -resize 256x256 "$out"

echo "$out  ($(magick identify -format '%wx%h' "$out"), $(du -h "$out" | cut -f1))"
