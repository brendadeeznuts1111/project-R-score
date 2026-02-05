# Double Position Gradients

The double position gradient syntax is a modern CSS feature that allows you to create hard color stops in gradients by specifying the same color at two adjacent positions. This creates a sharp transition rather than a smooth fade, which is useful for creating stripes, color bands, and other multi-color designs.

For browsers that don't support this syntax, Bun's CSS bundler automatically converts it to the traditional format by duplicating color stops.

## Overview

Double position gradients create hard stops:
- **Single position**: `red 50%` - Smooth transition
- **Double position**: `red 30% 70%` - Hard stop (no transition)

## Basic Usage

**Input:**
```css
.striped-background {
  /* Creates a sharp transition from green to red at 30%-40% */
  background: linear-gradient(
    to right,
    yellow 0%,
    green 20%,
    green 30%,
    red 30%,
    /* Double position creates hard stop */ red 70%,
    blue 70%,
    blue 100%
  );
}

.progress-bar {
  /* Creates distinct color sections */
  background: linear-gradient(
    to right,
    #4caf50 0% 25%,
    /* Green from 0% to 25% */ #ffc107 25% 50%,
    /* Yellow from 25% to 50% */ #2196f3 50% 75%,
    /* Blue from 50% to 75% */ #9c27b0 75% 100% /* Purple from 75% to 100% */
  );
}
```

**Output (Converted by Bun):**
```css
.striped-background {
  background: linear-gradient(
    to right,
    yellow 0%,
    green 20%,
    green 30%,
    red 30%,
    /* Split into two color stops */ red 70%,
    blue 70%,
    blue 100%
  );
}

.progress-bar {
  background: linear-gradient(
    to right,
    #4caf50 0%,
    #4caf50 25%,
    /* Two stops for green section */ #ffc107 25%,
    #ffc107 50%,
    /* Two stops for yellow section */ #2196f3 50%,
    #2196f3 75%,
    /* Two stops for blue section */ #9c27b0 75%,
    #9c27b0 100% /* Two stops for purple section */
  );
}
```

## Examples

### Striped Patterns

```css
.stripes {
  background: linear-gradient(
    to right,
    #4caf50 0% 25%,
    #ffc107 25% 50%,
    #2196f3 50% 75%,
    #9c27b0 75% 100%
  );
}
```

### Progress Bars

```css
.progress-bar {
  background: linear-gradient(
    to right,
    var(--color-success) 0% 25%,
    var(--color-warning) 25% 50%,
    var(--color-info) 50% 75%,
    var(--color-error) 75% 100%
  );
}
```

### Color Bands

```css
.color-bands {
  background: linear-gradient(
    to bottom,
    #ff0000 0% 20%,
    #ff7f00 20% 40%,
    #ffff00 40% 60%,
    #00ff00 60% 80%,
    #0000ff 80% 100%
  );
}
```

### Hard Stops in Radial Gradients

```css
.radial-hard-stop {
  background: radial-gradient(
    circle,
    #ffffff 0% 30%,
    #667eea 30% 60%,
    #764ba2 60% 100%
  );
}
```

## Use Cases

- **Progress indicators** - Distinct color sections
- **Status bars** - Clear visual separation
- **Striped backgrounds** - Decorative patterns
- **Color coding** - Visual categorization
- **Data visualization** - Chart backgrounds

## Browser Support

- **Chrome**: 65+
- **Firefox**: 55+
- **Safari**: 12.1+
- **Edge**: 79+

Bun automatically converts to traditional format for older browsers.

## Best Practices

1. **Use for hard stops** - When you need sharp transitions
2. **Combine with CSS variables** - For dynamic color bands
3. **Test visual appearance** - Verify hard stops render correctly
4. **Document color meanings** - Explain what each section represents

## Related

- [Bun CSS Bundler](./BUN-CSS-BUNDLER.md) - Main CSS bundler documentation
- [CSS Syntax Examples](./CSS-SYNTAX-EXAMPLES.md) - Comprehensive CSS examples

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0
