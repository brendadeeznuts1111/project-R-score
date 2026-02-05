# LAB Colors

Modern CSS supports perceptually uniform color spaces like LAB, LCH, OKLAB, and OKLCH that offer significant advantages over traditional RGB. These color spaces can represent colors outside the standard RGB gamut, resulting in more vibrant and visually consistent designs.

Bun's CSS bundler automatically converts these advanced color formats to backwards-compatible alternatives for browsers that don't yet support them.

## Overview

LAB color spaces provide:
- **Perceptual uniformity** - Equal steps appear equally different to the human eye
- **Wider gamut** - Can represent colors outside sRGB boundaries
- **More vibrant colors** - Access to colors impossible in RGB
- **Better gradients** - Smooth transitions in perceptual space

## Color Spaces

### LAB (CIE LAB)

```css
.vibrant-element {
  /* LAB: Lightness (0-100%), a-axis, b-axis */
  color: lab(55% 78 35);
}
```

### LCH (Lightness, Chroma, Hue)

```css
.lch-example {
  /* LCH: Lightness (0-100%), Chroma (0+), Hue (0-360deg) */
  color: lch(55% 78 35deg);
  background: lch(70% 0.2 250deg);
}
```

### OKLAB (Perceptually Uniform)

```css
.oklab-example {
  /* OKLAB: Lightness (0-1), a-axis, b-axis */
  color: oklab(0.6 0.1 0.05);
}
```

### OKLCH (Recommended)

```css
.oklch-example {
  /* OKLCH: Lightness (0-1), Chroma (0+), Hue (0-360deg) */
  color: oklch(65% 0.25 10deg);
  background: oklch(25% 0.05 250deg);
}
```

**Recommendation:** Use `oklch()` for most use cases as it provides the best perceptual uniformity.

## Automatic Fallbacks

Bun's CSS bundler automatically creates layered fallbacks:

**Input:**
```css
.vibrant-element {
  color: lab(55% 78 35);
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

This layered approach ensures optimal color rendering across all browsers.

## Examples

### Vibrant Colors Outside sRGB

```css
.vibrant-red {
  /* A vibrant red that exceeds sRGB gamut boundaries */
  color: lab(55% 78 35);
}

.vibrant-blue {
  /* A vibrant blue impossible in standard RGB */
  color: oklch(65% 0.25 250deg);
}
```

### Perceptually Uniform Gradients

```css
.smooth-gradient {
  /* Smooth gradient using perceptual color space */
  background: linear-gradient(
    to right,
    oklch(65% 0.25 10deg),
    oklch(65% 0.25 250deg)
  );
}

.perceptual-gradient {
  /* Equal perceptual steps */
  background: linear-gradient(
    to bottom,
    oklch(90% 0.05 250deg),
    oklch(80% 0.05 250deg),
    oklch(70% 0.05 250deg),
    oklch(60% 0.05 250deg),
    oklch(50% 0.05 250deg)
  );
}
```

### Theme Colors

```css
:root {
  /* Base colors using OKLCH for perceptual uniformity */
  --color-base-00: oklch(98% 0.01 250);
  --color-base-50: oklch(50% 0.04 250);
  --color-base-100: oklch(5% 0.05 250);
  
  /* Brand colors */
  --color-brand-primary: oklch(60% 0.2 250deg);
  --color-brand-secondary: oklch(65% 0.25 10deg);
}
```

### Color Manipulation

LAB colors work excellently with relative colors:

```css
:root {
  --base: oklch(60% 0.2 250deg);
  
  /* Lightness variations */
  --lighter: oklch(from var(--base) calc(l + 10%) c h);
  --darker: oklch(from var(--base) calc(l - 10%) c h);
  
  /* Chroma variations */
  --vibrant: oklch(from var(--base) l calc(c + 0.1) h);
  --muted: oklch(from var(--base) l calc(c * 0.5) h);
}
```

## Browser Support

### Native Support

- **Chrome**: 111+
- **Firefox**: 113+
- **Safari**: 15.4+
- **Edge**: 111+

### Fallback Strategy

Bun's layered fallback approach:

1. **RGB fallback** - Closest sRGB approximation for older browsers
2. **P3 fallback** - `color(display-p3 ...)` for browsers with wide gamut displays
3. **Original LAB** - Preserved for modern browsers

This ensures:
- ✅ Works in all browsers
- ✅ Best color quality where supported
- ✅ Graceful degradation

## When to Use LAB Colors

### Use LAB/OKLCH When:

- ✅ Creating color scales (perceptually uniform steps)
- ✅ Building gradients (smooth transitions)
- ✅ Designing themes (consistent lightness)
- ✅ Need vibrant colors outside sRGB
- ✅ Manipulating colors mathematically

### Stick with RGB/HSL When:

- ⚠️ Need precise color control
- ⚠️ Working with existing RGB color systems
- ⚠️ Maximum browser compatibility is critical (though Bun handles this)

## Best Practices

1. **Prefer OKLCH** - Best perceptual uniformity
2. **Use for gradients** - Smoother transitions
3. **Combine with relative colors** - Powerful color manipulation
4. **Let Bun handle fallbacks** - Don't write fallbacks manually
5. **Test on target displays** - Verify wide gamut colors render correctly

## Comparison

### RGB vs LAB

```css
/* RGB - Not perceptually uniform */
.rgb-gradient {
  background: linear-gradient(to bottom, #000000, #808080, #ffffff);
  /* Steps don't appear equal */
}

/* LAB - Perceptually uniform */
.lab-gradient {
  background: linear-gradient(
    to bottom,
    oklch(0% 0 0deg),
    oklch(50% 0 0deg),
    oklch(100% 0 0deg)
  );
  /* Steps appear equal to human eye */
}
```

## Related

- [Relative Colors](./RELATIVE-COLORS.md) - Color manipulation with relative colors
- [Bun CSS Bundler](./BUN-CSS-BUNDLER.md) - Main CSS bundler documentation
- [CSS Syntax Examples](./CSS-SYNTAX-EXAMPLES.md) - Comprehensive CSS examples
- [Golden CSS Template](./GOLDEN-CSS-TEMPLATE.md) - Elite CSS patterns

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0
