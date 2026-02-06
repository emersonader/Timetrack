# HourFlow Icon Export Guide

You have `assets/icon-concept.svg`. Here's how to get production PNGs.

---

## Option 1: Figma (Free — Recommended)

1. Go to [figma.com](https://www.figma.com) and sign in (free account works).
2. Create a new file.
3. **File → Place Image** (or just drag-drop `icon-concept.svg` onto the canvas).
4. It imports as a vector group. Verify it looks correct.
5. For each required size:
   - Select the icon frame/group
   - In the right panel under **Export**, click **+**
   - Set format to **PNG**, suffix as needed
   - Set the width constraint (e.g., 1024, 180, 120, etc.)
   - Or: resize the frame to each size and export at 1x
6. Click **Export** to download.

**Pro tip:** Create frames at each target size (1024, 180, 120, 167, 152, 76) and place the icon inside each. Then select all and batch export.

---

## Option 2: appicon.co (Fastest — Zero Install)

1. First, export the SVG to a single 1024×1024 PNG (see "Quick PNG" below).
2. Go to [appicon.co](https://www.appicon.co/).
3. Upload the 1024×1024 PNG.
4. Check **iPhone** and **iPad**.
5. Click **Generate**.
6. Download the ZIP — it contains every size you need, correctly named, plus the Xcode `Contents.json`.
7. Drop the `AppIcon.appiconset` folder straight into Xcode's asset catalog.

---

## Option 3: Command Line (for devs)

### Quick PNG from SVG

```bash
# Install librsvg (macOS)
brew install librsvg

# Export 1024x1024
rsvg-convert -w 1024 -h 1024 assets/icon-concept.svg > assets/icon-1024.png

# Export all sizes at once
for size in 1024 180 120 167 152 76 87 80 60 40 58 29; do
  rsvg-convert -w $size -h $size assets/icon-concept.svg > "assets/icon-${size}x${size}.png"
done
```

### Alternative: Inkscape

```bash
brew install --cask inkscape

for size in 1024 180 120 167 152 76 87 80 60 40 58 29; do
  inkscape assets/icon-concept.svg --export-type=png \
    --export-width=$size --export-height=$size \
    --export-filename="assets/icon-${size}x${size}.png"
done
```

### Alternative: sharp (Node.js)

```bash
npm install sharp
node -e "
const sharp = require('sharp');
const sizes = [1024, 180, 120, 167, 152, 76, 87, 80, 60, 40, 58, 29];
Promise.all(sizes.map(s =>
  sharp('assets/icon-concept.svg')
    .resize(s, s)
    .png()
    .toFile(\`assets/icon-\${s}x\${s}.png\`)
));
"
```

---

## Option 4: Expo (if using Expo)

If the project uses Expo, you just need one 1024×1024 PNG:

1. Export `icon-concept.svg` → `assets/icon.png` at 1024×1024
2. In `app.json`:
   ```json
   {
     "expo": {
       "icon": "./assets/icon.png"
     }
   }
   ```
3. Expo generates all required sizes automatically at build time.

For the adaptive icon (Android):
```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/icon.png",
        "backgroundColor": "#059669"
      }
    }
  }
}
```

---

## Checklist Before Submitting to App Store

- [ ] 1024×1024 PNG exported (no alpha/transparency)
- [ ] No rounded corners baked in (iOS adds them)
- [ ] sRGB color space
- [ ] No layers or transparency — fully opaque
- [ ] Looks good at 29×29 (squint test: is the shape recognizable?)
- [ ] Placed in Xcode asset catalog or Expo `app.json`

---

## File Locations

```
Timetrack/
├── assets/
│   ├── icon-concept.svg    ← Source (vector, editable)
│   ├── icon-spec.md        ← Design documentation
│   └── icon-*.png          ← Exported PNGs (generated)
└── appstore/
    └── icon-export-guide.md ← This file
```

That's it. The SVG is production-ready — just export and ship. 🚀
