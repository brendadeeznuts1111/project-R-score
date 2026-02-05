# CSS Nesting

CSS nesting allows you to nest CSS selectors inside other selectors, making your stylesheets more organized and easier to maintain. Bun's CSS bundler automatically flattens nested selectors to ensure browser compatibility.

**Reference:** [Bun CSS Bundler - Nesting](https://bun.com/docs/bundler/css#nesting)

## Overview

CSS nesting lets you write nested selectors that are automatically converted to flat CSS by Bun's bundler. This provides a more intuitive way to organize your styles while maintaining full browser compatibility.

## Basic Nesting

### Element Nesting

Nest element selectors inside class selectors:

```css
.card {
  background: var(--bg-secondary);
  padding: 25px;
  
  h2 {
    color: var(--accent-cyan);
    margin-bottom: 15px;
  }
  
  p {
    color: var(--text-primary);
    line-height: 1.6;
  }
}
```

**Output (Flattened by Bun):**
```css
.card {
  background: var(--bg-secondary);
  padding: 25px;
}

.card h2 {
  color: var(--accent-cyan);
  margin-bottom: 15px;
}

.card p {
  color: var(--text-primary);
  line-height: 1.6;
}
```

### Class Nesting

Nest class selectors:

```css
.card {
  background: var(--bg-secondary);
  
  .card-header {
    padding: 20px;
    border-bottom: 1px solid var(--border-color);
  }
  
  .card-body {
    padding: 20px;
  }
  
  .card-footer {
    padding: 20px;
    border-top: 1px solid var(--border-color);
  }
}
```

## The `&` Selector

The `&` selector represents the parent selector and is essential for pseudo-classes and modifiers.

### Pseudo-classes

```css
.button {
  background: var(--accent-purple);
  color: white;
  
  &:hover {
    background: color-mix(in srgb, var(--accent-purple) 80%, white);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
    background: color-mix(in srgb, var(--accent-purple) 80%, black);
  }
  
  &:focus-visible {
    outline: 2px solid var(--accent-purple);
    outline-offset: 2px;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
```

**Output:**
```css
.button {
  background: var(--accent-purple);
  color: white;
}

.button:hover {
  background: color-mix(in srgb, var(--accent-purple) 80%, white);
  transform: translateY(-1px);
}

.button:active {
  transform: translateY(0);
  background: color-mix(in srgb, var(--accent-purple) 80%, black);
}

.button:focus-visible {
  outline: 2px solid var(--accent-purple);
  outline-offset: 2px;
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Modifier Classes

```css
.button {
  background: var(--accent-purple);
  
  &.primary {
    background: var(--accent-cyan);
  }
  
  &.secondary {
    background: var(--accent-green);
  }
  
  &.large {
    padding: 16px 32px;
    font-size: 1.2em;
  }
  
  &.small {
    padding: 8px 16px;
    font-size: 0.9em;
  }
}
```

**Output:**
```css
.button {
  background: var(--accent-purple);
}

.button.primary {
  background: var(--accent-cyan);
}

.button.secondary {
  background: var(--accent-green);
}

.button.large {
  padding: 16px 32px;
  font-size: 1.2em;
}

.button.small {
  padding: 8px 16px;
  font-size: 0.9em;
}
```

### Combining `&` with Other Selectors

```css
.card {
  background: var(--bg-secondary);
  
  /* Direct child */
  > .card-header {
    padding: 20px;
  }
  
  /* Adjacent sibling */
  + .card {
    margin-top: 20px;
  }
  
  /* General sibling */
  ~ .card {
    margin-left: 20px;
  }
  
  /* Descendant with & */
  & .content {
    padding: 20px;
  }
}
```

## Nested Media Queries

Media queries can be nested inside selectors:

```css
.card {
  padding: 20px;
  
  @media (width >= 768px) {
    padding: 30px;
    
    h2 {
      font-size: 2em;
    }
  }
  
  @media (width >= 1024px) {
    padding: 40px;
    
    .card-body {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
    }
  }
}
```

**Output:**
```css
.card {
  padding: 20px;
}

@media (min-width: 768px) {
  .card {
    padding: 30px;
  }
  
  .card h2 {
    font-size: 2em;
  }
}

@media (min-width: 1024px) {
  .card {
    padding: 40px;
  }
  
  .card .card-body {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }
}
```

## Complex Nesting Examples

### Component with Variants

```css
.alert {
  padding: 16px;
  border-radius: 8px;
  border: 1px solid;
  
  .alert-title {
    font-weight: 700;
    margin-bottom: 8px;
  }
  
  .alert-content {
    color: var(--text-secondary);
  }
  
  /* Variants */
  &.alert-success {
    background: color-mix(in srgb, var(--color-success) 10%, transparent);
    border-color: var(--color-success);
    color: var(--color-success);
    
    .alert-title {
      color: var(--color-success);
    }
  }
  
  &.alert-warning {
    background: color-mix(in srgb, var(--color-warning) 10%, transparent);
    border-color: var(--color-warning);
    color: var(--color-warning);
  }
  
  &.alert-error {
    background: color-mix(in srgb, var(--color-error) 10%, transparent);
    border-color: var(--color-error);
    color: var(--color-error);
  }
  
  /* Responsive */
  @media (width >= 768px) {
    padding: 20px;
    
    .alert-title {
      font-size: 1.25em;
    }
  }
}
```

### Form Elements

```css
.form-group {
  margin-bottom: 20px;
  
  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  input,
  textarea,
  select {
    width: 100%;
    padding: 10px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    
    &:focus {
      outline: none;
      border-color: var(--accent-cyan);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-cyan) 20%, transparent);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
  
  .error-message {
    color: var(--color-error);
    font-size: 0.875em;
    margin-top: 4px;
  }
  
  &.has-error {
    input,
    textarea,
    select {
      border-color: var(--color-error);
    }
  }
}
```

## Nesting in CSS Modules

CSS nesting works perfectly with CSS modules:

```css
/* button.module.css */
.button {
  padding: 12px 24px;
  border-radius: 8px;
  background: var(--accent-purple);
  
  &:hover {
    background: color-mix(in srgb, var(--accent-purple) 80%, white);
  }
  
  .icon {
    margin-right: 8px;
  }
  
  &.loading {
    opacity: 0.6;
    cursor: wait;
    
    .icon {
      animation: spin 1s linear infinite;
    }
  }
}
```

## Best Practices

1. **Use nesting for related styles** - Group styles that belong together
2. **Don't nest too deeply** - Keep nesting levels reasonable (2-3 levels max)
3. **Use `&` for pseudo-classes** - Always use `&` for `:hover`, `:focus`, etc.
4. **Nest media queries** - Keep responsive styles close to their base styles
5. **Combine with modern CSS** - Use nesting with color-mix, logical properties, etc.

## Common Patterns

### BEM-like Structure

```css
.card {
  background: var(--bg-secondary);
  
  &__header {
    padding: 20px;
  }
  
  &__body {
    padding: 20px;
  }
  
  &__footer {
    padding: 20px;
  }
  
  &--elevated {
    box-shadow: var(--shadow-lg);
  }
  
  &--bordered {
    border: 2px solid var(--border-color);
  }
}
```

### State Management

```css
.component {
  opacity: 1;
  transition: opacity 0.2s;
  
  &.hidden {
    opacity: 0;
    pointer-events: none;
  }
  
  &.loading {
    opacity: 0.6;
    cursor: wait;
  }
  
  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
```

## Browser Compatibility

Bun's CSS bundler automatically flattens nested selectors, ensuring compatibility with all browsers. You can write modern nested CSS without worrying about browser support.

## Related

- [Bun CSS Bundler](./BUN-CSS-BUNDLER.md) - Main CSS bundler documentation
- [CSS Syntax Examples](./CSS-SYNTAX-EXAMPLES.md) - Comprehensive CSS examples
- [Golden CSS Template](./GOLDEN-CSS-TEMPLATE.md) - Elite CSS patterns
- [Bun CSS Nesting Docs](https://bun.com/docs/bundler/css#nesting) - Official Bun documentation

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0
