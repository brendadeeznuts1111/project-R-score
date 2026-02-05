# Dark Mode & CSS Consolidation Guide

## Overview

The Fire22 Dashboard now features a comprehensive dark mode implementation with
consolidated CSS architecture using Bun's native bundling capabilities.

## Features

### 🌓 Dark Mode

- **Automatic Detection**: Respects system preferences (`prefers-color-scheme`)
- **Manual Toggle**: Floating button (top-right) for user control
- **Keyboard Shortcut**: `Ctrl/Cmd + Shift + L` to toggle themes
- **Persistence**: Theme preference saved to localStorage
- **Smooth Transitions**: All theme changes animate smoothly

### 📦 CSS Architecture

- **Single Source**: All styles consolidated in `/css/styles.css`
- **Bun Bundling**: Native CSS bundling with content hashing
- **Extracted Styles**: Inline styles from 33 HTML files consolidated
- **Modular Structure**: Organized into base, components, themes, and utilities

## File Structure

```
public/css/
├── styles.css      # Main consolidated CSS (264KB)
├── index.css       # Bundled core styles (60KB)
└── MIGRATION_GUIDE.md

src/styles/
├── index.css       # Main entry point with @imports
├── base/           # Reset, variables, typography
├── components/     # Buttons, cards, forms, tables, modals
├── themes/         # Fire22 brand, dark mode
└── framework.css   # Additional framework styles

src/js/
└── theme-toggle.js # Theme switching logic
```

## Usage

### HTML Integration

```html
<!doctype html>
<html lang="en">
  <head>
    <!-- Consolidated CSS with Dark Mode -->
    <link rel="stylesheet" href="/css/styles.css" />
  </head>
  <body>
    <!-- Your content -->

    <!-- Theme Toggle Component -->
    <script src="/src/js/theme-toggle.js"></script>
  </body>
</html>
```

### Bun Commands

```bash
# Extract and consolidate CSS
bun run css:extract

# Build CSS with Bun
bun run css:build

# Watch for CSS changes
bun run css:watch

# Full CSS consolidation
bun run css:consolidate
```

### Configuration (bunfig.toml)

```toml
[scripts]
"css:extract" = "bun run scripts/extract-css.ts"
"css:build" = "bun build ./src/styles/index.css --outdir=public/css"
"css:watch" = "bun build ./src/styles/index.css --outdir=public/css --watch"
"css:consolidate" = "bun run css:extract && bun run css:build"

[serve.static]
directory = "public"

[serve.static.paths]
"/css" = "./public/css"
"/styles" = "./src/styles"
"/js" = "./src/js"
```

## Theme Variables

The dark mode uses CSS custom properties that automatically switch:

### Light Mode (Default)

```css
--color-background: #ffffff;
--color-text: #1a1a1a;
--color-primary: #fdbb2d;
--color-surface: #f5f5f5;
```

### Dark Mode

```css
--color-background: #1a1a1a;
--color-text: #e0e0e0;
--color-primary: #ff4444;
--color-surface: #242424;
```

## Server Configuration

The Express server (`server.js`) serves static files with proper caching:

```javascript
// Serve styles
app.use(
  '/src/styles',
  express.static('src/styles', {
    setHeaders: (res, path) => {
      if (path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
    },
  })
);

// Serve JavaScript
app.use(
  '/src/js',
  express.static('src/js', {
    setHeaders: (res, path) => {
      if (path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
    },
  })
);
```

## Testing

1. **Start the server**: `bun run dev-server`
2. **Visit test page**: http://localhost:3001/dark-mode-test.html
3. **Toggle theme**: Click button or press `Ctrl/Cmd + Shift + L`
4. **Check persistence**: Refresh page - theme should persist

## Migration Checklist

- [x] Create dark.css with theme variables
- [x] Build theme-toggle.js component
- [x] Configure Bun CSS bundling
- [x] Extract inline styles from HTML
- [x] Consolidate into public/css/styles.css
- [x] Update server static file serving
- [x] Add theme toggle to dashboard pages
- [x] Test across browsers

## Performance

- **CSS Size**: 264KB consolidated (includes all extracted styles)
- **Bundle Time**: ~9ms with Bun
- **Theme Switch**: < 300ms transition
- **Cache**: 1-hour browser cache for CSS/JS

## Browser Support

- ✅ Chrome/Edge 88+
- ✅ Firefox 87+
- ✅ Safari 14+
- ✅ Opera 74+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Notes

- The theme toggle respects `prefers-reduced-motion` for accessibility
- High contrast mode is supported with enhanced borders
- Print styles automatically use light theme
- All Fire22 brand colors adapt to dark mode
