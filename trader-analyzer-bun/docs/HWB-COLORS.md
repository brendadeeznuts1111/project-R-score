# HWB Colors

The HWB (Hue, Whiteness, Blackness) color model provides an intuitive way to express colors based on how much white or black is mixed with a pure hue. Many designers find this approach more natural for creating color variations compared to manipulating RGB or HSL values.

Bun's CSS bundler automatically converts HWB colors to RGB for compatibility with all browsers.

## Overview

HWB is more intuitive than RGB or HSL for creating tints and shades:
- **Hue** - The base color (0-360deg)
- **Whiteness** - Amount of white mixed in (0-100%)
- **Blackness** - Amount of black mixed in (0-100%)

## Basic Usage

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

## Creating Color Variations

### Tints (Adding White)

```css
.tints {
  --base: hwb(180 0% 0%);
  --tint-10: hwb(180 10% 0%);
  --tint-20: hwb(180 20% 0%);
  --tint-30: hwb(180 30% 0%);
  --tint-50: hwb(180 50% 0%);
}
```

### Shades (Adding Black)

```css
.shades {
  --base: hwb(180 0% 0%);
  --shade-10: hwb(180 0% 10%);
  --shade-20: hwb(180 0% 20%);
  --shade-30: hwb(180 0% 30%);
  --shade-50: hwb(180 0% 50%);
}
```

### Tones (Adding Both White and Black)

```css
.tones {
  --base: hwb(180 0% 0%);
  --tone-light: hwb(180 20% 10%);
  --tone-medium: hwb(180 10% 20%);
  --tone-dark: hwb(180 5% 30%);
  --muted: hwb(180 30% 20%);
}
```

## Design System Example

HWB makes it easy to create systematic color variations:

```css
.color-system {
  /* Base colors */
  --primary: hwb(250 0% 0%);
  --secondary: hwb(180 0% 0%);
  --accent: hwb(30 0% 0%);
  
  /* Light variants (tints) */
  --primary-light: hwb(250 20% 0%);
  --secondary-light: hwb(180 20% 0%);
  --accent-light: hwb(30 20% 0%);
  
  /* Dark variants (shades) */
  --primary-dark: hwb(250 0% 30%);
  --secondary-dark: hwb(180 0% 30%);
  --accent-dark: hwb(30 0% 30%);
  
  /* Muted variants (tones) */
  --primary-muted: hwb(250 15% 15%);
  --secondary-muted: hwb(180 15% 15%);
  --accent-muted: hwb(30 15% 15%);
}
```

## Advantages Over RGB/HSL

1. **More intuitive** - "Add 20% white" is clearer than manipulating RGB values
2. **Systematic variations** - Easy to create consistent tints and shades
3. **Designer-friendly** - Matches how designers think about color
4. **Consistent results** - Same whiteness/blackness values produce consistent results

## Use Cases

- **Design systems** - Create consistent color scales
- **Theme generation** - Easy to create light/dark variants
- **Accessible colors** - Control contrast by adjusting blackness
- **UI components** - Create hover/active states systematically

## Browser Support

HWB is converted to RGB by Bun, so it works in all browsers:
- ✅ All modern browsers (via RGB conversion)
- ✅ Older browsers (via RGB conversion)

## Best Practices

1. **Use for color scales** - Perfect for creating systematic variations
2. **Combine with CSS variables** - Create dynamic themes
3. **Document your system** - Explain whiteness/blackness percentages
4. **Test accessibility** - Ensure sufficient contrast

## Related

- [Bun CSS Bundler](./BUN-CSS-BUNDLER.md) - Main CSS bundler documentation
- [CSS Syntax Examples](./CSS-SYNTAX-EXAMPLES.md) - Comprehensive CSS examples

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0
