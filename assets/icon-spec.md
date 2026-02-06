# HourFlow — App Icon Specification

## Design Concept: Flow Timer (Option C)

A circular progress ring surrounding a minimal clock face, on an emerald green background. The progress ring sits at ~75% (270°), evoking active time tracking in progress. The inner clock face grounds the "time" concept, while the ring conveys "flow" and forward momentum.

## Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Primary | `#059669` | Brand emerald green |
| Dark | `#047857` | Gradient edge (bottom-right) |
| Light | `#10B981` | Gradient highlight (top-left) |
| Foreground | `#FFFFFF` | Ring, clock, hands |
| Track | `rgba(255,255,255,0.15)` | Background ring (subtle guide) |

The background uses a radial gradient from Light (#10B981, top-left) to Dark (#047857, bottom-right), giving the icon depth and a natural light source without breaking flat-design norms.

## Anatomy

```
┌──────────────────────┐
│                      │
│    ╭── progress ──╮  │
│   ╱    270° arc    ╲ │
│  │   ┌──────────┐  │ │
│  │   │  clock   │  │ │
│  │   │  10:10   │  │ │
│  │   └──────────┘  │ │
│   ●                ╱ │  ← leading dot
│    ╰──────────────╯  │
│                      │
│   emerald gradient   │
└──────────────────────┘
```

- **Background:** Full square with `rx="224"` rounded corners (for preview; iOS masks to its own superellipse).
- **Progress ring:** White, 56px stroke, round caps, 300px radius. 270° filled, 90° gap.
- **Leading dot:** 34px radius white circle at the arc's leading end for a polished, modern feel.
- **Clock face:** 120px radius circle, 10px white stroke. Four tick marks at 12/3/6/9. Hour and minute hands at ~10:10 position.
- **Center dot:** 10px radius white circle.

## Design Rationale

1. **Progress ring (75%)** — The dominant element. Communicates "tracking in progress" instantly. The 75% fill is visually balanced and suggests active work without feeling complete or stalled.
2. **Clock face** — Anchors the "time" concept. The 10:10 hand position is industry-standard for clock icons (symmetrical, aesthetically pleasing, "smiling").
3. **Emerald green** — Connotes money, growth, productivity, and health. Professional but warm.
4. **Gradient** — Adds depth without complexity. The top-left highlight mimics natural light.
5. **White on green** — Maximum contrast and legibility at all sizes. Passes WCAG AAA.

## Required Sizes (iOS)

iOS automatically applies its superellipse corner mask. **Export as square PNGs** (no transparency, no rounded corners).

| Size | Use | Scale |
|------|-----|-------|
| 1024×1024 | App Store listing | — |
| 180×180 | iPhone (iOS 7+) | @3x |
| 120×120 | iPhone (iOS 7+) | @2x |
| 167×167 | iPad Pro | @2x |
| 152×152 | iPad | @2x |
| 76×76 | iPad | @1x |
| 87×87 | Spotlight (iPhone) | @3x |
| 80×80 | Spotlight (iPad) | @2x |
| 40×40 | Spotlight (iPad) | @1x |
| 60×60 | Notification (iPhone) | @3x |
| 40×40 | Notification (iPhone) | @2x |
| 29×29 | Settings | @1x |
| 58×58 | Settings | @2x |
| 87×87 | Settings | @3x |

## Exporting from SVG to PNG

### Quick: Command line (recommended)

```bash
# Using librsvg (install: brew install librsvg)
for size in 1024 180 120 167 152 76 87 80 60 40 58 29; do
  rsvg-convert -w $size -h $size icon-concept.svg > "icon-${size}x${size}.png"
done
```

### Alternative: Inkscape CLI

```bash
for size in 1024 180 120 167 152 76 87 80 60 40 58 29; do
  inkscape icon-concept.svg --export-type=png \
    --export-width=$size --export-height=$size \
    --export-filename="icon-${size}x${size}.png"
done
```

### Alternative: sharp (Node.js)

```js
const sharp = require('sharp');
const sizes = [1024, 180, 120, 167, 152, 76, 87, 80, 60, 40, 58, 29];

for (const size of sizes) {
  await sharp('icon-concept.svg')
    .resize(size, size)
    .png()
    .toFile(`icon-${size}x${size}.png`);
}
```

### Xcode Asset Catalog

After exporting, place the PNGs into `ios/<ProjectName>/Images.xcassets/AppIcon.appiconset/` and update the corresponding `Contents.json`. If using Expo, set `"icon": "./assets/icon-1024x1024.png"` in `app.json` and Expo handles the rest.

## Legibility Check

At 29×29 the icon renders as: green square → white ring → white dot. The clock details fade but the overall shape (ring + center) remains distinct and recognizable. This is by design — the silhouette carries the identity.
