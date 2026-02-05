# Modern Shorthands

CSS has introduced several modern shorthand properties that improve code readability and maintainability. Bun's CSS bundler ensures these convenient shorthands work on all browsers by converting them to their longhand equivalents when needed.

## Overview

Modern shorthands include:
- `place-items` - Shorthand for align-items and justify-items
- `place-content` - Shorthand for align-content and justify-content
- `place-self` - Shorthand for align-self and justify-self
- Two-value `overflow` - Separate horizontal and vertical overflow
- Enhanced `text-decoration` - Combines multiple properties
- Two-value `display` - Outer and inner display types

## Place Properties

### place-items

**Input:**
```css
.flex-container {
  /* Shorthand for align-items and justify-items */
  place-items: center start;
}
```

**Output (Converted by Bun):**
```css
.flex-container {
  align-items: center;
  justify-items: start;
}
```

### place-content

**Input:**
```css
.grid-container {
  /* Shorthand for align-content and justify-content */
  place-content: space-between center;
}
```

**Output:**
```css
.grid-container {
  align-content: space-between;
  justify-content: center;
}
```

### place-self

**Input:**
```css
.grid-item {
  /* Shorthand for align-self and justify-self */
  place-self: end center;
}
```

**Output:**
```css
.grid-item {
  align-self: end;
  justify-self: center;
}
```

## Two-Value Overflow

**Input:**
```css
.content-box {
  /* First value for horizontal, second for vertical */
  overflow: hidden auto;
}
```

**Output:**
```css
.content-box {
  overflow-x: hidden;
  overflow-y: auto;
}
```

## Enhanced Text Decoration

**Input:**
```css
.fancy-link {
  /* Combines multiple text decoration properties */
  text-decoration: underline dotted blue 2px;
}
```

**Output:**
```css
.fancy-link {
  text-decoration-line: underline;
  text-decoration-style: dotted;
  text-decoration-color: blue;
  text-decoration-thickness: 2px;
}
```

## Two-Value Display

**Input:**
```css
.component {
  /* Outer display type + inner display type */
  display: inline flex;
}
```

**Output:**
```css
.component {
  display: inline-flex;
}
```

## Examples

### Flexbox Layout

```css
.flex-container {
  display: flex;
  place-items: center start;
  place-content: space-between center;
  overflow: hidden auto;
}
```

### Grid Layout

```css
.grid-container {
  display: grid;
  place-items: center start;
  place-content: space-between center;
  
  .grid-item {
    place-self: end center;
  }
}
```

### Text Styling

```css
.link {
  text-decoration: underline wavy var(--accent-cyan) 2px;
  
  &:hover {
    text-decoration: underline solid var(--accent-cyan-dark) 3px;
  }
}
```

## Browser Support

- **place-***: Chrome 59+, Firefox 45+, Safari 11+, Edge 79+
- **Two-value overflow**: Chrome 6+, Firefox 3.5+, Safari 3+, Edge 12+
- **Enhanced text-decoration**: Chrome 87+, Firefox 70+, Safari 12.1+, Edge 87+
- **Two-value display**: Chrome 29+, Firefox 20+, Safari 9+, Edge 12+

Bun automatically converts unsupported shorthands to longhand properties.

## Best Practices

1. **Use modern shorthands** - Cleaner and more maintainable
2. **Let Bun handle conversion** - Don't write longhand manually
3. **Combine with logical properties** - For complete modern CSS
4. **Test in target browsers** - Verify conversion works correctly

## Related

- [Bun CSS Bundler](./BUN-CSS-BUNDLER.md) - Main CSS bundler documentation
- [CSS Syntax Examples](./CSS-SYNTAX-EXAMPLES.md) - Comprehensive CSS examples

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0
