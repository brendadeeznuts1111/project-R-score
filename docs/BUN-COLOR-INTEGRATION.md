# 🎨 Bun.color() Integration Guide

Complete integration of advanced HSL color utilities with Bun's official `Bun.color()` API.

## Official Bun.color() Formats

Based on [official documentation](https://bun.sh/docs/api/color), `Bun.color()` supports:

### Output Formats

| Format       | Example                          | Use Case                    |
| ------------ | -------------------------------- | --------------------------- |
| `"css"`      | `"red"`                          | CSS stylesheets, inline styles |
| `"ansi"`     | `"\x1b[38;2;255;0;0m"`           | Auto-detect terminal colors |
| `"ansi-16m"` | `"\x1b[38;2;255;0;0m"`           | 24-bit terminal colors      |
| `"ansi-256"` | `"\x1b[38;5;196m"`               | 256-color terminals         |
| `"ansi-16"`  | `"\x1b[38;5;4m"`                 | 16-color terminals          |
| `"number"`   | `0x1a2b3c`                       | Database storage            |
| `"rgb"`      | `"rgb(255, 99, 71)"`             | CSS RGB strings             |
| `"rgba"`     | `"rgba(255, 99, 71, 0.5)"`       | CSS RGBA strings             |
| `"hsl"`      | `"hsl(120, 0.5, 0.5)"`           | HSL string (decimal format) |
| `"hex"`      | `"#1a2b3c"`                      | Lowercase hex               |
| `"HEX"`      | `"#1A2B3C"`                      | Uppercase hex               |
| `"{rgb}"`    | `{ r: 255, g: 99, b: 71 }`       | RGB object                  |
| `"{rgba}"`   | `{ r: 255, g: 99, b: 71, a: 1 }` | RGBA object                 |
| `"[rgb]"`    | `[ 255, 99, 71 ]`                | RGB array                   |
| `"[rgba]"`   | `[ 255, 99, 71, 255]`            | RGBA array                  |

### Input Formats

Bun.color() accepts flexible inputs:
- CSS color names: `"red"`, `"blue"`, etc.
- Numbers: `0xff0000`
- Hex strings: `"#f00"`, `"#ff0000"`
- RGB/RGBA strings: `"rgb(255, 0, 0)"`, `"rgba(255, 0, 0, 1)"`
- HSL/HSLA strings: `"hsl(0, 100%, 50%)"`, `"hsla(0, 100%, 50%, 1)"`
- RGB objects: `{ r: 255, g: 0, b: 0 }`
- RGBA objects: `{ r: 255, g: 0, b: 0, a: 1 }`
- RGB arrays: `[255, 0, 0]`
- RGBA arrays: `[255, 0, 0, 255]`
- LAB strings: `"lab(50% 50% 50%)"`
- Any valid CSS color value

## Integration with Advanced HSL Utilities

Our advanced HSL utilities (`lib/utils/advanced-hsl-colors.ts`) seamlessly integrate with Bun.color():

### 1. HSL Format Compatibility

**Important:** Bun.color() returns HSL in decimal format (`hsl(120, 0.5, 0.5)`) while CSS uses percentages (`hsl(120, 50%, 50%)`). Our `parseHSL()` function handles both:

```typescript
import { parseHSL } from "./lib/utils/advanced-hsl-colors";

// CSS format
const cssHSL = parseHSL("hsl(210, 90%, 60%)");
// { h: 210, s: 90, l: 60 }

// Bun.color format
const bunHSL = Bun.color("#3b82f6", "hsl"); // "hsl(217.22, 0.91, 0.60)"
const parsed = parseHSL(bunHSL);
// { h: 217, s: 91, l: 60 }
```

### 2. Converting HSL to All Formats

```typescript
import { formatHSL, hslToHex, hslToAnsi } from "./lib/utils/advanced-hsl-colors";

const hsl = { h: 210, s: 90, l: 60 };
const hslStr = formatHSL(hsl); // "hsl(210, 90%, 60%)"

// Use Bun.color() for all conversions
Bun.color(hslStr, "css");      // "#3d99f5"
Bun.color(hslStr, "hex");      // "#3d99f5"
Bun.color(hslStr, "ansi");     // ANSI escape code
Bun.color(hslStr, "number");   // 4037109
Bun.color(hslStr, "{rgb}");    // { r: 61, g: 153, b: 245 }
Bun.color(hslStr, "[rgb]");    // [61, 153, 245]
```

### 3. Complete Workflow Example

```typescript
import {
  generatePalette,
  getStatusAnsi,
  checkContrast,
  parseHSL,
} from "./lib/utils/advanced-hsl-colors";

// 1. Generate harmonious palette
const palette = generatePalette({ h: 210, s: 90, l: 60 });

// 2. Convert palette colors using Bun.color()
palette.palette.analogous.forEach(hex => {
  const css = Bun.color(hex, "css");        // Compact CSS
  const rgb = Bun.color(hex, "{rgb}");      // RGB object
  const hsl = Bun.color(hex, "hsl");         // HSL string
  const ansi = Bun.color(hex, "ansi");      // ANSI code
  
  console.log({ hex, css, rgb, hsl, ansi });
});

// 3. Check accessibility
const fg = parseHSL(Bun.color("#3b82f6", "hsl") || "");
const bg = { h: 0, s: 0, l: 95 };
const contrast = checkContrast(fg, bg);
console.log(`WCAG AA: ${contrast.wcagAA}`);

// 4. Get status colors
const successAnsi = getStatusAnsi("success", 65, "high");
console.log(`${successAnsi}✓ Success${"\x1b[0m"}`);
```

## CLI Tools

### Color Palette Generator

```bash
# Generate palette from HSL
bun run color:palette --hue=210 --saturation=85 --lightness=65

# From hex color
bun run color:palette --color="#3b82f6"

# Show HSL sweet spots
bun run color:palette --sweet-spots
```

### Contrast Checker

```bash
# Check contrast
bun run color:contrast --fg="hsl(0, 100%, 50%)" --bg="hsl(0, 0%, 95%)"

# Find accessible foreground
bun run color:contrast --find --bg="hsl(210, 20%, 95%)" --hue=0
```

### Examples

```bash
# Run comprehensive demo
bun run color:demo

# See all Bun.color() formats
bun run color:examples
```

## Best Practices

### 1. Use CSS Format for Storage

```typescript
// ✅ Good: Compact, readable
const color = Bun.color("hsl(210, 90%, 60%)", "css"); // "#3d99f5"

// ✅ Good: Database-friendly
const colorNum = Bun.color("hsl(210, 90%, 60%)", "number"); // 4037109
```

### 2. Use ANSI Format for Terminal Output

```typescript
// ✅ Good: Auto-detects terminal capabilities
const ansi = Bun.color("hsl(210, 90%, 60%)", "ansi");

// ✅ Good: Explicit format for specific terminals
const ansi24bit = Bun.color("hsl(210, 90%, 60%)", "ansi-16m");
```

### 3. Parse HSL Strings Correctly

```typescript
import { parseHSL } from "./lib/utils/advanced-hsl-colors";

// ✅ Handles both formats
const hsl1 = parseHSL("hsl(210, 90%, 60%)");        // CSS format
const hsl2 = parseHSL(Bun.color("#3b82f6", "hsl")); // Bun format
```

### 4. Use Advanced Utilities for Color Theory

```typescript
import {
  generateHarmoniousPalette,
  getStatusColor,
  checkContrast,
} from "./lib/utils/advanced-hsl-colors";

// ✅ Generate harmonious palettes
const palette = generateHarmoniousPalette(210, 85, 65);

// ✅ Perceptually-adjusted status colors
const errorHSL = getStatusColor("error", 65, "high");

// ✅ WCAG-compliant contrast checking
const accessible = checkContrast(fg, bg);
```

## Format Comparison

| Format | Output Type | Use Case | Example |
|--------|------------|----------|---------|
| `"css"` | `string` | CSS stylesheets | `"red"` or `"#f00"` |
| `"hex"` | `string` | Hex codes | `"#ff0000"` |
| `"number"` | `number` | Database storage | `16711680` |
| `"ansi"` | `string` | Terminal output | `"\x1b[38;2;255;0;0m"` |
| `"{rgb}"` | `object` | RGB components | `{ r: 255, g: 0, b: 0 }` |
| `"[rgb]"` | `array` | Typed arrays | `[255, 0, 0]` |
| `"hsl"` | `string` | HSL string | `"hsl(0, 1, 0.5)"` |

## Error Handling

Bun.color() returns `null` if input is invalid or format is unsupported:

```typescript
const result = Bun.color("invalid", "hex");
if (result === null) {
  console.error("Invalid color input");
}
```

## Bundle-Time Macros

Use Bun's macro system for client-side builds:

```typescript
import { color } from "bun" with { type: "macro" };

// This is evaluated at bundle-time
console.log(color("#f00", "css")); // Outputs: "red"
```

## Summary

Our advanced HSL utilities complement Bun.color() by providing:

1. **Perceptual brightness compensation** - Handles HSL non-uniformity
2. **Harmonious palette generation** - Color theory-based palettes
3. **WCAG accessibility checking** - Contrast ratio calculations
4. **Dynamic status colors** - Perceptually-adjusted status indicators
5. **OKLCH conversion** - Perceptually uniform color space

All utilities integrate seamlessly with Bun.color()'s flexible input/output formats, providing a complete color manipulation toolkit for Bun applications.

---

**See Also:**
- [Bun.color() Official Docs](https://bun.sh/docs/api/color)
- [Advanced HSL Utilities](./lib/utils/README-advanced-hsl.md)
- [Examples](./lib/utils/bun-color-examples.ts)
