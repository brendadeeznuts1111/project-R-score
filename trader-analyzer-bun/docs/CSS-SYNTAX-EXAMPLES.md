# CSS Syntax Examples

Comprehensive examples of modern CSS syntax features supported by Bun's CSS bundler with automatic syntax lowering.

---

## Table of Contents

1. [CSS Nesting](#css-nesting) - [Full Guide](./CSS-NESTING.md)
2. [Color Functions](#color-functions) - [Full Guides](./LAB-COLORS.md), [Color Function](./COLOR-FUNCTION.md), [HWB Colors](./HWB-COLORS.md), [Relative Colors](./RELATIVE-COLORS.md)
3. [Logical Properties](#logical-properties) - [Full Guide](./LOGICAL-PROPERTIES.md)
4. [Modern Selectors](#modern-selectors) - [Full Guides](./DIR-SELECTOR.md), [Lang Selector](./LANG-SELECTOR.md), [Not Selector](./NOT-SELECTOR.md)
5. [Math Functions](#math-functions)
6. [Media Query Ranges](#media-query-ranges)
7. [Modern Shorthands](#modern-shorthands) - [Full Guide](./SHORTHANDS.md)
8. [Gradients](#gradients) - [Double Position Gradients](./DOUBLE-POSITION-GRADIENTS.md)
9. [Theme Functions](#theme-functions) - [light-dark()](./LIGHT-DARK.md)
10. [CSS Modules Composition](#css-modules-composition) - [Full Guide](./CSS-MODULES.md)
11. [Browser Compatibility](#browser-compatibility)

---

## CSS Nesting

CSS nesting allows you to nest CSS selectors inside other selectors. Bun's CSS bundler automatically flattens nested selectors.

**See [CSS Nesting Guide](./CSS-NESTING.md) for comprehensive documentation.**

### Basic Nesting

```css
.card {
  background: var(--bg-secondary);
  padding: 25px;
  
  h2 {
    color: var(--accent-cyan);
    margin-bottom: 15px;
  }
  
  .content {
    color: var(--text-primary);
  }
}
```

### The `&` Selector

The `&` selector represents the parent selector:

```css
.button {
  background: var(--accent-purple);
  
  &:hover {
    background: color-mix(in srgb, var(--accent-purple) 80%, white);
  }
  
  &.primary {
    background: var(--accent-cyan);
  }
  
  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
```

### Nested Media Queries

```css
.card {
  padding: 20px;
  
  @media (width >= 768px) {
    padding: 30px;
    
    h2 {
      font-size: 2em;
    }
  }
}
```

### Complex Nesting

```css
.alert {
  padding: 16px;
  
  .alert-title {
    font-weight: 700;
  }
  
  &.alert-success {
    background: color-mix(in srgb, var(--color-success) 10%, transparent);
    
    .alert-title {
      color: var(--color-success);
    }
  }
  
  @media (width >= 768px) {
    padding: 20px;
  }
}
```

---

## Color Functions

### color-mix()

Mix colors at build time:

```css
:root {
  --accent-cyan: #00d4ff;
  
  /* Mix with white (70% cyan, 30% white) */
  --accent-cyan-light: color-mix(in srgb, var(--accent-cyan) 70%, white);
  
  /* Mix with black (70% cyan, 30% black) */
  --accent-cyan-dark: color-mix(in srgb, var(--accent-cyan) 70%, black);
  
  /* Mix two colors */
  --blended: color-mix(in srgb, var(--accent-purple) 60%, var(--accent-cyan));
}

.button {
  background: var(--accent-cyan);
  
  &:hover {
    background: var(--accent-cyan-light);
  }
  
  &:active {
    background: var(--accent-cyan-dark);
  }
}
```

### Relative Colors (lch(from ...))

Create color variations:

```css
:root {
  --base-color: #00d4ff;
  
  /* Lighter variant (increase lightness by 10%) */
  --lighter: lch(from var(--base-color) calc(l + 10%) c h);
  
  /* Darker variant (decrease lightness by 10%) */
  --darker: lch(from var(--base-color) calc(l - 10%) c h);
  
  /* More saturated */
  --saturated: lch(from var(--base-color) l calc(c + 0.1) h);
  
  /* Different hue */
  --shifted: lch(from var(--base-color) l c calc(h + 30));
}
```

### LAB Colors

Modern CSS supports perceptually uniform color spaces (LAB, LCH, OKLAB, OKLCH) that can represent colors outside the standard RGB gamut. Bun's CSS bundler automatically converts these to backwards-compatible alternatives with layered fallbacks.

**Input:**
```css
.vibrant-element {
  /* A vibrant red that exceeds sRGB gamut boundaries */
  color: lab(55% 78 35);

  /* A smooth gradient using perceptual color space */
  background: linear-gradient(to right, oklch(65% 0.25 10deg), oklch(65% 0.25 250deg));
}
```

**Output (Layered Fallbacks):**
```css
.vibrant-element {
  /* Fallback to closest RGB approximation */
  color: #ff0f52;
  /* P3 fallback for browsers with wider gamut support */
  color: color(display-p3 1 0.12 0.37);
  /* Original value preserved for browsers that support it */
  color: lab(55% 78 35);

  background: linear-gradient(to right, #cd4e15, #3887ab);
  background: linear-gradient(to right, oklch(65% 0.25 10deg), oklch(65% 0.25 250deg));
}
```

**Color Spaces:**
- `lab()` - CIE LAB color space
- `lch()` - LCH (Lightness, Chroma, Hue)
- `oklab()` - Perceptually uniform OKLAB
- `oklch()` - Perceptually uniform OKLCH (recommended)

**Advantages:**
- Perceptually uniform (equal steps appear equally different)
- Wider gamut than sRGB
- More vibrant colors
- Better for gradients and color manipulation

**Examples:**
```css
/* OKLCH - Recommended for most use cases */
.card {
  background: oklch(25% 0.05 250);
  color: oklch(85% 0.02 250);
}

/* LCH */
.accent {
  color: lch(55% 78 35);
}

/* LAB */
.vibrant {
  background: lab(55% 78 35);
}

/* Perceptually uniform gradients */
.smooth-gradient {
  background: linear-gradient(
    to right,
    oklch(65% 0.25 10deg),
    oklch(65% 0.25 250deg)
  );
}
```

### HWB Colors

The HWB (Hue, Whiteness, Blackness) color model provides an intuitive way to express colors. Bun automatically converts HWB to RGB.

**Input:**
```css
.easy-theming {
  --primary: hwb(180 0% 0%);
  --primary-light: hwb(180 20% 0%);
  --primary-dark: hwb(180 0% 30%);
  --primary-muted: hwb(180 30% 20%);
}
```

**Output (Converted by Bun):**
```css
.easy-theming {
  --primary: #00ffff;
  --primary-light: #33ffff;
  --primary-dark: #00b3b3;
  --primary-muted: #339999;
}
```

See [HWB Colors Guide](./HWB-COLORS.md) for comprehensive documentation.

### color() Function

The `color()` function provides access to wider color gamuts. Bun provides RGB fallbacks.

**Input:**
```css
.vivid-element {
  color: color(display-p3 1 0.1 0.3);
  background-color: color(a98-rgb 0.44 0.5 0.37);
}
```

**Output (Fallbacks):**
```css
.vivid-element {
  color: #fa1a4c;
  color: color(display-p3 1 0.1 0.3);
  background-color: #6a805d;
  background-color: color(a98-rgb 0.44 0.5 0.37);
}
```

See [Color Function Guide](./COLOR-FUNCTION.md) for comprehensive documentation.

### Modern Color Notation

#### Space-Separated RGB/HSL

```css
.element {
  /* RGB with alpha */
  background: rgb(102 126 234 / 0.8);
  border: rgb(102 126 234 / 0.5);
  
  /* HSL with alpha */
  color: hsl(250 50% 60% / 0.9);
}
```

#### Hex with Alpha

```css
.element {
  border-color: #667eeacc; /* 80% opacity */
  box-shadow: 0 4px 20px #0000004d; /* 30% opacity */
  background: #00d4ff80; /* 50% opacity */
}
```

---

## Logical Properties

RTL/LTR-aware properties:

```css
.card {
  /* Block axis (top/bottom) */
  padding-block: 25px;
  margin-block: 20px;
  border-block: 2px solid var(--accent-cyan);
  
  /* Inline axis (left/right) */
  padding-inline: 25px;
  margin-inline: 1rem;
  border-inline: 1px solid var(--border-color);
  
  /* Start/End */
  margin-inline-start: 1rem;
  padding-inline-end: 2rem;
  border-inline-start: 4px solid var(--accent-cyan);
  
  /* Text alignment */
  text-align: start; /* left in LTR, right in RTL */
}

/* RTL support */
:dir(rtl) .card {
  border-inline-start: none;
  border-inline-end: 4px solid var(--accent-cyan);
}
```

---

## Modern Selectors

### :is() Selector

Group selectors and simplify complex selector lists:

```css
/* Instead of writing these separately */
/* 
.article h1,
.article h2,
.article h3 {
  margin-top: 1.5em;
}
*/

/* You can write this - Bun automatically adds fallbacks */
.article :is(h1, h2, h3) {
  margin-top: 1.5em;
}

/* Complex example with multiple groups */
:is(header, main, footer) :is(h1, h2, .title) {
  font-family: "Heading Font", sans-serif;
}

/* Combining with other selectors */
:is(.card, .status-item, .info-row).active {
  opacity: 1;
}

/* :is() with pseudo-classes */
:is(.button, .link, .nav-item):hover {
  color: var(--color-brand-primary-dark);
}

/* :is() with :not() */
:is(.card, .button, .badge):not(.disabled, .hidden) {
  transition: transform 0.2s;
}
```

**Note:** Bun's CSS bundler automatically generates vendor-prefixed fallbacks for older browsers:

```css
/* What Bun generates automatically (you don't need to write this) */
/* Fallback using -webkit-any */
.article :-webkit-any(h1, h2, h3) {
  margin-top: 1.5em;
}

/* Fallback using -moz-any */
.article :-moz-any(h1, h2, h3) {
  margin-top: 1.5em;
}

/* Original preserved for modern browsers */
.article :is(h1, h2, h3) {
  margin-top: 1.5em;
}

/* Complex example with fallbacks */
:-webkit-any(header, main, footer) :-webkit-any(h1, h2, .title) {
  font-family: "Heading Font", sans-serif;
}

:-moz-any(header, main, footer) :-moz-any(h1, h2, .title) {
  font-family: "Heading Font", sans-serif;
}

:is(header, main, footer) :is(h1, h2, .title) {
  font-family: "Heading Font", sans-serif;
}
```

### :not() with Multiple Arguments

```css
/* Exclude multiple classes */
.card:not(.disabled, .hidden, .loading) {
  opacity: 1;
}

/* Combine with :is() */
:is(.card, .status-item):not(.disabled, .hidden) {
  transition: transform 0.2s;
}

/* :not() with pseudo-classes */
.button:not(:disabled, .loading):hover {
  background: var(--color-brand-primary-dark);
}
```

### :dir() Selector

Direction-aware styles:

```css
:dir(ltr) .card {
  text-align: left;
  border-left: 4px solid var(--accent-cyan);
}

:dir(rtl) .card {
  text-align: right;
  border-right: 4px solid var(--accent-cyan);
}
```

### :lang() Selector

Language-specific styles:

```css
:lang(en) .card h2 {
  font-weight: 600;
}

:lang(fr, de) .card h2 {
  font-weight: 700;
}

:lang(ja, zh) .card {
  line-height: 1.8;
}
```

---

## Math Functions

CSS includes a rich set of mathematical functions that let you perform complex calculations directly in your stylesheets. Bun's CSS bundler evaluates these mathematical expressions at build time when all values are known constants (not variables), resulting in optimized output.

### Standard Math Functions

```css
.dynamic-sizing {
  /* Clamp a value between minimum and maximum */
  width: clamp(200px, 50%, 800px);
  
  /* Round to the nearest multiple */
  padding: round(14.8px, 5px);
  
  /* Modulo - remainder after division */
  margin: mod(100px, 30px);
  
  /* Remainder */
  spacing: rem(100px, 30px);
  
  /* Absolute value */
  opacity: abs(-0.8);
  
  /* Sign - returns -1, 0, or 1 */
  direction: sign(-5);
}
```

### Trigonometric Functions

```css
.trigonometry {
  /* Sine - for circular motion */
  transform: rotate(calc(sin(45deg) * 50deg));
  
  /* Cosine - for horizontal positioning */
  transform-origin-x: calc(cos(30deg) * 100px);
  
  /* Tangent */
  slope: tan(45deg);
  
  /* Inverse trigonometric functions */
  angle-from-sine: asin(0.707);
  angle-from-cosine: acos(0.866);
  angle-from-tangent: atan(1);
  
  /* Two-argument arctangent */
  angle-from-coords: atan2(50px, 100px);
}
```

### Exponential Functions

```css
.exponential {
  /* Power - raise to exponent */
  --scale-factor: pow(1.25, 3);
  font-size: calc(16px * var(--scale-factor));
  
  /* Square root */
  --sqrt-value: sqrt(2);
  width: calc(100px * var(--sqrt-value));
  
  /* Exponential - e^x */
  --exp-value: exp(1);
  
  /* Natural logarithm */
  --log-value: log(2.718);
  
  /* Hypotenuse - sqrt(x² + y²) */
  --distance: hypot(100px, 50px);
}
```

### Build-Time Evaluation

Bun's CSS bundler evaluates mathematical expressions at build time when all values are known constants:

**Input:**
```css
.dynamic-sizing {
  width: clamp(200px, 50%, 800px);
  padding: round(14.8px, 5px);
  transform: rotate(calc(sin(45deg) * 50deg));
  --scale-factor: pow(1.25, 3);
  font-size: calc(16px * var(--scale-factor));
}
```

**Output (Optimized):**
```css
.dynamic-sizing {
  width: clamp(200px, 50%, 800px);
  padding: 15px; /* Evaluated from round(14.8px, 5px) */
  transform: rotate(35.36deg); /* Evaluated from sin(45deg) * 50deg */
  --scale-factor: 1.953125; /* Evaluated from pow(1.25, 3) */
  font-size: calc(16px * var(--scale-factor));
}
```

### Complex Math Examples

```css
.complex-math {
  /* Golden ratio calculations */
  --base-size: 16px;
  --ratio: 1.618;
  --size-1: calc(var(--base-size) * pow(var(--ratio), 1));
  --size-2: calc(var(--base-size) * pow(var(--ratio), 2));
  --size-3: calc(var(--base-size) * pow(var(--ratio), 3));
}

/* Circular positioning using trigonometry */
.circular-layout {
  --radius: 100px;
  --angle: 45deg;
  transform: translate(
    calc(cos(var(--angle)) * var(--radius)),
    calc(sin(var(--angle)) * var(--radius))
  );
}
```

### Available Math Functions

**Standard Math:**
- `clamp(min, preferred, max)` - Clamp value between min and max
- `round(value, rounding-interval)` - Round to nearest multiple
- `mod(value, modulus)` - Modulo operation
- `rem(value, modulus)` - Remainder operation
- `abs(value)` - Absolute value
- `sign(value)` - Sign function (-1, 0, or 1)
- `min(...)` - Minimum value
- `max(...)` - Maximum value

**Trigonometric:**
- `sin(angle)` - Sine
- `cos(angle)` - Cosine
- `tan(angle)` - Tangent
- `asin(value)` - Arc sine
- `acos(value)` - Arc cosine
- `atan(value)` - Arc tangent
- `atan2(y, x)` - Two-argument arc tangent

**Exponential:**
- `pow(base, exponent)` - Power function
- `sqrt(value)` - Square root
- `exp(value)` - Exponential (e^x)
- `log(value)` - Natural logarithm
- `hypot(x, y)` - Hypotenuse (sqrt(x² + y²))

---

## Media Query Ranges

Modern CSS supports intuitive range syntax for media queries using comparison operators (`<`, `>`, `<=`, `>=`) instead of verbose `min-` and `max-` prefixes. Bun's CSS bundler automatically converts modern syntax to traditional syntax for browser compatibility.

### Single Breakpoint

**Input (Modern Syntax):**
```css
@media (width >= 768px) {
  .container {
    max-width: 720px;
  }
}
```

**Output (Converted by Bun):**
```css
@media (min-width: 768px) {
  .container {
    max-width: 720px;
  }
}
```

### Inclusive Range

**Input:**
```css
@media (768px <= width <= 1199px) {
  .sidebar {
    display: flex;
  }
}
```

**Output:**
```css
@media (min-width: 768px) and (max-width: 1199px) {
  .sidebar {
    display: flex;
  }
}
```

### Exclusive Range

**Input:**
```css
@media (width > 320px) and (width < 768px) {
  .mobile-only {
    display: block;
  }
}
```

**Output:**
```css
@media (min-width: 321px) and (max-width: 767px) {
  .mobile-only {
    display: block;
  }
}
```

### Multiple Conditions

```css
/* Width and height ranges */
@media (width >= 1024px) and (height >= 768px) {
  .full-screen-layout {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }
}

/* With orientation */
@media (width >= 768px) and (orientation: landscape) {
  .layout {
    display: flex;
    flex-direction: row;
  }
}
```

### Common Breakpoint Patterns

```css
/* Mobile: 320px - 767px */
@media (width >= 320px) and (width < 768px) {
  .mobile { display: block; }
}

/* Tablet: 768px - 1023px */
@media (width >= 768px) and (width < 1024px) {
  .tablet { display: block; }
}

/* Desktop: 1024px+ */
@media (width >= 1024px) {
  .desktop { display: block; }
}
```

---

## Modern Shorthands

### Modern Shorthands

CSS has introduced several modern shorthand properties. Bun converts them to longhand properties:

**Input:**
```css
.flex-container {
  place-items: center start;
  place-content: space-between center;
  overflow: hidden auto;
}

.fancy-link {
  text-decoration: underline dotted blue 2px;
}
```

**Output:**
```css
.flex-container {
  align-items: center;
  justify-items: start;
  align-content: space-between;
  justify-content: center;
  overflow-x: hidden;
  overflow-y: auto;
}

.fancy-link {
  text-decoration-line: underline;
  text-decoration-style: dotted;
  text-decoration-color: blue;
  text-decoration-thickness: 2px;
}
```

See [Modern Shorthands Guide](./SHORTHANDS.md) for comprehensive documentation.

---

## Gradients

### Double Position Gradients

Double position gradients create hard color stops. Bun converts them to traditional format:

**Input:**
```css
.progress-bar {
  background: linear-gradient(
    to right,
    #4caf50 0% 25%,
    #ffc107 25% 50%,
    #2196f3 50% 75%,
    #9c27b0 75% 100%
  );
}
```

**Output:**
```css
.progress-bar {
  background: linear-gradient(
    to right,
    #4caf50 0%,
    #4caf50 25%,
    #ffc107 25%,
    #ffc107 50%,
    #2196f3 50%,
    #2196f3 75%,
    #9c27b0 75%,
    #9c27b0 100%
  );
}
```

See [Double Position Gradients Guide](./DOUBLE-POSITION-GRADIENTS.md) for comprehensive documentation.

---

## Theme Functions

### light-dark()

Automatic light/dark theme:

```css
:root {
  color-scheme: light dark;
}

**Input:**
```css
:root {
  color-scheme: light dark;
}

.themed-component {
  background-color: light-dark(#ffffff, #121212);
  color: light-dark(#333333, #eeeeee);
  border-color: light-dark(#dddddd, #555555);
}
```

**Output (Converted by Bun):**
```css
:root {
  --lightningcss-light: initial;
  --lightningcss-dark: ;
  color-scheme: light dark;
}

@media (prefers-color-scheme: dark) {
  :root {
    --lightningcss-light: ;
    --lightningcss-dark: initial;
  }
}

.themed-component {
  background-color: var(--lightningcss-light, #ffffff) var(--lightningcss-dark, #121212);
  color: var(--lightningcss-light, #333333) var(--lightningcss-dark, #eeeeee);
  border-color: var(--lightningcss-light, #dddddd) var(--lightningcss-dark, #555555);
}
```

See [light-dark() Guide](./LIGHT-DARK.md) for comprehensive documentation.

### system-ui Font

The `system-ui` generic font family lets you use the device's native UI font, creating interfaces that feel more integrated with the operating system. Bun's CSS bundler automatically expands it to a comprehensive cross-platform font stack.

**Input:**
```css
.native-interface {
  /* Use the system's default UI font */
  font-family: system-ui;
}

.fallback-aware {
  /* System UI font with explicit fallbacks */
  font-family: system-ui, sans-serif;
}
```

**Output (Expanded by Bun):**
```css
.native-interface {
  /* Expanded to support all major platforms */
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    "Noto Sans",
    Ubuntu,
    Cantarell,
    "Helvetica Neue";
}

.fallback-aware {
  /* Preserves the original fallback after the expanded stack */
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    "Noto Sans",
    Ubuntu,
    Cantarell,
    "Helvetica Neue",
    sans-serif;
}
```

**Platform Support:**
- **macOS/iOS**: Uses SF Pro (`-apple-system`, `BlinkMacSystemFont`)
- **Windows**: Uses Segoe UI
- **Android**: Uses Roboto
- **Linux**: Uses Ubuntu, Cantarell
- **Fallback**: Generic sans-serif

---

## CSS Modules Composition

### Basic Composition

```css
/* base.module.css */
.base {
  padding: 1rem;
  border-radius: 8px;
  transition: all 0.2s;
}

/* components.module.css */
.button {
  composes: base;
  background: var(--accent-purple);
  color: white;
}
```

### External Composition

```css
/* components.module.css */
.button {
  composes: base from "./base.module.css";
  background: var(--accent-purple);
  
  &:hover {
    background-color: color-mix(in srgb, var(--accent-purple) 80%, white);
  }
}
```

### Multiple Composition

```css
.button {
  composes: base from "./base.module.css";
  composes: interactive from "./interactive.module.css";
  background: var(--accent-purple);
}
```

---

## Browser Compatibility

### Features Automatically Lowered

These features are converted to compatible CSS:

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| CSS Nesting | ✅ Lowered | ✅ Lowered | ✅ Lowered | ✅ Lowered |
| color-mix() | ✅ Lowered | ✅ Lowered | ✅ Lowered | ✅ Lowered |
| Relative Colors | ✅ Lowered | ✅ Lowered | ✅ Lowered | ✅ Lowered |
| LAB Colors | ✅ Lowered | ✅ Lowered | ✅ Lowered | ✅ Lowered |
| HWB Colors | ✅ Lowered | ✅ Lowered | ✅ Lowered | ✅ Lowered |
| color() function | ✅ Lowered | ✅ Lowered | ✅ Lowered | ✅ Lowered |
| light-dark() | ✅ Lowered | ✅ Lowered | ✅ Lowered | ✅ Lowered |
| system-ui font | ✅ Lowered | ✅ Lowered | ✅ Lowered | ✅ Lowered |

### Features Requiring Browser Support

These features require modern browser support:

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Logical Properties | ✅ 69+ | ✅ 66+ | ✅ 12.1+ | ✅ 79+ |
| :is() selector | ✅ 88+ | ✅ 78+ | ✅ 14+ | ✅ 88+ |
| :not() multiple | ✅ 88+ | ✅ 84+ | ✅ 9+ | ✅ 88+ |
| :dir() selector | ✅ 49+ | ✅ 49+ | ✅ 10+ | ✅ 79+ |
| :lang() selector | ✅ 1+ | ✅ 1+ | ✅ 3+ | ✅ 12+ |
| clamp() | ✅ 79+ | ✅ 75+ | ✅ 13.1+ | ✅ 79+ |
| round() | ✅ 113+ | ✅ 113+ | ✅ 16.4+ | ✅ 113+ |
| Media Query Ranges | ✅ 104+ | ✅ 63+ | ✅ 16.4+ | ✅ 104+ |
| place-items | ✅ 59+ | ✅ 45+ | ✅ 11+ | ✅ 79+ |
| Double Position Gradients | ✅ 65+ | ✅ 55+ | ✅ 12.1+ | ✅ 79+ |

---

## Before/After Examples

### Example 1: Card Component

**Before (Traditional CSS):**
```css
.card {
  background: #1a1f3a;
  padding-top: 25px;
  padding-bottom: 25px;
  padding-left: 25px;
  padding-right: 25px;
  border-left: 4px solid #00d4ff;
}

.card h2 {
  color: #00d4ff;
  margin-bottom: 15px;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 30px rgba(0, 0, 0, 0.4);
}

@media (min-width: 768px) {
  .card {
    padding: 30px;
  }
}
```

**After (Modern CSS):**
```css
.card {
  background: oklch(30% 0.05 250);
  padding-block: 25px;
  padding-inline: 25px;
  border-inline-start: 4px solid var(--accent-cyan);
  
  h2 {
    color: var(--accent-cyan);
    margin-block-end: 15px;
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 30px rgb(0 0 0 / 0.4);
  }
  
  @media (width >= 768px) {
    padding-block: 30px;
    padding-inline: 30px;
  }
}
```

### Example 2: Button Component

**Before:**
```css
.button {
  background: #667eea;
  padding: 12px 24px;
  border-radius: 8px;
}

.button:hover {
  background: #8a9ff0;
}

.button.primary {
  background: #00d4ff;
}

.button.primary:hover {
  background: #33ddff;
}
```

**After:**
```css
.button {
  background: var(--accent-purple);
  padding-block: 12px;
  padding-inline: 24px;
  border-radius: 8px;
  
  &:hover {
    background: color-mix(in srgb, var(--accent-purple) 80%, white);
  }
  
  &.primary {
    background: var(--accent-cyan);
    
    &:hover {
      background: color-mix(in srgb, var(--accent-cyan) 80%, white);
    }
  }
}
```

---

## Color Format Conversions

Bun's CSS bundler automatically converts modern color notation to browser-compatible formats:

### Space-Separated RGB/HSL

**Input (Modern Syntax):**
```css
.modern-styling {
  color: rgb(50 100 200);
  border-color: rgba(100 50 200 / 0.75);
  background: hsl(250 50% 60%);
  box-shadow: 0 5px 10px hsl(250 50% 60% / 0.4);
}
```

**Output (Converted for Compatibility):**
```css
.modern-styling {
  color: rgb(50, 100, 200);
  border-color: rgba(100, 50, 200, 0.75);
  background: hsl(250, 50%, 60%);
  box-shadow: 0 5px 10px hsla(250, 50%, 60%, 0.4);
}
```

### Hex with Alpha

**Input:**
```css
.hex-alpha {
  background-color: #00aaff80; /* 50% opacity */
  border-color: #667eeacc;     /* 80% opacity */
  box-shadow: 0 4px 20px #0000004d; /* 30% opacity */
}
```

**Output (Converted):**
```css
.hex-alpha {
  background-color: rgba(0, 170, 255, 0.5);
  border-color: rgba(102, 126, 234, 0.8);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}
```

### light-dark() Theme Support

**Input:**
```css
:root {
  color-scheme: light dark;
}

.themed-component {
  background-color: light-dark(#ffffff, #121212);
  color: light-dark(#333333, #eeeeee);
  border-color: light-dark(#dddddd, #555555);
}
```

**Output (Based on color-scheme):**
- Light mode: Uses first color
- Dark mode: Uses second color

## Bun.color CSS Formatting

Use Bun.color to format colors as CSS:

```typescript
import { cssBundler } from "../../src/utils/css-bundler";

// Format any color as CSS
const cssColor = cssBundler.formatColorAsCSS("#00d4ff");
// Returns: "rgb(0, 212, 255)"

// With alpha
const cssColorAlpha = cssBundler.formatColorAsCSS("#00d4ff", 0.8);
// Returns: "rgba(0, 212, 255, 0.8)"

// Generate CSS variables
const cssVars = cssBundler.generateColorVariables({
  "accent-cyan": "#00d4ff",
  "accent-purple": "#667eea",
});
```

See [Bun.color CSS Formatting](https://bun.com/docs/runtime/color#format-colors-as-css) for more details.

---

## Related

- [CSS Nesting](./CSS-NESTING.md) - Comprehensive CSS nesting guide
- [Bun CSS Bundler Documentation](./BUN-CSS-BUNDLER.md)
- [CSS Fallbacks](./CSS-FALLBACKS.md) - Automatic fallback generation
- [Bun CSS Bundler Docs](https://bun.com/docs/bundler/css)
- [Bun CSS Nesting Docs](https://bun.com/docs/bundler/css#nesting) - Official Bun nesting documentation
- [Bun.color CSS Formatting](https://bun.com/docs/runtime/color#format-colors-as-css)
- [CSS Nesting Specification](https://www.w3.org/TR/css-nesting-1/)
- [CSS Color Module Level 5](https://www.w3.org/TR/css-color-5/)

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0
