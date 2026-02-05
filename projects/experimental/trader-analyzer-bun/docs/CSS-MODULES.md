# CSS Modules

Bun's bundler supports CSS modules with zero configuration. CSS modules automatically scope class names to prevent collisions.

## Overview

A CSS module is a CSS file (with the `.module.css` extension) where all class names and animations are scoped to the file. This helps you avoid class name collisions as CSS declarations are globally scoped by default.

Under the hood, Bun's bundler transforms locally scoped class names into unique identifiers.

## Features

- ✅ **Automatic detection** - Zero configuration for `.module.css` files
- ✅ **Composition** - `composes` property support
- ✅ **JSX/TSX integration** - Import CSS modules into React/JSX
- ✅ **Type safety** - TypeScript support with type definitions
- ✅ **Warnings/errors** - Invalid usage detection
- ✅ **Scoped classes** - No class name collisions
- ✅ **Unique identifiers** - Automatic class name hashing

## Getting Started

### 1. Create a CSS Module File

Create a file with the `.module.css` extension:

**styles.module.css:**
```css
.button {
  color: red;
  background: #667eea;
  padding: 12px 24px;
  border-radius: 8px;
}
```

**other-styles.module.css:**
```css
.button {
  color: blue;
  background: #3b82f6;
  padding: 12px 24px;
  border-radius: 8px;
}
```

### 2. Import and Use in TSX/JSX

```tsx
import styles from "./styles.module.css";
import otherStyles from "./other-styles.module.css";

export default function App() {
  return (
    <>
      <button className={styles.button}>Red button!</button>
      <button className={otherStyles.button}>Blue button!</button>
    </>
  );
}
```

### 3. Unique Identifiers

Bun transforms locally scoped class names into unique identifiers:

```tsx
import styles from "./styles.module.css";
import otherStyles from "./other-styles.module.css";

console.log(styles);
console.log(otherStyles);
```

**Output:**
```tsx
{
  button: "button_123"
}

{
  button: "button_456"
}
```

Even though both files have a `.button` class, they don't conflict because Bun generates unique identifiers.

## Composition

CSS modules allow you to compose class selectors together. This lets you reuse style rules across multiple classes.

### Basic Composition

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

### Local Composition

```css
/* styles.module.css */
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

**⚠️ Important:** When composing from separate files, ensure they do **not contain the same properties**. Composing classes with conflicting properties results in undefined behavior according to the CSS module specification.

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
  color: red; /* No conflict - base doesn't define color */
  background: #667eea; /* No conflict - base doesn't define background */
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

```css
.button {
  composes: base from "./base.module.css";
  composes: interactive from "./interactive.module.css";
  color: red;
}
```

## Composition Rules

There are important rules to keep in mind when using `composes`:

### Rule 1: `composes` Must Come First

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

### Rule 2: Simple Selector Only

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

You can use multiple `composes` statements, but they must all come before regular properties:

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

## Usage Examples

### Basic Usage

```tsx
import styles from "./styles.module.css";

export function Button() {
  return <button className={styles.button}>Click me</button>;
}
```

### Multiple Classes

```tsx
import styles from "./styles.module.css";

export function Card() {
  return (
    <div className={`${styles.card} ${styles.cardElevated}`}>
      <h2 className={styles.title}>Title</h2>
      <p className={styles.content}>Content</p>
    </div>
  );
}
```

### Conditional Classes

```tsx
import styles from "./styles.module.css";

export function Button({ primary }: { primary: boolean }) {
  return (
    <button
      className={primary ? styles.buttonPrimary : styles.buttonSecondary}
    >
      {primary ? "Primary" : "Secondary"}
    </button>
  );
}
```

### Dynamic Classes

```tsx
import styles from "./styles.module.css";

export function Button({ variant }: { variant: "primary" | "secondary" }) {
  const classMap = {
    primary: styles.buttonPrimary,
    secondary: styles.buttonSecondary,
  };
  
  return <button className={classMap[variant]}>Button</button>;
}
```

### Combining with Global Classes

```tsx
import styles from "./styles.module.css";

export function Card() {
  return (
    <div className={`global-class ${styles.card}`}>
      <h2 className={styles.title}>Title</h2>
    </div>
  );
}
```

## Type Safety

Bun provides TypeScript type definitions for CSS modules:

```tsx
import styles from "./styles.module.css";

// TypeScript knows about available class names
const buttonClass: string = styles.button; // ✅ Valid
// const invalidClass: string = styles.nonexistent; // ❌ Type error
```

## CSS Nesting in Modules

CSS modules support modern CSS features including nesting:

```css
/* styles.module.css */
.card {
  background: var(--color-bg-secondary);
  padding: 25px;
  
  &:hover {
    transform: translateY(-2px);
  }
  
  .title {
    font-size: 1.5em;
    color: var(--color-brand-primary);
  }
  
  .content {
    color: var(--color-text-secondary);
  }
}
```

## Best Practices

1. **Use descriptive file names** - `button.module.css` instead of `styles.module.css`
2. **Keep modules focused** - One component per module file
3. **Use composition** - Reuse styles with `composes`
4. **Leverage type safety** - Let TypeScript catch invalid class names
5. **Combine with modern CSS** - Use nesting, color-mix, etc. in modules

## File Structure

```
styles/
├── components/
│   ├── button.module.css
│   ├── card.module.css
│   └── input.module.css
├── base.module.css
└── themes.module.css
```

## Composition Rules

See [CSS Modules Composition Rules](./CSS-MODULES-COMPOSITION.md) for detailed information about:
- `composes` property placement (must come first)
- Simple selector requirement
- Multiple composition statements
- Common mistakes and best practices

## Related

- [CSS Modules Composition Rules](./CSS-MODULES-COMPOSITION.md) - Detailed composition guide
- [Bun CSS Bundler](./BUN-CSS-BUNDLER.md) - Main CSS bundler documentation
- [CSS Syntax Examples](./CSS-SYNTAX-EXAMPLES.md) - Modern CSS syntax
- [Golden CSS Template](./GOLDEN-CSS-TEMPLATE.md) - Elite CSS patterns

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0
