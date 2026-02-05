# Relative Colors

CSS allows you to modify individual components of a color using relative color syntax. This powerful feature lets you create color variations by adjusting specific attributes like lightness, saturation, or individual channels without having to recalculate the entire color.

Bun's CSS bundler computes these relative color modifications at build time (when not using CSS variables) and generates static color values for browser compatibility.

## Overview

Relative colors let you create color variations mathematically:

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

## Use Cases

- **Theme generation** - Create complete color scales from a single base color
- **Accessible color variants** - Ensure sufficient contrast for text and backgrounds
- **Color scales** - Build mathematical color relationships instead of hard-coding values
- **Dynamic theming** - Generate variations based on user preferences

## Syntax

### LCH Relative Colors

```css
:root {
  --base: #00d4ff;
  
  /* Lightness variations */
  --lighter: lch(from var(--base) calc(l + 10%) c h);
  --darker: lch(from var(--base) calc(l - 10%) c h);
  
  /* Saturation variations */
  --saturated: lch(from var(--base) l calc(c + 0.1) h);
  --desaturated: lch(from var(--base) l calc(c * 0.8) h);
  
  /* Hue shifts */
  --shifted: lch(from var(--base) l c calc(h + 30));
}
```

### OKLCH Relative Colors

```css
.oklch-examples {
  --base: oklch(60% 0.2 250);
  
  /* Lightness */
  --light: oklch(from var(--base) calc(l + 10%) c h);
  --dark: oklch(from var(--base) calc(l - 10%) c h);
  
  /* Chroma (saturation) */
  --vibrant: oklch(from var(--base) l calc(c + 0.1) h);
  --muted: oklch(from var(--base) l calc(c * 0.5) h);
  
  /* Hue */
  --shifted: oklch(from var(--base) l c calc(h + 30));
}
```

### RGB Relative Colors

```css
.rgb-relative {
  --base: rgb(102, 126, 234);
  
  /* Modify individual channels */
  --more-red: rgb(from var(--base) calc(r + 20) g b);
  --more-green: rgb(from var(--base) r calc(g + 20) b);
  --more-blue: rgb(from var(--base) r g calc(b + 20));
  
  /* Scale all channels */
  --brighter: rgb(from var(--base) calc(r * 1.2) calc(g * 1.2) calc(b * 1.2));
  --darker: rgb(from var(--base) calc(r * 0.8) calc(g * 0.8) calc(b * 0.8));
}
```

### HSL Relative Colors

```css
.hsl-relative {
  --base: hsl(250, 50%, 60%);
  
  /* Modify hue */
  --shifted-hue: hsl(from var(--base) calc(h + 30) s l);
  
  /* Modify saturation */
  --more-saturated: hsl(from var(--base) h calc(s + 20%) l);
  --less-saturated: hsl(from var(--base) h calc(s * 0.7) l);
  
  /* Modify lightness */
  --lighter: hsl(from var(--base) h s calc(l + 10%));
  --darker: hsl(from var(--base) h s calc(l - 10%));
}
```

## Examples

### Theme Generation

Create a complete color scale from a single base color:

```css
.color-scale {
  --base: #667eea;
  
  /* 50-900 scale (like Tailwind) */
  --50: lch(from var(--base) calc(l + 40%) calc(c * 0.3) h);
  --100: lch(from var(--base) calc(l + 30%) calc(c * 0.4) h);
  --200: lch(from var(--base) calc(l + 20%) calc(c * 0.5) h);
  --300: lch(from var(--base) calc(l + 10%) calc(c * 0.6) h);
  --400: lch(from var(--base) calc(l + 5%) calc(c * 0.8) h);
  --500: var(--base); /* Base color */
  --600: lch(from var(--base) calc(l - 5%) calc(c * 0.9) h);
  --700: lch(from var(--base) calc(l - 10%) c h);
  --800: lch(from var(--base) calc(l - 20%) c h);
  --900: lch(from var(--base) calc(l - 30%) c h);
}
```

### Accessible Color Variants

Ensure sufficient contrast for accessibility:

```css
.accessible-colors {
  --primary: #667eea;
  
  /* Ensure sufficient contrast for text */
  --text-on-primary: lch(from var(--primary) calc(l - 50%) c h);
  
  /* Hover state - slightly lighter */
  --primary-hover: lch(from var(--primary) calc(l + 5%) c h);
  
  /* Active state - slightly darker */
  --primary-active: lch(from var(--primary) calc(l - 5%) c h);
  
  /* Disabled state - desaturated and lighter */
  --primary-disabled: lch(from var(--primary) calc(l + 20%) calc(c * 0.3) h);
}
```

### Combined Modifications

Combine multiple modifications:

```css
.combined-examples {
  --base: #667eea;
  
  /* Lighter and more saturated */
  --vibrant-light: lch(from var(--base) calc(l + 15%) calc(c + 0.1) h);
  
  /* Darker and less saturated */
  --muted-dark: lch(from var(--base) calc(l - 15%) calc(c * 0.7) h);
  
  /* Shift hue and adjust lightness */
  --shifted-light: lch(from var(--base) calc(l + 10%) c calc(h + 30));
}
```

## Build-Time vs Runtime

### Build-Time Computation

When the base color is a constant, Bun computes static values at build time:

```css
/* Input */
.build-time {
  --base: #667eea; /* Constant */
  --computed: lch(from var(--base) calc(l + 15%) c h);
}

/* Output (computed by Bun) */
.build-time {
  --base: #667eea;
  --computed: lch(69.32% 58.34 328.37);
}
```

### Runtime Computation

When the base color is a CSS variable, the browser computes it dynamically:

```css
.runtime {
  --base: var(--user-theme-color); /* Variable */
  --computed: lch(from var(--base) calc(l + 15%) c h);
  /* Computed at runtime by the browser */
}
```

## Best Practices

1. **Use LCH/OKLCH for perceptual uniformity** - Better for lightness/saturation adjustments
2. **Use RGB for channel manipulation** - When you need to modify individual RGB channels
3. **Use HSL for hue shifts** - More intuitive for color wheel operations
4. **Prefer build-time computation** - Use constants when possible for better performance
5. **Document your color relationships** - Comment why colors are related

## Related

- [Bun CSS Bundler](./BUN-CSS-BUNDLER.md) - Main CSS bundler documentation
- [CSS Syntax Examples](./CSS-SYNTAX-EXAMPLES.md) - Comprehensive CSS examples
- [Golden CSS Template](./GOLDEN-CSS-TEMPLATE.md) - Elite CSS patterns

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0
