# Bun CSS Bundler Integration

## Overview

Integration with Bun's native CSS bundler following [Bun's CSS bundler documentation](https://bun.com/docs/bundler/css).

Bun's CSS bundler includes **automatic syntax lowering** - modern CSS features are automatically converted to browser-compatible CSS during the build process.

**Watch Mode**: For development with automatic rebuilds, use Bun's watch mode: [Bun Bundler - Watch Mode](https://bun.sh/docs/bundler#watch-mode)

---

## Syntax Lowering Features

Bun automatically lowers modern CSS syntax to ensure browser compatibility. All features below are automatically handled:

### 1. CSS Nesting

CSS nesting allows you to nest CSS selectors inside other selectors. Bun's CSS bundler automatically flattens nested selectors to ensure browser compatibility.

**Reference:** [Bun CSS Bundler - Nesting](https://bun.com/docs/bundler/css#nesting)

#### Basic Nesting

```css
/* Input */
.card {
  background: var(--bg-secondary);
  
  h2 {
    color: var(--accent-cyan);
  }
  
  .content {
    color: var(--text-primary);
  }
  
  &:hover {
    transform: translateY(-2px);
  }
}

/* Bun automatically converts to flat CSS */
```

#### The `&` Selector

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
  }
}
```

#### Nested Media Queries

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

See [CSS Nesting Guide](./CSS-NESTING.md) for comprehensive examples and best practices.

### 2. Color Functions

#### color-mix()

Mixes colors at build time:

```css
:root {
  --accent-light: color-mix(in srgb, var(--accent-cyan) 70%, white);
  --accent-dark: color-mix(in srgb, var(--accent-cyan) 70%, black);
}
```

#### Relative Colors (lch(from ...))

CSS allows you to modify individual components of a color using relative color syntax. Bun's CSS bundler computes these relative color modifications at build time (when not using CSS variables) and generates static color values for browser compatibility.

**Basic Examples:**
```css
.theme-color {
  /* Start with a base color and increase lightness by 15% */
  --accent: lch(from purple calc(l + 15%) c h);

  /* Take brand blue and make a desaturated version */
  --subtle-blue: oklch(from var(--brand-blue) l calc(c * 0.8) h);
}
```

**Build-time Computation:**
```css
/* Input */
.theme-color {
  --accent: lch(from purple calc(l + 15%) c h);
  --subtle-blue: oklch(from var(--brand-blue) l calc(c * 0.8) h);
}

/* Output (when brand-blue is a constant) */
.theme-color {
  --accent: lch(69.32% 58.34 328.37);
  --subtle-blue: oklch(60.92% 0.112 240.01);
}
```

**Use Cases:**
- Theme generation
- Creating accessible color variants
- Building color scales based on mathematical relationships

**More Examples:**
```css
:root {
  --base: #00d4ff;
  
  /* Lightness variations */
  --lighter: lch(from var(--base) calc(l + 10%) c h);
  --darker: lch(from var(--base) calc(l - 10%) c h);
  
  /* Saturation variations */
  --more-saturated: lch(from var(--base) l calc(c + 0.1) h);
  --less-saturated: lch(from var(--base) l calc(c * 0.8) h);
  
  /* Hue shifts */
  --shifted-hue: lch(from var(--base) l c calc(h + 30));
}

/* Color scales for theme generation */
.color-scale {
  --base: #667eea;
  --50: lch(from var(--base) calc(l + 40%) calc(c * 0.3) h);
  --500: var(--base);
  --900: lch(from var(--base) calc(l - 30%) c h);
}
```

**Build-time vs Runtime:**
- **Build-time**: When base color is a constant, Bun computes static values
- **Runtime**: When base color is a CSS variable, browser computes dynamically

#### LAB Colors

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

See [LAB Colors Guide](./LAB-COLORS.md) for comprehensive documentation.

#### HWB Colors

The HWB (Hue, Whiteness, Blackness) color model provides an intuitive way to express colors. Bun's CSS bundler automatically converts HWB colors to RGB for compatibility.

**Input:**
```css
.easy-theming {
  /* Pure cyan with no white or black added */
  --primary: hwb(180 0% 0%);

  /* Same hue, but with 20% white added (tint) */
  --primary-light: hwb(180 20% 0%);

  /* Same hue, but with 30% black added (shade) */
  --primary-dark: hwb(180 0% 30%);

  /* Muted version with both white and black added */
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

#### color() Function

The `color()` function provides access to wider color gamuts. Bun's CSS bundler provides appropriate RGB fallbacks.

**Input:**
```css
.vivid-element {
  /* Using the Display P3 color space for wider gamut colors */
  color: color(display-p3 1 0.1 0.3);

  /* Using A98 RGB color space */
  background-color: color(a98-rgb 0.44 0.5 0.37);
}
```

**Output (Fallbacks):**
```css
.vivid-element {
  /* RGB fallback first for maximum compatibility */
  color: #fa1a4c;
  /* Keep original for browsers that support it */
  color: color(display-p3 1 0.1 0.3);

  background-color: #6a805d;
  background-color: color(a98-rgb 0.44 0.5 0.37);
}
```

See [Color Function Guide](./COLOR-FUNCTION.md) for comprehensive documentation.

### 3. Modern Color Notation

#### Space-Separated RGB/HSL

```css
.element {
  background: rgb(102 126 234 / 0.8);
  color: hsl(250 50% 60% / 0.9);
}
```

#### Hex with Alpha

```css
.element {
  border-color: #667eeacc;
  box-shadow: 0 4px 20px #0000004d;
}
```

### 4. Logical Properties

CSS logical properties let you define layout relative to writing mode and text direction. Bun's CSS bundler compiles them to physical properties with directional adjustments.

**Input:**
```css
.multilingual-component {
  margin-inline-start: 1rem;
  padding-block: 1rem 2rem;
  border-start-start-radius: 4px;
  inline-size: 80%;
  block-size: auto;
}
```

**Output (Converted by Bun):**
```css
/* For left-to-right languages */
.multilingual-component:dir(ltr) {
  margin-left: 1rem;
  padding-top: 1rem;
  padding-bottom: 2rem;
  border-top-left-radius: 4px;
  width: 80%;
  height: auto;
}

/* For right-to-left languages */
.multilingual-component:dir(rtl) {
  margin-right: 1rem;
  padding-top: 1rem;
  padding-bottom: 2rem;
  border-top-right-radius: 4px;
  width: 80%;
  height: auto;
}
```

See [Logical Properties Guide](./LOGICAL-PROPERTIES.md) for comprehensive documentation.

### 5. Modern Selectors

#### :is() Selector

Bun's CSS bundler provides vendor-prefixed fallbacks for `:is()`:

**Input:**
```css
.article :is(h1, h2, h3) {
  margin-top: 1.5em;
}
```

**Output (Fallbacks):**
```css
.article :-webkit-any(h1, h2, h3) {
  margin-top: 1.5em;
}

.article :-moz-any(h1, h2, h3) {
  margin-top: 1.5em;
}

.article :is(h1, h2, h3) {
  margin-top: 1.5em;
}
```

#### :not() Selector

Multiple arguments converted to `:not(:is(...))`:

**Input:**
```css
button:not(.primary, .secondary) {
  background-color: #f5f5f5;
}
```

**Output:**
```css
button:not(:is(.primary, .secondary)) {
  background-color: #f5f5f5;
}
```

#### :dir() Selector

Converted to `:lang()` selectors with language mappings:

**Input:**
```css
.nav-arrow:dir(rtl) {
  transform: rotate(180deg);
}
```

**Output:**
```css
.nav-arrow:lang(ar, he, fa, ur) {
  transform: rotate(180deg);
}
```

#### :lang() Selector

Multiple arguments converted to `:is()`:

**Input:**
```css
:lang(zh, ja, ko) {
  line-height: 1.8;
}
```

**Output:**
```css
:is(:lang(zh), :lang(ja), :lang(ko)) {
  line-height: 1.8;
}
```

See individual selector guides for comprehensive documentation.

### 6. Math Functions

CSS includes a rich set of mathematical functions. Bun's CSS bundler evaluates these at build time when all values are known constants:

```css
.dynamic-sizing {
  width: clamp(200px, 50%, 800px);
  padding: round(14.8px, 5px);
  transform: rotate(calc(sin(45deg) * 50deg));
  --scale-factor: pow(1.25, 3);
  font-size: calc(16px * var(--scale-factor));
}
```

**Build-time evaluation:**
- `round(14.8px, 5px)` → `15px`
- `sin(45deg) * 50deg` → `35.36deg`
- `pow(1.25, 3)` → `1.953125`

Available functions: `clamp()`, `round()`, `mod()`, `rem()`, `abs()`, `sign()`, `sin()`, `cos()`, `tan()`, `asin()`, `acos()`, `atan()`, `atan2()`, `pow()`, `sqrt()`, `exp()`, `log()`, `hypot()`, `min()`, `max()`

### 7. Media Query Ranges

Modern CSS supports intuitive range syntax using comparison operators. Bun's CSS bundler automatically converts to traditional `min-`/`max-` syntax:

**Input (Modern Syntax):**
```css
@media (width >= 768px) {
  .container {
    max-width: 720px;
  }
}

@media (768px <= width <= 1199px) {
  .sidebar {
    display: flex;
  }
}

@media (width > 320px) and (width < 768px) {
  .mobile-only {
    display: block;
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

@media (min-width: 768px) and (max-width: 1199px) {
  .sidebar {
    display: flex;
  }
}

@media (min-width: 321px) and (max-width: 767px) {
  .mobile-only {
    display: block;
  }
}
```

### 8. Modern Shorthands

Bun's CSS bundler converts modern shorthands to longhand properties:

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

### 9. Double Position Gradients

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

### 10. light-dark() Function

The `light-dark()` function provides automatic theme support. Bun converts it to CSS variables with fallbacks:

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

### 11. system-ui Font

The `system-ui` generic font family uses the device's native UI font. Bun's CSS bundler automatically expands it to a comprehensive cross-platform font stack:

**Input:**
```css
.native-interface {
  font-family: system-ui;
}

.fallback-aware {
  font-family: system-ui, sans-serif;
}
```

**Output (Expanded by Bun):**
```css
.native-interface {
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
- macOS/iOS: SF Pro (`-apple-system`, `BlinkMacSystemFont`)
- Windows: Segoe UI
- Android: Roboto
- Linux: Ubuntu, Cantarell

---

## Bun CSS Bundler Features

### 1. CSS Imports

Bun automatically bundles CSS when imported:

```typescript
// Import CSS directly
import "./styles/dashboard.css";

// CSS is automatically bundled and injected
```

### 2. CSS Modules

Bun's bundler supports CSS modules with zero configuration. CSS modules automatically scope class names to prevent collisions.

#### Getting Started

Create a CSS file with the `.module.css` extension:

**styles.module.css:**
```css
.button {
  color: red;
}
```

**other-styles.module.css:**
```css
.button {
  color: blue;
}
```

Import and use in TSX/JSX:

```tsx
import styles from "./styles.module.css";
import otherStyles from "./other-styles.module.css";

export default function App() {
  return (
    <>
      <button className={styles.button}>Red button!</button>
      <button className={otherStyles.button}>Blue button!</button>
    </>
  );
}
```

#### Unique Identifiers

Bun transforms locally scoped class names into unique identifiers:

```tsx
import styles from "./styles.module.css";
import otherStyles from "./other-styles.module.css";

console.log(styles);
console.log(otherStyles);
```

**Output:**
```tsx
{
  button: "button_123"
}

{
  button: "button_456"
}
```

#### Composition

CSS modules support the `composes` property for composition:

```css
/* base.module.css */
.base {
  padding: 1rem;
  border-radius: 8px;
}

/* styles.module.css */
.button {
  composes: base from "./base.module.css";
  color: red;
  
  &:hover {
    background-color: color-mix(in srgb, red 80%, white);
  }
}
```

#### Features

- ✅ Automatic detection of `.module.css` files (zero configuration)
- ✅ Composition (`composes` property)
- ✅ Importing CSS modules into JSX/TSX
- ✅ Warnings/errors for invalid usages
- ✅ Scoped class names (no collisions)
- ✅ Unique identifier transformation

### 3. PostCSS Support

Bun supports PostCSS plugins natively:

```bash
# Build with PostCSS
bun build ./styles/main.css --outdir ./dist --minify
```

### 4. Minification

```bash
# Minify CSS
bun build ./styles/dashboard.css --outdir ./dist --minify
```

### 5. Source Maps

```bash
# Generate source maps
bun build ./styles/dashboard.css --outdir ./dist --sourcemap
```

---

## Usage

### Direct Import (Recommended)

```typescript
// In your TypeScript/JavaScript file
import "./styles/dashboard.css";

// Bun automatically bundles and injects CSS
```

### Using Bun Build CLI

```bash
# Bundle CSS file
bun build ./styles/dashboard.css --outdir ./dist --minify

# Bundle multiple CSS files
bun build ./styles/*.css --outdir ./dist --minify

# With source maps
bun build ./styles/dashboard.css --outdir ./dist --minify --sourcemap

# Watch mode (auto-rebuild on changes)
bun build --watch ./styles/dashboard.css --outdir ./dist
```

**Watch Mode Reference**: [Bun Bundler - Watch Mode](https://bun.sh/docs/bundler#watch-mode)

### Content Types

Bun's bundler automatically detects content types based on file extensions:

**Reference**: [Bun Bundler - Content Types](https://bun.sh/docs/bundler#content-types)

#### Supported Content Types

- **CSS**: `.css` files - Automatically bundled with syntax lowering
- **CSS Modules**: `.module.css` files - Treated as CSS modules
- **JavaScript**: `.js` files - Bundled and transpiled
- **TypeScript**: `.ts` files - Transpiled to JavaScript
- **JSX/TSX**: `.jsx`, `.tsx` files - Transpiled with JSX support

#### Automatic Detection

Bun automatically detects content types from file extensions:

```bash
# CSS file - Bun detects as CSS content type
bun build ./styles/dashboard.css --outdir ./dist

# TypeScript file - Bun detects as TypeScript content type
bun build ./src/index.ts --outdir ./dist

# Mixed content types - Bun handles each appropriately
bun build ./src/index.ts ./styles/dashboard.css --outdir ./dist
```

#### Content Type Handling

- **CSS files**: Automatically processed with syntax lowering
- **JavaScript/TypeScript**: Transpiled and bundled
- **Mixed imports**: CSS imports in JS/TS files are automatically handled

### Using CSS Bundler Utility

```typescript
import { cssBundler } from "./utils/css-bundler";

const result = await cssBundler.bundle({
  input: "./styles/dashboard.css",
  output: "./dist/bundle.css",
  minify: true,
  sourcemap: true,
});

console.log(`Bundled ${result.size} bytes`);

// Access syntax lowering report
if (result.syntaxReport) {
  console.log("Features detected:", result.syntaxReport.features);
  console.log("Will lower:", result.syntaxReport.willLower);
}
```

### Syntax Lowering Detection

```typescript
import { cssBundler } from "./utils/css-bundler";

// Detect features in CSS
const report = await cssBundler.detectFeatures("./styles/dashboard.css");
console.log("Nesting detected:", report.features.nesting);
console.log("Color-mix detected:", report.features.colorMix);
console.log("Will lower:", report.willLower);
console.log("Requires support:", report.requiresSupport);
```

### CSS Module Composition

```typescript
import { cssBundler } from "./utils/css-bundler";

// Bundle modules with composition support
const modules = await cssBundler.bundleModules("./styles/components.module.css");
console.log("Module classes:", modules);
```

### CSS Modules in JSX/TSX

```tsx
import styles from "./styles.module.css";
import otherStyles from "./other-styles.module.css";

export default function App() {
  return (
    <>
      <button className={styles.button}>Red button!</button>
      <button className={otherStyles.button}>Blue button!</button>
    </>
  );
}
```

Bun provides type-safe imports for CSS modules, so TypeScript will warn you about invalid class names.

### Syntax Validation

```typescript
import { cssBundler } from "./utils/css-bundler";

// Validate CSS syntax
const validation = await cssBundler.validateSyntax("./styles/dashboard.css");
if (!validation.valid) {
  console.error("Errors:", validation.errors);
}
if (validation.warnings.length > 0) {
  console.warn("Warnings:", validation.warnings);
}
```

### Using Bundle Script

```bash
# Bundle CSS
bun run scripts/bundle-css.ts

# With options
bun run scripts/bundle-css.ts --input ./styles --output ./dist/bundle.css --minify
```

---

## Bun.CookieMap Integration

### Usage

```typescript
import { cookieUtils } from "./utils/bun-cookie";

// From request headers
const cookies = cookieUtils.fromHeaders(req.headers);
const theme = cookieUtils.get(cookies, "theme", "dark");

// Set cookie
cookieUtils.set(cookies, "sessionId", "abc123", {
  maxAge: 86400,
  httpOnly: true,
  secure: true,
  sameSite: "strict",
});

// Delete cookie
cookieUtils.delete(cookies, "sessionId");
```

### API Methods

- `fromHeaders(headers)` - Create CookieMap from Headers
- `fromString(cookieString)` - Create CookieMap from cookie string
- `get(cookies, name, defaultValue?)` - Get cookie value
- `set(cookies, name, value, options?)` - Set cookie with options
- `delete(cookies, name)` - Delete cookie
- `has(cookies, name)` - Check if cookie exists
- `toObject(cookies)` - Convert to plain object

---

## Bun.color Integration

### CSS Color Formatting

Bun.color can format colors as CSS using the `"css"` format. The CSS bundler utility provides helpers for this:

```typescript
import { cssBundler } from "./utils/css-bundler";

// Format any color as CSS
const cssColor = cssBundler.formatColorAsCSS("#00d4ff");
// Returns: "rgb(0, 212, 255)"

// With alpha channel
const cssColorWithAlpha = cssBundler.formatColorAsCSS("#00d4ff", 0.8);
// Returns: "rgba(0, 212, 255, 0.8)"

// Generate CSS variables from color map
const cssVars = cssBundler.generateColorVariables({
  "accent-cyan": "#00d4ff",
  "accent-purple": "#667eea",
  "accent-green": "#10b981",
});
// Returns CSS variables with properly formatted colors
```

### Direct Bun.color Usage

```typescript
// Format color as CSS directly
const cssColor = Bun.color("#00d4ff", "css");
// Returns: "rgb(0, 212, 255)"

// Other formats available
const hexColor = Bun.color("rgb(0, 212, 255)", "hex");
// Returns: "#00d4ff"

const hslColor = Bun.color("#00d4ff", "hsl");
// Returns: "hsl(188, 100%, 50%)"
```

### Terminal Colors

```typescript
import { colors } from "./utils/bun-color";

// Basic colors
console.log(colors.cyan("Cyan text"));
console.log(colors.red("Red text"));
console.log(colors.green("Green text"));

// Department colors
console.log(colors.department("API Team", "API & Routes"));

// Theme colors (matching dashboard)
console.log(colors.theme.primary("Primary text"));
console.log(colors.theme.secondary("Secondary text"));

// RGB colors using Bun.color
console.log(colors.rgb("#00d4ff", "Cyan text"));
console.log(colors.rgb("rgb(0, 212, 255)", "Cyan text"));
```

### Department Color Mapping

Colors match TEAM.md department colors:

- **API & Routes**: `#00d4ff` (Cyan)
- **Arbitrage & Trading**: `#ff1744` (Red)
- **ORCA & Sports Betting**: `#9c27b0` (Purple)
- **Dashboard & UI**: `#667eea` (Indigo)
- **Registry & MCP Tools**: `#ff00ff` (Magenta)
- **Security**: `#ff6b00` (Orange)
- **Performance & Caching**: `#00ff88` (Green)
- **Documentation & DX**: `#00ff88` (Green)

---

## CSS File Structure

```text
styles/
├── dashboard.css              # Main dashboard styles (with modern syntax)
├── dashboard.module.css       # Dashboard CSS module
├── components.module.css      # Component styles with composition
├── base.module.css            # Base styles for composition
└── themes.css                 # Theme variables with advanced colors
```

### CSS Variables

Dashboard CSS uses CSS variables matching department colors:

```css
:root {
  --dept-api: #00d4ff;
  --dept-arbitrage: #ff1744;
  --dept-orca: #9c27b0;
  /* ... */
}
```

---

## Integration with Dashboard

### Current Implementation

Dashboard currently uses inline `<style>` tags in `dashboard/index.html`.

### Migration Path

1. Extract CSS to `styles/dashboard.css`
2. Import in dashboard build:
   ```typescript
   import "./styles/dashboard.css";
   ```
3. Bun automatically bundles CSS

### CSS Modules Example

```css
/* styles/dashboard.module.css */
.card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 25px;
}
```

```typescript
import styles from "./styles/dashboard.module.css";

// Use hashed class name
<div className={styles.card}>Content</div>
```

---

## Migration Guide

### From Traditional CSS to Modern Syntax

#### 1. Convert Flat CSS to Nesting

**Before:**
```css
.card {
  background: var(--bg-secondary);
}
.card h2 {
  color: var(--accent-cyan);
}
.card:hover {
  transform: translateY(-2px);
}
```

**After:**
```css
.card {
  background: var(--bg-secondary);
  
  h2 {
    color: var(--accent-cyan);
  }
  
  &:hover {
    transform: translateY(-2px);
  }
}
```

#### 2. Use Color-Mix for Variations

**Before:**
```css
.button {
  background: #667eea;
}
.button:hover {
  background: #8a9ff0; /* Manual calculation */
}
```

**After:**
```css
.button {
  background: var(--accent-purple);
  
  &:hover {
    background: color-mix(in srgb, var(--accent-purple) 80%, white);
  }
}
```

#### 3. Use Logical Properties

**Before:**
```css
.card {
  padding-top: 25px;
  padding-bottom: 25px;
  padding-left: 25px;
  padding-right: 25px;
  margin-left: 1rem;
}
```

**After:**
```css
.card {
  padding-block: 25px;
  padding-inline: 25px;
  margin-inline-start: 1rem;
}
```

#### 4. Use Modern Selectors

**Before:**
```css
.card.active,
.status-item.active {
  opacity: 1;
}
```

**After:**
```css
:is(.card, .status-item).active {
  opacity: 1;
}
```

## Browser Compatibility

Bun's syntax lowering ensures compatibility with:

- **Chrome**: >= 112
- **Firefox**: >= 113
- **Safari**: >= 16.4
- **Edge**: >= 112

Features that require browser support (not lowered):
- Logical properties (supported in all modern browsers)
- Modern selectors (:is, :not, :dir, :lang)
- Math functions (clamp, round, etc.)
- Media query ranges
- Modern shorthands

## Best Practices

1. **Use CSS imports** - Let Bun handle bundling automatically
2. **Use CSS modules** - For component-scoped styles
3. **Use CSS variables** - For theme consistency
4. **Use modern syntax** - Bun will lower it automatically
5. **Use logical properties** - For RTL/LTR support
6. **Use color-mix()** - For theme variations
7. **Use CSS nesting** - For better organization
8. **Minify in production** - Use `--minify` flag
9. **Generate source maps** - For debugging (dev only)
10. **Validate syntax** - Use `validateSyntax()` before building

---

## Golden CSS Template

A comprehensive CSS template demonstrating elite patterns:

- **Design Tokens** - Complete design system with CSS custom properties
- **Component Library** - Card, Button, Badge, Input components
- **Responsive Design** - Fluid typography and spacing using clamp()
- **Theme Support** - Automatic light/dark themes with light-dark()
- **Modern Patterns** - LightningCSS-style nested selectors and color functions

See [Golden CSS Template](./GOLDEN-CSS-TEMPLATE.md) for full documentation.

**A huge thanks goes to the amazing work from the authors of LightningCSS and esbuild.**

## Related Documentation

### Core Features
- [CSS Nesting](./CSS-NESTING.md) - Comprehensive CSS nesting guide with examples
- [LAB Colors](./LAB-COLORS.md) - Perceptually uniform color spaces with automatic fallbacks
- [Color Function](./COLOR-FUNCTION.md) - Wide gamut color spaces (display-p3, a98-rgb)
- [HWB Colors](./HWB-COLORS.md) - Intuitive hue-whiteness-blackness color model
- [Relative Colors](./RELATIVE-COLORS.md) - Relative color syntax guide with build-time computation
- [light-dark()](./LIGHT-DARK.md) - Automatic light/dark theme support

### Selectors & Properties
- [Logical Properties](./LOGICAL-PROPERTIES.md) - RTL/LTR-aware properties with automatic conversion
- [:dir() Selector](./DIR-SELECTOR.md) - Direction-aware selectors with language fallbacks
- [:lang() Selector](./LANG-SELECTOR.md) - Language-specific styling with :is() fallbacks
- [:not() Selector](./NOT-SELECTOR.md) - Multiple argument exclusions with fallbacks

### Advanced Features
- [Modern Shorthands](./SHORTHANDS.md) - place-items, two-value overflow, enhanced text-decoration
- [Double Position Gradients](./DOUBLE-POSITION-GRADIENTS.md) - Hard color stops in gradients

### Modules & Composition
- [CSS Modules](./CSS-MODULES.md) - CSS modules guide with composition and JSX/TSX integration
- [CSS Modules Composition Rules](./CSS-MODULES-COMPOSITION.md) - Detailed composition rules and best practices

### Templates & Examples
- [Golden CSS Template](./GOLDEN-CSS-TEMPLATE.md) - Elite CSS patterns template
- [CSS Syntax Examples](./CSS-SYNTAX-EXAMPLES.md) - Comprehensive examples
- [CSS Fallbacks](./CSS-FALLBACKS.md) - Automatic fallback generation for browser compatibility
- [Bun CSS Bundler Docs](https://bun.com/docs/bundler/css)
- [Bun.color CSS Formatting](https://bun.com/docs/runtime/color#format-colors-as-css) - Format colors as CSS
- [Bun.CookieMap Docs](https://bun.com/docs/api/cookies)
- [Bun.color Docs](https://bun.com/docs/api/color)
- [Team Structure](../.github/TEAM.md) - Department colors
- [Dashboard Styles](../styles/dashboard.css)

---

**Last Updated**: 2025-01-XX  
**Version**: 2.0.0
