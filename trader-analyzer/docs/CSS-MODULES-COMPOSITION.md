# CSS Modules Composition Rules

CSS modules allow you to compose class selectors together using the `composes` property. This lets you reuse style rules across multiple classes.

## Basic Example

```css
/* styles.module.css */
.button {
  composes: background;
  color: red;
}

.background {
  background-color: blue;
}
```

This is equivalent to:

```css
.button {
  background-color: blue;
  color: red;
}

.background {
  background-color: blue;
}
```

## Composition Rules

There are **three critical rules** to follow when using `composes`:

### Rule 1: `composes` Must Come First ⚠️

The `composes` property **must come before** any regular CSS properties or declarations.

**✅ Correct:**
```css
.button {
  composes: base;
  color: red;
  background: #667eea;
  padding: 12px;
}
```

**❌ Incorrect:**
```css
.button {
  color: red;
  composes: base; /* Error: composes must come first */
  background: #667eea;
}
```

### Rule 2: Simple Selector Only ⚠️

You can **only use `composes` on a simple selector** with a single class name.

**✅ Correct:**
```css
.button {
  composes: base;
  color: red;
}

.button:hover {
  background: #667eea;
}
```

**❌ Incorrect:**

```css
/* Cannot use composes on ID selectors */
#button {
  composes: background; /* Error: #button is not a class selector */
}

/* Cannot use composes on multiple selectors (comma-separated) */
.button,
.button-secondary {
  composes: background; /* Error: not a simple selector */
}

/* Cannot use composes on pseudo-classes */
.button:hover {
  composes: base; /* Error: not a simple selector */
  color: red;
}

/* Cannot use composes on complex selectors */
.button.active {
  composes: base; /* Error: not a simple selector */
  color: red;
}

/* Cannot use composes on element selectors */
div.button {
  composes: base; /* Error: not a simple class selector */
  color: red;
}
```

### Rule 3: Multiple `composes` Statements

You can use multiple `composes` statements, but they **must all come before** regular properties:

**✅ Correct:**
```css
.button {
  composes: base;
  composes: interactive;
  composes: rounded from "./utils.module.css";
  color: red;
  background: #667eea;
}
```

**❌ Incorrect:**
```css
.button {
  composes: base;
  color: red;
  composes: interactive; /* Error: composes must come before regular properties */
  background: #667eea;
}
```

## Composition Types

### Local Composition

Compose classes from the same file:

```css
.base {
  padding: 1rem;
  border-radius: 8px;
}

.button {
  composes: base;
  color: red;
  background: #667eea;
}
```

### External Composition

Compose classes from other module files:

```css
/* background.module.css */
.background {
  background-color: blue;
}

/* styles.module.css */
.button {
  composes: background from "./background.module.css";
  color: red;
}
```

**⚠️ Important Warning:** When composing classes from separate files, ensure they do **not contain the same properties**. The CSS module spec says that composing classes from separate files with conflicting properties is undefined behavior, meaning that the output may differ and be unreliable.

**✅ Correct (No Conflicts):**
```css
/* base.module.css */
.base {
  padding: 1rem;
  border-radius: 8px;
}

/* styles.module.css */
.button {
  composes: base from "./base.module.css";
  color: red;
  background: #667eea;
}
```

**❌ Incorrect (Conflicting Properties):**
```css
/* base.module.css */
.base {
  padding: 1rem;
  background-color: blue; /* Conflict! */
}

/* styles.module.css */
.button {
  composes: base from "./base.module.css";
  background-color: #667eea; /* Conflict! Undefined behavior */
  color: red;
}
```

### Multiple Compositions

Compose multiple classes:

```css
.button {
  composes: base;
  composes: interactive;
  composes: rounded from "./utils.module.css";
  color: red;
}
```

## Common Mistakes

### Mistake 1: `composes` After Properties

```css
/* ❌ Wrong */
.button {
  color: red;
  composes: base;
}

/* ✅ Correct */
.button {
  composes: base;
  color: red;
}
```

### Mistake 2: `composes` on Pseudo-classes

```css
/* ❌ Wrong */
.button:hover {
  composes: base;
}

/* ✅ Correct */
.button {
  composes: base;
}

.button:hover {
  background: #667eea;
}
```

### Mistake 3: `composes` on ID Selectors

```css
/* ❌ Wrong */
#button {
  composes: base;
}

/* ✅ Correct */
.button {
  composes: base;
}
```

### Mistake 4: `composes` on Multiple Selectors

```css
/* ❌ Wrong */
.button,
.button-secondary {
  composes: base;
}

/* ✅ Correct */
.button {
  composes: base;
}

.button-secondary {
  composes: base;
  /* Additional styles */
}
```

### Mistake 5: `composes` on Complex Selectors

```css
/* ❌ Wrong */
.button.active {
  composes: base;
}

/* ✅ Correct */
.button {
  composes: base;
}

.button.active {
  background: #667eea;
}
```

## External Composition Warnings

### ⚠️ Conflicting Properties

When composing from separate files, **avoid conflicting properties**. The CSS module specification states that composing classes with conflicting properties results in undefined behavior.

**❌ Avoid This:**
```css
/* base.module.css */
.base {
  padding: 1rem;
  background-color: blue;
  color: white;
}

/* styles.module.css */
.button {
  composes: base from "./base.module.css";
  background-color: #667eea; /* Conflict with base.module.css */
  color: red; /* Conflict with base.module.css */
}
```

**✅ Do This Instead:**
```css
/* base.module.css */
.base {
  padding: 1rem;
  border-radius: 8px;
  font-weight: 600;
}

/* styles.module.css */
.button {
  composes: base from "./base.module.css";
  background-color: #667eea; /* No conflict - base doesn't define this */
  color: red; /* No conflict - base doesn't define this */
}
```

### Best Practices for External Composition

1. **Separate concerns** - Use external composition for base styles (padding, border-radius, etc.)
2. **Avoid property overlap** - Don't define the same properties in both files
3. **Use local composition for variants** - Compose variants locally when you need to override properties
4. **Document dependencies** - Comment which properties come from composed classes

## Best Practices

1. **Always put `composes` first** - Make it a habit to write `composes` before any other properties
2. **Use simple class names** - Only use `composes` on simple `.class` selectors
3. **Group compositions** - Put all `composes` statements together at the top
4. **Use descriptive names** - Name composed classes clearly (e.g., `base`, `interactive`, `rounded`)
5. **Document compositions** - Add comments explaining why classes are composed
6. **Avoid property conflicts** - Don't define the same properties in composed classes from separate files
7. **Separate concerns** - Use external composition for base styles, local composition for variants

## Example: Complete Component

```css
/* button.module.css */

/* Base styles */
.base {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s;
}

/* Interactive styles */
.interactive {
  cursor: pointer;
}

.interactive:hover {
  transform: translateY(-1px);
}

.interactive:active {
  transform: translateY(0);
}

/* Button component - composes must come first */
.button {
  composes: base;
  composes: interactive;
  color: white;
  background: #667eea;
}

.button:hover {
  background: #5568d3;
}
```

## Related

- [CSS Modules](./CSS-MODULES.md) - Complete CSS modules guide
- [Bun CSS Bundler](./BUN-CSS-BUNDLER.md) - Main CSS bundler documentation

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0
