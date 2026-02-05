# :dir() Selector

The `:dir()` pseudo-class selector allows you to style elements based on their text direction (RTL or LTR), providing a powerful way to create direction-aware designs without JavaScript.

For browsers that don't support the `:dir()` selector yet, Bun's CSS bundler converts it to the more widely supported `:lang()` selector with appropriate language mappings.

## Overview

The `:dir()` selector matches elements based on their directionality:
- `:dir(ltr)` - Left-to-right languages
- `:dir(rtl)` - Right-to-left languages

## Basic Usage

**Input:**
```css
/* Apply different styles based on text direction */
.nav-arrow:dir(ltr) {
  transform: rotate(0deg);
}

.nav-arrow:dir(rtl) {
  transform: rotate(180deg);
}

/* Position elements based on text flow */
.sidebar:dir(ltr) {
  border-right: 1px solid #ddd;
}

.sidebar:dir(rtl) {
  border-left: 1px solid #ddd;
}
```

**Output (Converted by Bun):**
```css
/* Converted to use language-based selectors as fallback */
.nav-arrow:lang(en, fr, de, es, it, pt, nl) {
  transform: rotate(0deg);
}

.nav-arrow:lang(ar, he, fa, ur) {
  transform: rotate(180deg);
}

.sidebar:lang(en, fr, de, es, it, pt, nl) {
  border-right: 1px solid #ddd;
}

.sidebar:lang(ar, he, fa, ur) {
  border-left: 1px solid #ddd;
}
```

If multiple arguments to `:lang()` aren't supported, further fallbacks are automatically provided.

## Examples

### Navigation Arrows

```css
.nav-arrow {
  display: inline-block;
  
  :dir(ltr) & {
    transform: rotate(0deg);
  }
  
  :dir(rtl) & {
    transform: rotate(180deg);
  }
}
```

### Borders and Spacing

```css
.card {
  padding-inline-start: 1rem;
  border-inline-start: 4px solid var(--accent);
  
  :dir(rtl) & {
    border-inline-start: none;
    border-inline-end: 4px solid var(--accent);
  }
}
```

### Text Alignment

```css
.content {
  text-align: start;
  
  :dir(ltr) & {
    /* Additional LTR-specific styles */
  }
  
  :dir(rtl) & {
    /* Additional RTL-specific styles */
  }
}
```

### Icons and Symbols

```css
.icon-arrow {
  :dir(ltr) & {
    content: "→";
  }
  
  :dir(rtl) & {
    content: "←";
  }
}
```

## Language Mappings

Bun automatically maps `:dir()` to appropriate languages:

**LTR Languages:**
- en, fr, de, es, it, pt, nl, pl, cs, sk, hu, ro, bg, hr, sr, sl, et, lv, lt, fi, sv, da, no, is, ga, cy, mt, el, ru, uk, be, mk, ka, hy, az, tr, kk, uz, mn, zh, ja, ko, th, vi, id, ms, tl, hi, bn, ta, te, ml, kn, gu, pa, or, as, ne, si, my, km, lo, ka, mn

**RTL Languages:**
- ar, he, fa, ur, yi, ku, ps, sd

## Browser Support

- **Chrome**: 49+
- **Firefox**: 49+
- **Safari**: 10+
- **Edge**: 79+

Bun provides `:lang()` fallbacks for older browsers.

## Best Practices

1. **Use with logical properties** - Combine for complete RTL/LTR support
2. **Test in both directions** - Verify styles work correctly
3. **Use for icons** - Flip arrows and directional icons
4. **Combine with text-align** - Use `start`/`end` with `:dir()`

## Related

- [Logical Properties](./LOGICAL-PROPERTIES.md) - RTL/LTR-aware properties
- [Bun CSS Bundler](./BUN-CSS-BUNDLER.md) - Main CSS bundler documentation

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0
