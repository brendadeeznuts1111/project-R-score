# 🎨 Repository HSL Color System

## Overview
Bright, animated HSL color system for repository badges, tags, and visual identity.

## HSL Color Palette

### Core Colors (High Saturation 100%)

| Name | HSL | Hex | Usage |
|------|-----|-----|-------|
| 🔮 Bun Purple | `hsl(280, 100%, 60%)` | `#bb33ff` | Bun Runtime |
| 🔷 TypeScript Blue | `hsl(210, 100%, 55%)` | `#1a8cff` | TypeScript |
| 🍀 Real-time Green | `hsl(150, 100%, 45%)` | `#00e673` | Real-time Features |
| 💗 WebSocket Pink | `hsl(320, 100%, 65%)` | `#ff4dc4` | WebSocket Protocol |
| 🔴 Security Red | `hsl(0, 100%, 60%)` | `#ff3333` | Security |
| 🌊 Analytics Cyan | `hsl(180, 100%, 50%)` | `#00ffff` | Analytics |
| 💜 Dashboard Violet | `hsl(260, 100%, 70%)` | `#9966ff` | Dashboard |
| 🟠 MCP Orange | `hsl(30, 100%, 55%)` | `#ff8c1a` | MCP Protocol |
| 💚 Vectorize Lime | `hsl(120, 100%, 50%)` | `#00ff00` | Vector Database |
| 🟡 Payment Gold | `hsl(45, 100%, 55%)` | `#ffc61a` | Payment Gateway |

## Animation System

### Pulse Animation
```css
@keyframes tagPulse {
  0%, 100% { box-shadow: 0 0 5px currentColor; }
  50% { box-shadow: 0 0 25px currentColor; }
}
```

### Shimmer Effect
```css
@keyframes tagShimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
```

## Badge Generator

Run the badge generator:
```bash
bun .github/badge-generator.ts
```

## Update GitHub Topics

Run the topics updater:
```bash
bash .github/update-topics.sh
```

## CSS Integration

Include the animated styles:
```html
<link rel="stylesheet" href=".github/assets/repo-tags.css">
```

## Shields.io Integration

Badges use shields.io with HSL-to-Hex conversion:
- Base URL: `https://img.shields.io/badge/`
- Style: `for-the-badge`
- Custom HSL colors converted to hex

## Files

- `.github/topics-config.json` - Topic configuration
- `.github/assets/repo-tags.css` - Animated styles
- `.github/badge-generator.ts` - Badge generator
- `.github/update-topics.sh` - Topics updater
