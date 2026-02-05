# Logical Properties

CSS logical properties let you define layout, spacing, and sizing relative to the document's writing mode and text direction rather than physical screen directions. This is crucial for creating truly international layouts that automatically adapt to different writing systems.

For browsers that don't fully support logical properties, Bun's CSS bundler compiles them to physical properties with appropriate directional adjustments.

## Overview

Logical properties adapt to:
- **Writing mode** - horizontal-tb, vertical-rl, vertical-lr
- **Text direction** - left-to-right (LTR), right-to-left (RTL)

## Basic Usage

**Input:**
```css
.multilingual-component {
  /* Margin that adapts to writing direction */
  margin-inline-start: 1rem;

  /* Padding that makes sense regardless of text direction */
  padding-block: 1rem 2rem;

  /* Border radius for the starting corner */
  border-start-start-radius: 4px;

  /* Size that respects the writing mode */
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

If the `:dir()` selector isn't supported, additional fallbacks are automatically generated.

## Logical Property Mappings

### Block Axis (Top/Bottom)

```css
.element {
  margin-block: 1rem;
  padding-block: 1rem 2rem;
  border-block: 1px solid;
  border-block-start: 2px solid;
  border-block-end: 1px solid;
}
```

**Converts to:**
```css
.element {
  margin-top: 1rem;
  margin-bottom: 1rem;
  padding-top: 1rem;
  padding-bottom: 2rem;
  border-top: 1px solid;
  border-bottom: 1px solid;
  border-top: 2px solid;
  border-bottom: 1px solid;
}
```

### Inline Axis (Left/Right)

```css
.element {
  margin-inline: 1rem;
  padding-inline: 1rem 2rem;
  border-inline: 1px solid;
  margin-inline-start: 2rem;
  margin-inline-end: 1rem;
}
```

**Converts to:**
```css
.element:dir(ltr) {
  margin-left: 1rem;
  margin-right: 1rem;
  padding-left: 1rem;
  padding-right: 2rem;
  border-left: 1px solid;
  border-right: 1px solid;
  margin-left: 2rem;
  margin-right: 1rem;
}

.element:dir(rtl) {
  margin-right: 1rem;
  margin-left: 1rem;
  padding-right: 1rem;
  padding-left: 2rem;
  border-right: 1px solid;
  border-left: 1px solid;
  margin-right: 2rem;
  margin-left: 1rem;
}
```

### Size Properties

```css
.element {
  inline-size: 80%;
  block-size: auto;
  min-inline-size: 300px;
  max-block-size: 100vh;
}
```

**Converts to:**
```css
.element {
  width: 80%;
  height: auto;
  min-width: 300px;
  max-height: 100vh;
}
```

### Border Radius

```css
.element {
  border-start-start-radius: 4px;
  border-start-end-radius: 8px;
  border-end-start-radius: 8px;
  border-end-end-radius: 4px;
}
```

**Converts to:**
```css
.element:dir(ltr) {
  border-top-left-radius: 4px;
  border-top-right-radius: 8px;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 4px;
}

.element:dir(rtl) {
  border-top-right-radius: 4px;
  border-top-left-radius: 8px;
  border-bottom-right-radius: 8px;
  border-bottom-left-radius: 4px;
}
```

## Use Cases

### International Layouts

```css
.card {
  padding-inline: 2rem;
  margin-inline-start: 1rem;
  border-inline-start: 4px solid var(--accent);
  text-align: start; /* Logical text-align */
}
```

### Responsive Design

```css
.container {
  inline-size: 100%;
  max-inline-size: 1200px;
  margin-inline: auto;
  padding-inline: clamp(1rem, 5vw, 3rem);
}
```

### Form Elements

```css
.form-group {
  margin-block-end: 1.5rem;
  
  label {
    display: block;
    margin-block-end: 0.5rem;
  }
  
  input {
    inline-size: 100%;
    padding-inline: 1rem;
    padding-block: 0.75rem;
  }
}
```

## Best Practices

1. **Use logical properties** - For all new code, prefer logical over physical
2. **Combine with :dir()** - For explicit RTL/LTR handling
3. **Test in both directions** - Verify layouts work in LTR and RTL
4. **Use text-align: start/end** - Instead of left/right

## Browser Support

- **Chrome**: 69+
- **Firefox**: 66+
- **Safari**: 12.1+
- **Edge**: 79+

Bun automatically provides fallbacks for older browsers using `:dir()` selectors and language-based fallbacks.

## Related

- [:dir() Selector](./DIR-SELECTOR.md) - Direction-aware selectors
- [Bun CSS Bundler](./BUN-CSS-BUNDLER.md) - Main CSS bundler documentation

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0
