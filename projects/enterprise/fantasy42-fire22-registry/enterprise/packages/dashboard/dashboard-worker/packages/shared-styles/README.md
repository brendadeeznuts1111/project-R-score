# 🔥 Fire22 CSS Highlight System

**Enterprise-grade CSS highlighting with OKLCH colors, Bun bundling, and
comprehensive theming**

[![Bun CSS](https://img.shields.io/badge/Bun-CSS_Bundling-ff6b35?style=flat-square&logo=bun)](https://bun.sh)
[![OKLCH Colors](https://img.shields.io/badge/OKLCH-Color_Space-4ade80?style=flat-square)](https://oklch.com)
[![WCAG AA](https://img.shields.io/badge/WCAG-AA_Compliant-22c55e?style=flat-square)](https://www.w3.org/WAI/WCAG21/quickref/)

## 🚀 Quick Start

### Installation

```bash
# Using relative imports (recommended)
@import "../../shared-styles/highlight.css";

# Or via Bun bundling
import "../../shared-styles/highlight-enhanced.css";
```

### Basic Usage

```html
<!-- Default highlight -->
<div class="fire22-highlight fire22-package-card">
  <h3>@fire22/core-dashboard</h3>
  <p>Default blue highlight ring</p>
</div>

<!-- Success state -->
<div class="fire22-highlight fire22-package-card success">
  <h3>@fire22/approved-package</h3>
  <p>Green highlight for approved packages</p>
</div>

<!-- Warning state -->
<div class="fire22-highlight fire22-package-card warning">
  <h3>@fire22/needs-review</h3>
  <p>Yellow highlight for packages needing attention</p>
</div>
```

## 🎨 Color System

### OKLCH Advantages

- **Perceptual Uniformity**: Colors appear equally bright to human vision
- **Better Color Mixing**: Smoother gradients and transitions
- **WCAG AA Compliance**: All colors meet 4.5:1 contrast minimum
- **Future-Proof**: Modern color space with wide gamut support

### Status Colors

```css
--fire22-status-default: oklch(70% 0.15 240); /* Neutral blue */
--fire22-status-success: oklch(65% 0.18 145); /* Success green */
--fire22-status-warning: oklch(75% 0.2 85); /* Warning yellow */
--fire22-status-error: oklch(60% 0.22 25); /* Error red */
--fire22-status-info: oklch(70% 0.15 260); /* Info blue */
--fire22-status-draft: oklch(60% 0.08 280); /* Draft purple */
--fire22-status-archived: oklch(50% 0.05 200); /* Archived gray */
```

## 📚 Component Classes

### Base Classes

| Class                  | Purpose               | Example              |
| ---------------------- | --------------------- | -------------------- |
| `.fire22-highlight`    | Base highlight ring   | Default blue outline |
| `.fire22-package-card` | Package card styling  | Fire22 branded cards |
| `.fire22-no-highlight` | Remove all highlights | Clean appearance     |

### Status Variants

| Class       | Visual Effect             | Use Case            |
| ----------- | ------------------------- | ------------------- |
| `.success`  | Green highlight           | Approved packages   |
| `.warning`  | Yellow highlight          | Needs attention     |
| `.error`    | Red highlight             | Rejected/failed     |
| `.info`     | Blue highlight            | Under review        |
| `.draft`    | Purple highlight (subtle) | Work in progress    |
| `.archived` | Gray highlight (faded)    | Deprecated packages |

### Size Variants

| Class      | Ring Width | Border Radius |
| ---------- | ---------- | ------------- |
| `.size-sm` | 1px        | 6px           |
| Default    | 2px        | 12px          |
| `.size-lg` | 3px        | 16px          |

### Special States

| Class        | Effect                | Description         |
| ------------ | --------------------- | ------------------- |
| `.active`    | Animated rainbow glow | Currently selected  |
| `.pulsing`   | Breathing animation   | Loading/pending     |
| `.clickable` | Pointer cursor        | Interactive element |

## 🎭 Advanced Features

### Animated Active State

```html
<div class="fire22-highlight fire22-package-card active">
  <h3>@fire22/selected-package</h3>
  <p>Rainbow gradient animation with smooth cycling</p>
</div>
```

### Pulsing State

```html
<div class="fire22-highlight fire22-package-card pulsing warning">
  <h3>@fire22/loading-package</h3>
  <p>Gentle breathing effect for loading states</p>
</div>
```

### Keyboard Navigation

```html
<div class="fire22-highlight fire22-package-card" tabindex="0">
  <h3>@fire22/accessible-package</h3>
  <p>Automatic focus outline with proper contrast</p>
</div>
```

## 🌙 Theme Support

### Dark Mode

Automatically adjusts contrast for dark backgrounds:

```css
@media (prefers-color-scheme: dark) {
  /* Enhanced brightness and saturation */
  --fire22-status-success: oklch(70% 0.2 145);
  --fire22-status-warning: oklch(80% 0.22 85);
}
```

### High Contrast Mode

```css
@media (prefers-contrast: high) {
  /* Increased saturation and thicker rings */
  --fire22-status-success: oklch(70% 0.25 145);
  .fire22-highlight {
    box-shadow: var(--fire22-highlight-thick) var(--fire22-status-default);
  }
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  /* Disables all animations for accessibility */
  .fire22-highlight * {
    animation: none !important;
    transition: none !important;
  }
}
```

## 📱 Responsive Design

### Mobile Optimizations

- Smaller border radius on mobile devices
- Disabled hover transforms for touch devices
- Reduced padding and gaps for compact layouts

```css
@media (max-width: 768px) {
  .fire22-highlight {
    border-radius: 6px; /* Smaller radius */
  }

  .fire22-highlight:hover {
    transform: none; /* No transform on touch */
  }
}
```

## 🔧 Developer Experience

### Debug Mode

Enable debug labels to see applied classes:

```html
<div data-fire22-debug="true">
  <div class="fire22-highlight success">
    <!-- Shows "fire22-highlight success" label on hover -->
  </div>
</div>
```

### CSS Custom Properties

All values are customizable via CSS variables:

```css
:root {
  --fire22-transition-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  --fire22-border-radius-md: 12px;
  --fire22-z-highlight: 1;
}
```

## 🏗️ Adding New Status Types

### Step 1: Define Color Token

```css
:root {
  --fire22-status-custom: oklch(65% 0.2 180); /* Custom cyan */
}
```

### Step 2: Create Status Class

```css
.fire22-highlight.custom {
  box-shadow: var(--fire22-highlight-medium) var(--fire22-status-custom);
}

.fire22-highlight.custom:hover {
  box-shadow: var(--fire22-highlight-glow) var(--fire22-status-custom);
}
```

### Step 3: Add Package Status Badge (Optional)

```css
.fire22-package-status.custom {
  background: rgba(8, 145, 178, 0.15);
  color: var(--fire22-status-custom);
  border: 1px solid var(--fire22-status-custom);
}
```

## 🎨 Color Palette Showcase

### Live Demo Colors

```html
<!-- Copy-paste ready examples -->
<div class="fire22-highlight fire22-package-card">Default Blue</div>
<div class="fire22-highlight fire22-package-card success">Success Green</div>
<div class="fire22-highlight fire22-package-card warning">Warning Yellow</div>
<div class="fire22-highlight fire22-package-card error">Error Red</div>
<div class="fire22-highlight fire22-package-card info">Info Blue</div>
<div class="fire22-highlight fire22-package-card draft">Draft Purple</div>
<div class="fire22-highlight fire22-package-card archived">Archived Gray</div>
```

## 🚀 Performance

### Bun CSS Bundling Benefits

- **Zero Configuration**: Works out of the box with Bun
- **Tree Shaking**: Only includes used CSS classes
- **Content Hashing**: Automatic cache busting for production
- **Source Maps**: Full debugging support in development

### Bundle Size

- **Base CSS**: ~2.8KB minified
- **Enhanced CSS**: ~4.1KB minified
- **Gzipped**: ~1.2KB over the wire

## 🧪 Testing Integration

### Visual Regression Testing

```typescript
// Use with your preferred testing framework
const packageCard = document.querySelector('.fire22-highlight');
expect(getComputedStyle(packageCard).boxShadow).toContain(
  'oklch(70% 0.15 240)'
);
```

### Accessibility Testing

```typescript
// Test focus management
const card = document.querySelector('.fire22-highlight[tabindex="0"]');
card.focus();
expect(getComputedStyle(card).outline).toContain('2px solid');
```

## 🔗 Integration Examples

### React/JSX Usage

```jsx
function PackageCard({ status, name, children }) {
  return (
    <article className={`fire22-highlight fire22-package-card ${status}`}>
      <h3>{name}</h3>
      {children}
    </article>
  );
}
```

### Vue Template Usage

```vue
<template>
  <div :class="['fire22-highlight', 'fire22-package-card', status]">
    <h3>{{ name }}</h3>
    <slot />
  </div>
</template>
```

### Svelte Component Usage

```svelte
<div class="fire22-highlight fire22-package-card {status}">
  <h3>{name}</h3>
  <slot />
</div>
```

## 🔍 Troubleshooting

### Common Issues

**Colors not showing correctly**

- Ensure browser supports OKLCH (95%+ modern browsers)
- Check for CSS custom property override conflicts
- Verify correct import path for CSS file

**Animations not working on mobile**

- Expected behavior - transforms disabled for touch devices
- Use `.pulsing` class for mobile-friendly animations

**Focus outline missing**

- Ensure `tabindex` attribute is present for keyboard navigation
- Check for CSS that might be overriding `:focus-visible` styles

### Browser Support

- **OKLCH Colors**: Chrome 111+, Firefox 113+, Safari 15.4+
- **CSS Custom Properties**: All modern browsers
- **Graceful Degradation**: Falls back to standard colors in older browsers

## 📊 Bundle Analysis

### File Structure

```text
packages/shared-styles/
├── highlight.css          # Base system (2.8KB)
├── highlight-enhanced.css # Full system (4.1KB)
├── README.md             # This documentation
└── examples/
    ├── basic-demo.html   # Simple integration
    ├── advanced-demo.html # All features showcase
    └── integration-tests/ # Test files
```

### Import Strategies

```css
/* Option 1: Enhanced (recommended for production) */
@import '../../shared-styles/highlight-enhanced.css';

/* Option 2: Base only (minimal bundle size) */
@import '../../shared-styles/highlight.css';

/* Option 3: Selective imports (advanced) */
@import '../../shared-styles/highlight.css' layer(base);
@import '../../shared-styles/animations.css' layer(interactive);
```

---

## 🏆 Built by Fire22 Team

**Enterprise CSS System** • **Production Ready** • **Zero Dependencies**

_Part of the Fire22 Dashboard ecosystem - built with Bun, designed for scale_
