# :not() Selector

The `:not()` pseudo-class allows you to exclude elements that match a specific selector. The modern version of this selector accepts multiple arguments, letting you exclude multiple patterns with a single, concise selector.

For browsers that don't support multiple arguments in `:not()`, Bun's CSS bundler converts this syntax to a more compatible form while preserving the same behavior.

## Overview

The `:not()` selector excludes matching elements:
- Single argument: `:not(.disabled)`
- Multiple arguments: `:not(.disabled, .hidden)`

## Basic Usage

**Input:**
```css
/* Select all buttons except primary and secondary variants */
button:not(.primary, .secondary) {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
}

/* Apply styles to all headings except those inside sidebars or footers */
h2:not(.sidebar *, footer *) {
  margin-top: 2em;
}
```

**Output (Converted by Bun):**
```css
/* Converted to use :not with :is() for compatibility */
button:not(:is(.primary, .secondary)) {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
}

h2:not(:is(.sidebar *, footer *)) {
  margin-top: 2em;
}
```

And if `:is()` isn't supported, Bun can generate further fallbacks:

```css
/* Even more fallbacks for maximum compatibility */
button:not(:-webkit-any(.primary, .secondary)) {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
}

button:not(:-moz-any(.primary, .secondary)) {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
}

button:not(:is(.primary, .secondary)) {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
}
```

## Examples

### Excluding Multiple Classes

```css
.card:not(.disabled, .hidden, .loading) {
  opacity: 1;
  pointer-events: auto;
}

.button:not(:disabled, .loading) {
  cursor: pointer;
}
```

### Excluding Pseudo-classes

```css
.input:not(:disabled, :read-only) {
  border-color: var(--accent-cyan);
}

.link:not(:visited, :active) {
  color: var(--accent-purple);
}
```

### Complex Exclusions

```css
/* All headings except h1 and h2 */
:not(h1, h2) {
  font-weight: 400;
}

/* All elements except those with specific classes */
*:not(.skip-link, .sr-only) {
  /* Styles */
}
```

### Combining with :is()

```css
/* All cards and panels except disabled ones */
:is(.card, .panel):not(.disabled, .hidden) {
  transition: transform 0.2s;
}
```

## Browser Support

- **Single argument**: All browsers
- **Multiple arguments**: Chrome 88+, Firefox 84+, Safari 9+, Edge 88+

Bun automatically converts multiple arguments to `:not(:is(...))` for compatibility.

## Best Practices

1. **Use for exclusions** - Clear intent when excluding elements
2. **Combine with :is()** - For complex selector groups
3. **Avoid overuse** - Can make selectors harder to read
4. **Test specificity** - Ensure correct cascade behavior

## Related

- [:is() Selector](./CSS-FALLBACKS.md#is-selector) - Selector grouping
- [Bun CSS Bundler](./BUN-CSS-BUNDLER.md) - Main CSS bundler documentation

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0
