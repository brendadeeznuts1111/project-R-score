# 🎨 Advanced HSL Color Theory Utilities

Comprehensive color manipulation utilities using advanced HSL theory with Bun.color(), featuring perceptually-aware color generation, OKLCH conversion, accessibility checking, and harmonious palette generation.

## Quick Start

```bash
# Generate a color palette
bun run color:palette --hue=210 --saturation=85 --lightness=65

# Check contrast for accessibility
bun run color:contrast --fg="hsl(0, 100%, 50%)" --bg="hsl(0, 0%, 95%)"

# Run interactive demo
bun run color:demo
```

## Core Concepts

### HSL Sweet Spots

Maximum visual impact ranges for common use cases:

| Purpose              | Hue Range     | Saturation | Lightness | Example Hex       |
|----------------------|---------------|------------|-----------|-------------------|
| Success / Positive   | 120–150       | 80–100%    | 55–70%    | #22c55e           |
| Warning / Attention  | 30–50         | 90–100%    | 60–75%    | #f59e0b           |
| Error / Critical     | 0–15 or 345–360 | 85–100%  | 50–65%    | #ef4444           |
| Info / Neutral       | 200–240       | 70–90%     | 60–75%    | #3b82f6           |
| Background / Muted   | 200–220       | 20–40%     | 90–97%    | #e0f2fe           |

### Perceptual Non-Uniformity

HSL is **not perceptually uniform** — equal steps in HSL values do **not** produce equal perceived differences:

- Hue shifts near blue-cyan (180–210°) are less distinguishable than red-yellow (0–60°)
- Lightness steps near 0% and 100% compress (shadows/highlights)
- Saturation changes are most visible around L = 50%

The utilities compensate for these quirks using perceptual brightness calculations.

## API Reference

### Palette Generation

```typescript
import { generatePalette, generateHarmoniousPalette } from "./lib/utils/advanced-hsl-colors";

// Generate complete palette from base color
const palette = generatePalette({ h: 210, s: 90, l: 60 });
console.log(palette.primary);        // "#3b82f6"
console.log(palette.analogous);       // ["#60a5fa", "#2563eb"]
console.log(palette.complementary);   // "#f59e0b"
console.log(palette.triadic);         // ["#22c55e", "#ec4899"]
console.log(palette.tints);           // Lighter variants
console.log(palette.shades);          // Darker variants

// Generate harmonious palette via hue offsets
const harmonious = generateHarmoniousPalette(210, 85, 65);
```

### Status Colors

```typescript
import { getStatusColor, getStatusAnsi, generateStatusConfig } from "./lib/utils/advanced-hsl-colors";

// Get status color with perceptual adjustment
const successHSL = getStatusColor("success", 65, "medium");
const successAnsi = getStatusAnsi("success", 65, "high", "ansi");

// Generate complete status configuration
const config = generateStatusConfig(65);
// { success: HSL, warning: HSL, error: HSL, info: HSL }
```

### Accessibility

```typescript
import { checkContrast, findAccessibleForeground, contrastRatio } from "./lib/utils/advanced-hsl-colors";

// Check WCAG compliance
const foreground = { h: 0, s: 100, l: 50 };
const background = { h: 0, s: 0, l: 95 };
const result = checkContrast(foreground, background);

console.log(result.ratio);      // 4.2:1
console.log(result.wcagAA);     // false (needs ≥4.5:1)
console.log(result.wcagAAA);    // false (needs ≥7:1)
console.log(result.level);      // "fail" | "AA" | "AAA"

// Find accessible foreground for background
const accessible = findAccessibleForeground(background, 4.5, 0); // Red hue
```

### Perceptual Brightness

```typescript
import { perceivedBrightness, adjustToPerceivedBrightness } from "./lib/utils/advanced-hsl-colors";

// Calculate perceived brightness (0-1)
const brightness = perceivedBrightness({ h: 0, s: 100, l: 50 });

// Adjust to target perceived brightness
const adjusted = adjustToPerceivedBrightness(
  { h: 0, s: 100, l: 50 },
  0.5  // Target 50% brightness
);
```

### OKLCH Conversion (Perceptually Uniform)

```typescript
import { hslToOKLCH, oklchToHSL, rgbToOKLCH } from "./lib/utils/advanced-hsl-colors";

// Convert HSL to OKLCH (perceptually uniform)
const hsl = { h: 210, s: 90, l: 60 };
const oklch = hslToOKLCH(hsl);
// { l: 0.65, c: 0.15, h: 210 }

// Convert back (lossy, OKLCH has wider gamut)
const backToHSL = oklchToHSL(oklch);
```

## CLI Tools

### Color Palette Generator

```bash
# Generate palette from HSL values
bun run color:palette --hue=210 --saturation=85 --lightness=65

# Generate from hex color
bun run color:palette --color="#3b82f6"

# Generate from HSL string
bun run color:palette --base="hsl(210, 85%, 65%)"

# Show HSL sweet spots reference
bun run color:palette --sweet-spots

# Options
--no-harmonies    Skip harmonious colors
--no-tints        Skip lighter tints
--no-shades       Skip darker shades
```

### Contrast Checker

```bash
# Check contrast between two colors
bun run color:contrast --fg="hsl(0, 100%, 50%)" --bg="hsl(0, 0%, 95%)"
bun run color:contrast --fg="#ef4444" --bg="#ffffff"

# Find accessible foreground for background
bun run color:contrast --find --bg="hsl(210, 20%, 95%)" --hue=0
```

### Interactive Demo

```bash
# Run comprehensive demo
bun run color:demo
```

## Integration Examples

### Status Matrix Integration

```typescript
import { getStatusAnsi, generateStatusConfig } from "./lib/utils/advanced-hsl-colors";

// Enhanced status cell formatting
function formatStatusCell(
  status: "success" | "warning" | "error",
  severity: "low" | "medium" | "high" = "medium"
): string {
  const ansi = getStatusAnsi(status, 65, severity);
  const glyphs = { success: "✓", warning: "▵", error: "✗" };
  return `${ansi}${glyphs[status]}\x1b[0m`;
}
```

### Dynamic Severity Colors

```typescript
import { getStatusColor } from "./lib/utils/advanced-hsl-colors";

// Adjust colors based on severity
const lowSeverity = getStatusColor("error", 65, "low");    // Muted red
const highSeverity = getStatusColor("error", 65, "high");  // Vivid red
```

### Accessible UI Colors

```typescript
import { findAccessibleForeground, checkContrast } from "./lib/utils/advanced-hsl-colors";

// Ensure accessible text on colored backgrounds
const bgColor = { h: 210, s: 20, l: 95 }; // Light blue background
const textColor = findAccessibleForeground(bgColor, 4.5, 0); // Red text

const contrast = checkContrast(textColor, bgColor);
if (contrast.wcagAA) {
  console.log("✅ Accessible!");
}
```

## Advanced Techniques

### Harmonious Palettes via Hue Offsets

```typescript
const baseHue = 210; // Blue
const palette = generateHarmoniousPalette(baseHue, 85, 65);

// Small offsets (5–15°) create harmonious palettes
// Large offsets (120–180°) create strong contrast
```

### Tints & Shades (Lightness Modulation)

```typescript
const primary = { h: 210, s: 90, l: 60 };

// Generate tints (lighter)
const tints = Array.from({ length: 5 }, (_, i) => ({
  ...primary,
  l: Math.min(100, primary.l + (i + 1) * 8)
}));

// Generate shades (darker)
const shades = Array.from({ length: 5 }, (_, i) => ({
  ...primary,
  l: Math.max(0, primary.l - (i + 1) * 8)
}));
```

### Perceptual Brightness Compensation

```typescript
// Compensate for HSL non-uniformity at extremes
const darkRed = { h: 0, s: 100, l: 25 };
const adjusted = adjustToPerceivedBrightness(darkRed, 0.5);
// Adjusts lightness and saturation for better visibility
```

## Best Practices

1. **Use Sweet Spots**: Stay within HSL sweet spot ranges for maximum visual impact
2. **Check Contrast**: Always verify WCAG AA/AAA compliance for text/background pairs
3. **Compensate for Non-Uniformity**: Use perceptual brightness adjustments near extremes
4. **Prefer OKLCH for Uniformity**: Use OKLCH when perceptual uniformity is critical
5. **Dynamic Severity**: Adjust saturation/lightness based on severity levels

## References

- [WCAG 2.1 Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [HSL Color Model](https://en.wikipedia.org/wiki/HSL_and_HSV)
- [OKLCH Color Space](https://oklch.com/)
- [Bun.color() API](https://bun.com/docs/api/color)

---

**Ready to go vivid? 🎨🚀**
