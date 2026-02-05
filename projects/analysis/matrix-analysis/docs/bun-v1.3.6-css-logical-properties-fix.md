# Bun v1.3.6 CSS Logical Properties Fix

## Bug Description

**Issue**: CSS logical properties (e.g., `inset-inline-end`) were being stripped from bundler output when nested rules like pseudo-elements (`&:after`, `&:before`) were present in the same block.

**Fixed in**: Bun v1.3.6

## The Problem

When using CSS nesting with logical properties, the bundler incorrectly removed logical properties if there were nested pseudo-element selectors in the same CSS block.

### Example of Bug (Before Fix)

```css
/* Input CSS with nesting and logical properties */
.card {
  inset-inline-end: 1rem;  /* This was being stripped! */
  position: relative;

  &:after {
    content: "";
    position: absolute;
  }
}
```

**Broken Output (before v1.3.6)**:
```css
.card {
  position: relative;
}
.card:after {
  content: "";
  position: absolute;
}
/* inset-inline-end was lost! */
```

## The Fix

Bun v1.3.6 fixed the CSS parser to properly handle logical properties alongside nested rules with pseudo-elements.

### Correct Output (v1.3.6+)

```css
.card {
  inset-inline-end: 1rem;  /* Now preserved correctly */
  position: relative;
}
.card:after {
  content: "";
  position: absolute;
}
```

## Affected CSS Logical Properties

| Logical Property | Physical Equivalent (LTR) |
|-----------------|---------------------------|
| `inset-inline-start` | `left` |
| `inset-inline-end` | `right` |
| `inset-block-start` | `top` |
| `inset-block-end` | `bottom` |
| `margin-inline-start` | `margin-left` |
| `margin-inline-end` | `margin-right` |
| `padding-inline-start` | `padding-left` |
| `padding-inline-end` | `padding-right` |
| `border-inline-start` | `border-left` |
| `border-inline-end` | `border-right` |

## Test Case

```typescript
// test/css-logical-properties.test.ts
import { test, expect } from "bun:test";

test("CSS logical properties preserved with pseudo-element nesting", async () => {
  const css = `
    .card {
      inset-inline-end: 1rem;
      position: relative;

      &:after {
        content: "";
        position: absolute;
      }
    }
  `;

  const result = await Bun.build({
    entrypoints: ["./dummy.css"],
    outdir: "./dist",
  });

  // Verify logical property is preserved in output
  const output = await Bun.file("./dist/dummy.css").text();
  expect(output).toContain("inset-inline-end");
  expect(output).toContain("1rem");
});
```

## Impact

This fix ensures that:
1. Internationalization (i18n) layouts work correctly
2. RTL (Right-to-Left) language support is preserved
3. CSS bundling doesn't silently drop critical layout properties
4. Nested CSS with pseudo-elements works reliably with logical properties

## Related Documentation

- [Bun CSS Bundler](https://bun.sh/docs/bundler/css)
- [CSS Logical Properties on MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Logical_Properties)

## Upgrade Path

```bash
# Upgrade to Bun v1.3.6+
bun upgrade

# Verify version
bun --version  # Should show 1.3.6 or higher
```
