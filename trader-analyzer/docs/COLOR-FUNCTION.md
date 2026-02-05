# Color Function

The `color()` function provides a standardized way to specify colors in various predefined color spaces, expanding your design options beyond the traditional RGB space. This allows you to access wider color gamuts and create more vibrant designs.

Bun's CSS bundler provides appropriate RGB fallbacks for browsers that don't support these advanced color functions yet.

## Overview

The `color()` function supports multiple color spaces:
- `display-p3` - Wide gamut display (P3)
- `a98-rgb` - Adobe RGB (1998)
- `prophoto-rgb` - ProPhoto RGB
- `rec2020` - Rec. 2020
- `srgb` - Standard RGB

## Basic Usage

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

## Color Spaces

### Display P3

Wide gamut color space for modern displays:

```css
.vibrant-p3 {
  /* P3 colors can be more vibrant than sRGB */
  color: color(display-p3 1 0.1 0.3);
  background: color(display-p3 0.2 0.8 0.5);
}
```

### A98 RGB

Adobe RGB (1998) color space:

```css
.a98-rgb-example {
  color: color(a98-rgb 0.44 0.5 0.37);
  background: color(a98-rgb 0.8 0.2 0.1);
}
```

### ProPhoto RGB

ProPhoto RGB color space:

```css
.prophoto-example {
  color: color(prophoto-rgb 0.5 0.3 0.2);
}
```

### Rec. 2020

Rec. 2020 color space:

```css
.rec2020-example {
  color: color(rec2020 0.8 0.1 0.9);
}
```

## Use Cases

- **Wide gamut displays** - Access colors beyond sRGB on modern displays
- **Print design** - Use color spaces designed for print workflows
- **Professional photography** - Work with color spaces used in photography
- **Vibrant designs** - Create more saturated and vibrant color palettes

## Browser Support

- **Chrome**: 111+
- **Firefox**: 113+
- **Safari**: 15.4+
- **Edge**: 111+

Bun automatically provides RGB fallbacks for older browsers.

## Best Practices

1. **Use for wide gamut** - Leverage P3 for vibrant colors on supported displays
2. **Provide fallbacks** - Bun handles this automatically
3. **Test on target displays** - Verify colors render correctly
4. **Combine with LAB colors** - Use together for maximum color flexibility

## Related

- [LAB Colors](./LAB-COLORS.md) - Perceptually uniform color spaces
- [Bun CSS Bundler](./BUN-CSS-BUNDLER.md) - Main CSS bundler documentation

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0
