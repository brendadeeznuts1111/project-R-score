# light-dark() Color Function

The `light-dark()` function provides an elegant solution for implementing color schemes that respect the user's system preference without requiring complex media queries.

For browsers that don't support this feature yet, Bun's CSS bundler converts it to use CSS variables with proper fallbacks.

## Overview

The `light-dark()` function accepts two color values and automatically selects the appropriate one based on the current color scheme context:
- First value: Used in light mode
- Second value: Used in dark mode

## Basic Usage

**Input:**
```css
:root {
  /* Define color scheme support */
  color-scheme: light dark;
}

.themed-component {
  /* Automatically picks the right color based on system preference */
  background-color: light-dark(#ffffff, #121212);
  color: light-dark(#333333, #eeeeee);
  border-color: light-dark(#dddddd, #555555);
}

/* Override system preference when needed */
.light-theme {
  color-scheme: light;
}

.dark-theme {
  color-scheme: dark;
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

.light-theme {
  --lightningcss-light: initial;
  --lightningcss-dark: ;
  color-scheme: light;
}

.dark-theme {
  --lightningcss-light: ;
  --lightningcss-dark: initial;
  color-scheme: dark;
}

.themed-component {
  background-color: var(--lightningcss-light, #ffffff) var(--lightningcss-dark, #121212);
  color: var(--lightningcss-light, #333333) var(--lightningcss-dark, #eeeeee);
  border-color: var(--lightningcss-light, #dddddd) var(--lightningcss-dark, #555555);
}
```

## Examples

### Basic Theme Support

```css
:root {
  color-scheme: light dark;
}

body {
  background-color: light-dark(#ffffff, #0a0e27);
  color: light-dark(#333333, #e0e0e0);
}

.card {
  background-color: light-dark(#f5f5f5, #1a1f3a);
  border-color: light-dark(#dddddd, #333355);
}
```

### Component Themes

```css
.button {
  background-color: light-dark(#667eea, #5568d3);
  color: light-dark(white, white);
  
  &:hover {
    background-color: light-dark(#5568d3, #4457c2);
  }
}
```

### Override Themes

```css
/* Force light theme */
.light-theme {
  color-scheme: light;
  
  .card {
    background-color: #ffffff;
    color: #333333;
  }
}

/* Force dark theme */
.dark-theme {
  color-scheme: dark;
  
  .card {
    background-color: #121212;
    color: #eeeeee;
  }
}
```

## Use Cases

- **System preference** - Automatically respect user's OS theme
- **Theme switching** - Easy light/dark mode implementation
- **Component theming** - Consistent theme across components
- **Accessibility** - Support user preferences

## Browser Support

- **Chrome**: 123+
- **Firefox**: 120+
- **Safari**: 17.0+
- **Edge**: 123+

Bun automatically provides CSS variable fallbacks for older browsers.

## Best Practices

1. **Set color-scheme** - Always define `color-scheme: light dark`
2. **Use consistently** - Apply throughout your design system
3. **Test both modes** - Verify colors work in light and dark
4. **Provide overrides** - Allow manual theme switching

## Related

- [Bun CSS Bundler](./BUN-CSS-BUNDLER.md) - Main CSS bundler documentation
- [CSS Syntax Examples](./CSS-SYNTAX-EXAMPLES.md) - Comprehensive CSS examples

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0
