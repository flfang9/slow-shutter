# Slow Shutter 📸

A mobile-first PWA that applies cinematic slow-shutter blur effects to photos using GPU-accelerated WebGL processing.

🌐 **Live Demo:** [slow-shutter.vercel.app](https://slow-shutter.vercel.app)

## Features

### 🎨 Three Cinematic Blur Effects

- **Lateral Motion** - Horizontal directional blur with luminance weighting
- **Vertical Zoom Pull** - Radial blur from bottom center with graduated intensity
- **Handheld Drift** - Diagonal blur with organic, randomized feel

### ✨ Post-Processing Stack

Every effect includes professional-grade post-processing:
- **Film Grain** - Randomized luminance noise (~5% opacity)
- **Vibrance Boost** - +18% selective saturation enhancement
- **Light Bloom** - Soft glow on bright areas (luminance > 0.8)
- **Contrast Curve** - S-curve for deeper blacks and brighter highlights

### ⚡ Performance

- **Client-side only** - Zero server costs, complete privacy
- **GPU-accelerated** - WebGL fragment shaders for real-time processing
- **< 3 seconds** - Processing time on mid-tier mobile devices
- **4000px max** - Automatic scaling for large images

## Tech Stack

- **Next.js 16** - App Router with TypeScript 5
- **WebGL** - Custom fragment shaders for GPU processing
- **Tailwind CSS** - Cinematic dark theme (#0A0A0A + #C8FF00 accent)
- **shadcn/ui** - Accessible component library
- **PWA** - Installable, works offline

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
git clone https://github.com/yourusername/slow-shutter.git
cd slow-shutter
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build

```bash
npm run build
npm start
```

### Generate Icons

```bash
node scripts/generate-icons.js
```

## Usage

1. **Upload** - Drag & drop or tap to select a JPEG image
2. **Choose Effect** - Select from 3 cinematic blur styles
3. **Adjust** - Fine-tune intensity (0-100) in Advanced controls
4. **Export** - Download or share your processed image

## Architecture

### WebGL Pipeline

```
Upload Image → Canvas → WebGL Texture → Apply Effect Shader →
Post-Processing Stack (grain → vibrance → bloom → contrast) →
Read Pixels → Canvas → Download
```

### File Structure

```
lib/webgl/
├── shaders.ts      # All GLSL shader source code
├── program.ts      # Shader compilation utilities
├── context.ts      # WebGL initialization
└── processor.ts    # Main EffectProcessor class

components/
├── DropZone.tsx         # File upload
├── EffectSelector.tsx   # Effect picker
├── AdvancedControls.tsx # Intensity slider
├── ImagePreview.tsx     # Result display
└── ExportControls.tsx   # Save/Share/Reset
```

## Browser Support

- ✅ Chrome/Edge (desktop & mobile)
- ✅ Safari (desktop & mobile)
- ✅ Firefox (desktop & mobile)
- ⚠️ Requires WebGL support

## Roadmap

- [ ] RAW file support (CR2, NEF, ARW)
- [ ] Additional effects (Radial Zoom, Light Trail)
- [ ] Before/after comparison slider
- [ ] Batch processing
- [ ] Named presets ("Tokyo at Night", "Race Pace")
- [ ] AI subject detection (blur background only)

## License

MIT

## Credits

Built with Claude Code by Anthropic

---

**Made with ⚡ by Freddy Fang**
