# Golden CSS Template

Elite CSS patterns using modern syntax with Bun's CSS bundler syntax lowering.

**A huge thanks goes to the amazing work from the authors of LightningCSS and esbuild.**

## Overview

The Golden CSS Template (`styles/golden-template.css`) demonstrates best practices for modern CSS development using:

- **CSS Nesting** - LightningCSS-style nested selectors
- **Color Functions** - color-mix(), relative colors (lch(from ...)), LAB colors
- **LAB Colors** - Perceptually uniform color spaces (LAB, LCH, OKLAB, OKLCH) with automatic fallbacks
- **Logical Properties** - RTL/LTR support with margin-inline, padding-block
- **Modern Selectors** - :is(), :not(), :dir(), :lang()
- **Math Functions** - clamp(), round() for responsive design
- **Media Query Ranges** - Modern width >= 768px syntax
- **Modern Shorthands** - place-items, overflow: hidden auto
- **light-dark()** - Automatic theme support
- **CSS Custom Properties** - Design tokens with color-mix variants

## Features

### Design Tokens

Comprehensive design system using CSS custom properties:

```css
:root {
  /* Base Colors - LAB colors for perceptual uniformity */
  /* Bun automatically creates layered fallbacks for browser compatibility */
  --color-base-00: oklch(98% 0.01 250);
  --color-base-100: oklch(5% 0.05 250);
  
  /* Brand Colors - with color-mix variants */
  --color-brand-primary: #667eea;
  --color-brand-primary-light: color-mix(in srgb, var(--color-brand-primary) 80%, white);
  
  /* Semantic Colors - relative colors */
  --color-success: #10b981;
  --color-success-light: lch(from var(--color-success) calc(l + 15%) c h);
  
  /* Theme Colors - light-dark() */
  --color-bg-primary: light-dark(var(--color-base-00), var(--color-base-100));
}
```

**LAB Colors Benefits:**
- Perceptually uniform (equal steps appear equally different)
- Wider gamut than sRGB (more vibrant colors)
- Better for gradients (smooth transitions)
- Automatic fallbacks (Bun handles browser compatibility)

### Component Patterns

#### Card Component

```css
.card {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  padding-block: var(--space-lg);
  padding-inline: var(--space-lg);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }
  
  .card-header {
    margin-block-end: var(--space-md);
    border-block-end: 1px solid var(--color-border-subtle);
  }
}
```

#### Button Component

```css
.button {
  padding-block: round(12px, 2px);
  padding-inline: round(24px, 4px);
  background: var(--color-brand-primary);
  border-radius: var(--radius-md);
  
  &:hover {
    background: var(--color-brand-primary-dark);
    transform: translateY(-1px);
  }
  
  &.button-primary { /* ... */ }
  &.button-secondary { /* ... */ }
}
```

### Responsive Typography

Using clamp() for fluid typography:

```css
:root {
  --font-size-base: clamp(1rem, 2.5vw, 1.125rem);
  --font-size-xl: clamp(1.25rem, 3.5vw, 1.5rem);
  --font-size-4xl: clamp(2.5rem, 6vw, 3.5rem);
}
```

### Math Functions

CSS math functions evaluated at build time when constants:

```css
.dynamic-sizing {
  /* Clamp a value between minimum and maximum */
  width: clamp(200px, 50%, 800px);
  
  /* Round to the nearest multiple */
  padding: round(14.8px, 5px);
  
  /* Trigonometry for animations */
  transform: rotate(calc(sin(45deg) * 50deg));
  
  /* Complex math with multiple functions */
  --scale-factor: pow(1.25, 3);
  font-size: calc(16px * var(--scale-factor));
}
```

Bun evaluates these at build time:
- `round(14.8px, 5px)` → `15px`
- `sin(45deg) * 50deg` → `35.36deg`
- `pow(1.25, 3)` → `1.953125`

### Responsive Spacing

Using clamp() for fluid spacing:

```css
:root {
  --space-md: clamp(1rem, 2vw, 1.5rem);
  --space-lg: clamp(1.5rem, 3vw, 2rem);
  --space-xl: clamp(2rem, 4vw, 3rem);
}
```

### Modern Selectors

#### :is() Selector Pattern

The `:is()` selector simplifies complex selector groups. Bun's CSS bundler automatically generates vendor-prefixed fallbacks for older browsers:

```css
/* Instead of writing these separately */
/* 
.article h1,
.article h2,
.article h3 {
  margin-top: 1.5em;
}
*/

/* You can write this - Bun handles fallbacks automatically */
.article :is(h1, h2, h3) {
  margin-block-start: 1.5em;
}

/* Bun automatically generates:
 * .article :-webkit-any(h1, h2, h3) { margin-block-start: 1.5em; }
 * .article :-moz-any(h1, h2, h3) { margin-block-start: 1.5em; }
 * .article :is(h1, h2, h3) { margin-block-start: 1.5em; }
 */

/* Complex example with multiple groups */
:is(header, main, footer) :is(h1, h2, .title) {
  font-family: "Heading Font", system-ui, sans-serif;
  font-weight: 700;
}

/* Combining :is() with other selectors */
:is(.card, .panel, .widget) :is(h1, h2, h3) {
  color: var(--color-brand-primary);
}

/* :is() with pseudo-classes */
:is(.button, .link, .nav-item):hover {
  color: var(--color-brand-primary-dark);
}

/* :is() with :not() */
:is(.card, .button, .badge):not(.disabled, .hidden) {
  transition: transform var(--transition-base);
}
```

#### Other Modern Selectors

```css
:dir(rtl) .card {
  text-align: right;
}

:lang(en, fr, de) h1 {
  font-weight: 600;
}
```

## Usage

### Import in Your Project

```typescript
// In your TypeScript/JavaScript file
import "./styles/golden-template.css";
```

### Use Components

```html
<div class="card">
  <div class="card-header">
    <h2>Card Title</h2>
  </div>
  <div class="card-body">
    Card content goes here.
  </div>
  <div class="card-footer">
    <button class="button button-primary">Action</button>
  </div>
</div>
```

### Customize Design Tokens

Override CSS variables to customize the theme:

```css
:root {
  --color-brand-primary: #your-color;
  --color-brand-secondary: #your-secondary-color;
  --space-md: clamp(1rem, 2vw, 1.5rem);
}
```

## Component Reference

### Card

- `.card` - Base card component
- `.card-elevated` - Elevated shadow variant
- `.card-bordered` - Bordered variant
- `.card-interactive` - Interactive/clickable variant
- `.card-header` - Card header section
- `.card-body` - Card body section
- `.card-footer` - Card footer section

### Button

- `.button` - Base button
- `.button-primary` - Primary variant
- `.button-secondary` - Secondary variant
- `.button-success` - Success variant
- `.button-warning` - Warning variant
- `.button-error` - Error variant
- `.button-ghost` - Ghost variant
- `.button-outline` - Outline variant
- `.button-sm` - Small size
- `.button-lg` - Large size

### Badge

- `.badge` - Base badge
- `.badge-success` - Success variant
- `.badge-warning` - Warning variant
- `.badge-error` - Error variant
- `.badge-info` - Info variant
- `.badge-primary` - Primary variant

### Input

- `.input` - Base input field

## Design System

### Color Palette

- **Base Colors**: 11-step scale from white to black using LAB colors
- **Brand Colors**: Primary and secondary with light/dark variants
- **Semantic Colors**: Success, warning, error, info with relative color variations
- **Theme Colors**: Automatic light/dark support using light-dark()

### Media Query Ranges

Modern range syntax with comparison operators:

```css
/* Single breakpoint */
@media (width >= 768px) {
  .container {
    max-width: 720px;
  }
}

/* Inclusive range */
@media (768px <= width <= 1199px) {
  .sidebar {
    display: flex;
  }
}

/* Exclusive range */
@media (width > 320px) and (width < 768px) {
  .mobile-only {
    display: block;
  }
}
```

Bun automatically converts to traditional `min-`/`max-` syntax for browser compatibility.

### Spacing Scale

- `--space-xs` to `--space-2xl`: Responsive spacing using clamp()

### Typography Scale

- `--font-size-xs` to `--font-size-4xl`: Fluid typography using clamp()

### System UI Font

The `system-ui` font family uses the device's native UI font. Bun automatically expands it:

```css
body {
  font-family: system-ui, sans-serif;
}

/* Bun expands to:
 * system-ui,
 * -apple-system,
 * BlinkMacSystemFont,
 * "Segoe UI",
 * Roboto,
 * "Noto Sans",
 * Ubuntu,
 * Cantarell,
 * "Helvetica Neue",
 * sans-serif;
 */
```

**Platform Support:**
- macOS/iOS: SF Pro
- Windows: Segoe UI
- Android: Roboto
- Linux: Ubuntu, Cantarell

### Border Radius

- `--radius-sm` to `--radius-full`: Precise values using round()

### Shadows

- `--shadow-sm` to `--shadow-2xl`: Modern color notation with alpha

## Color Format Conversions

Bun's CSS bundler automatically converts modern color notation for browser compatibility:

### Space-Separated RGB/HSL

```css
/* Modern syntax */
.modern-styling {
  color: rgb(50 100 200);
  border-color: rgba(100 50 200 / 0.75);
  background-color: #00aaff80; /* Hex with alpha */
  box-shadow: 0 5px 10px rgb(38 115 153 / 0.4);
}

/* Automatically converted to comma format for older browsers */
.modern-styling {
  color: rgb(50, 100, 200);
  border-color: rgba(100, 50, 200, 0.75);
  background-color: rgba(0, 170, 255, 0.5); /* Hex+alpha converted */
  box-shadow: 0 5px 10px rgba(38, 115, 153, 0.4);
}
```

### light-dark() Theme Support

```css
:root {
  color-scheme: light dark;
}

.themed-component {
  /* Automatically picks the right color based on system preference */
  background-color: light-dark(#ffffff, #121212);
  color: light-dark(#333333, #eeeeee);
  border-color: light-dark(#dddddd, #555555);
}

/* Override system preference when needed */
.light-theme {
  color-scheme: light;
}

.dark-theme {
  color-scheme: dark;
}
```

## Browser Compatibility

All features are automatically lowered by Bun's CSS bundler for compatibility with:

- Chrome >= 112
- Firefox >= 113
- Safari >= 16.4
- Edge >= 112

### Automatic Conversions

- **Space-separated colors** → Comma-separated format
- **Hex with alpha** → rgba() format
- **Modern color notation** → Browser-compatible format
- **light-dark()** → Appropriate color based on color-scheme

## Credits

**A huge thanks goes to the amazing work from the authors of LightningCSS and esbuild.**

- [LightningCSS](https://lightningcss.dev/) - Fast CSS parser, transformer, and minifier
- [esbuild](https://esbuild.github.io/) - Extremely fast JavaScript bundler
- [Bun CSS Bundler](https://bun.com/docs/bundler/css) - Native CSS bundling with syntax lowering

## Related

- [Bun CSS Bundler Documentation](./BUN-CSS-BUNDLER.md)
- [CSS Syntax Examples](./CSS-SYNTAX-EXAMPLES.md)
- [Golden Template CSS](../styles/golden-template.css)

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0
