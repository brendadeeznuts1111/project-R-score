# CSS Fallbacks and Browser Compatibility

Bun's CSS bundler automatically generates vendor-prefixed fallbacks for modern CSS features to ensure compatibility with older browsers.

## :is() Selector Fallbacks

The `:is()` selector is automatically converted to vendor-prefixed fallbacks:

### Input (Modern Syntax)

```css
.article :is(h1, h2, h3) {
  margin-top: 1.5em;
}

:is(header, main, footer) :is(h1, h2, .title) {
  font-family: "Heading Font", sans-serif;
}
```

### Output (Automatic Fallbacks)

Bun's CSS bundler automatically generates:

```css
/* Fallback using -webkit-any */
.article :-webkit-any(h1, h2, h3) {
  margin-top: 1.5em;
}

/* Fallback using -moz-any */
.article :-moz-any(h1, h2, h3) {
  margin-top: 1.5em;
}

/* Original preserved for modern browsers */
.article :is(h1, h2, h3) {
  margin-top: 1.5em;
}

/* Complex example with fallbacks */
:-webkit-any(header, main, footer) :-webkit-any(h1, h2, .title) {
  font-family: "Heading Font", sans-serif;
}

:-moz-any(header, main, footer) :-moz-any(h1, h2, .title) {
  font-family: "Heading Font", sans-serif;
}

:is(header, main, footer) :is(h1, h2, .title) {
  font-family: "Heading Font", sans-serif;
}
```

## Browser Support

### :is() Selector

- **Modern browsers**: Native `:is()` support
- **Safari 9+**: `:-webkit-any()` fallback
- **Firefox 4+**: `:-moz-any()` fallback
- **Chrome 88+**: Native `:is()` support
- **Edge 88+**: Native `:is()` support

### Vendor Prefixes

- `-webkit-any()`: Safari, Chrome (older versions)
- `-moz-any()`: Firefox (older versions)
- `:is()`: Modern browsers (Chrome 88+, Firefox 78+, Safari 14+)

## Other Automatic Fallbacks

### Color Format Conversions

```css
/* Input */
color: rgb(50 100 200);
background: #00aaff80;

/* Output */
color: rgb(50, 100, 200);
background: rgba(0, 170, 255, 0.5);
```

### Logical Properties

```css
/* Input */
padding-block: 1rem;
margin-inline-start: 2rem;

/* Output (for older browsers) */
padding-top: 1rem;
padding-bottom: 1rem;
margin-left: 2rem;
```

### CSS Nesting

```css
/* Input */
.card {
  h2 {
    color: blue;
  }
}

/* Output */
.card h2 {
  color: blue;
}
```

## Manual Fallbacks (Not Recommended)

You don't need to write fallbacks manually - Bun handles this automatically. However, if you need to target specific browsers, you can use:

```css
/* Only if you need explicit control */
.article :-webkit-any(h1, h2, h3) {
  margin-top: 1.5em;
}

.article :-moz-any(h1, h2, h3) {
  margin-top: 1.5em;
}

.article :is(h1, h2, h3) {
  margin-top: 1.5em;
}
```

## Best Practices

1. **Write modern CSS** - Use `:is()`, modern color notation, logical properties
2. **Let Bun handle fallbacks** - Don't write vendor prefixes manually
3. **Test in target browsers** - Verify fallbacks work as expected
4. **Use feature detection** - For critical features, consider progressive enhancement

## Related

- [CSS Syntax Examples](./CSS-SYNTAX-EXAMPLES.md) - Modern CSS syntax
- [Bun CSS Bundler](./BUN-CSS-BUNDLER.md) - CSS bundler documentation
- [Golden CSS Template](./GOLDEN-CSS-TEMPLATE.md) - Elite CSS patterns

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0
