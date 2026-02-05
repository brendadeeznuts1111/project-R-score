# Bun 1.3 HTML Tag Integration Guide

## Overview

Bun 1.3+ introduces native HTML tag support via the `html` tagged template literal, providing automatic XSS protection, type safety, and improved developer experience for HTML generation.

**Note**: As of Bun 1.3.3, native `html` tag support is not yet available. This codebase uses a polyfill (`src/utils/html-tag-polyfill.ts`) that provides the same XSS protection. When Bun adds native support, the polyfill will automatically detect and use the native implementation.

## Getting Started

### Basic Usage

```typescript
import { html } from "../src/utils/html-tag-polyfill";
// Or when Bun adds native support:
// import { html } from "bun";

const name = "World";
const htmlContent = html`
  <!DOCTYPE html>
  <html>
    <body>
      <h1>Hello, ${name}!</h1>
    </body>
  </html>
`;

// Returns a Response-like object that can be used with Hono
return c.html(htmlContent);
```

### Key Features

1. **Automatic XSS Protection**: All interpolated values are automatically escaped
2. **Type Safety**: TypeScript provides type checking for HTML templates
3. **Performance**: Optimized HTML generation with minimal overhead
4. **Hono Integration**: Works seamlessly with Hono's `c.html()` method

## Migration from Template Strings

### Before (Template String)

```typescript
function generateHTML(data: ScanData): string {
  return `<!DOCTYPE html>
<html>
  <body>
    <h1>${data.title}</h1>
    <p>Total: ${data.total}</p>
  </body>
</html>`;
}
```

**Issues:**
- No XSS protection (user input could inject malicious scripts)
- No type safety
- Manual string concatenation
- No syntax highlighting for HTML

### After (HTML Tag)

```typescript
import { html } from "../src/utils/html-tag-polyfill";
// Or when Bun adds native support:
// import { html } from "bun";

function generateHTML(data: ScanData) {
  return html`
    <!DOCTYPE html>
    <html>
      <body>
        <h1>${data.title}</h1>
        <p>Total: ${data.total}</p>
      </body>
    </html>
  `;
}
```

**Benefits:**
- ✅ Automatic XSS escaping
- ✅ Type safety
- ✅ Better syntax highlighting
- ✅ Cleaner code

## Integration with Hono Routes

### Basic Route Handler

```typescript
import { Hono } from "hono";
import { html } from "bun";

const app = new Hono();

app.get("/dashboard", async (c) => {
  const data = await loadDashboardData();
  
  const htmlContent = html`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Dashboard</title>
      </head>
      <body>
        <h1>Welcome, ${data.user.name}!</h1>
        <div>Total items: ${data.total}</div>
      </body>
    </html>
  `;
  
  return c.html(htmlContent);
});
```

### Dynamic Content

```typescript
app.get("/tags", async (c) => {
  const tags = await loadTags();
  
  const htmlContent = html`
    <!DOCTYPE html>
    <html>
      <body>
        <ul>
          ${tags.map(tag => html`<li>${tag.name}</li>`)}
        </ul>
      </body>
    </html>
  `;
  
  return c.html(htmlContent);
});
```

### Nested HTML Templates

```typescript
function renderCard(title: string, content: string) {
  return html`
    <div class="card">
      <h2>${title}</h2>
      <p>${content}</p>
    </div>
  `;
}

app.get("/cards", async (c) => {
  const cards = [
    { title: "Card 1", content: "Content 1" },
    { title: "Card 2", content: "Content 2" },
  ];
  
  const htmlContent = html`
    <!DOCTYPE html>
    <html>
      <body>
        ${cards.map(card => renderCard(card.title, card.content))}
      </body>
    </html>
  `;
  
  return c.html(htmlContent);
});
```

## Security Benefits

### XSS Prevention

The `html` tag automatically escapes all interpolated values, preventing XSS attacks:

```typescript
const userInput = '<script>alert("XSS")</script>';

// Template string (VULNERABLE)
const unsafe = `<div>${userInput}</div>`;
// Result: <div><script>alert("XSS")</script></div> (EXECUTES!)

// HTML tag (SAFE)
const safe = html`<div>${userInput}</div>`;
// Result: <div>&lt;script&gt;alert("XSS")&lt;/script&gt;</div> (ESCAPED)
```

### Safe Attribute Interpolation

Attributes are also automatically escaped:

```typescript
const className = 'class" onclick="alert(1)';

// Safe
const safe = html`<div class="${className}">Content</div>`;
// Result: <div class="class&quot; onclick=&quot;alert(1)">Content</div>
```

## Performance Considerations

### Benchmarking

The `html` tag is optimized for performance:

- **Memory**: Minimal memory overhead compared to string concatenation
- **Speed**: Fast HTML generation with efficient escaping
- **Large Documents**: Handles large HTML documents efficiently

### Best Practices

1. **Reuse Templates**: Create reusable template functions
2. **Minimize Interpolation**: Reduce the number of interpolated values when possible
3. **Cache Static Content**: Cache HTML templates that don't change frequently

```typescript
// Good: Reusable template
function renderStatCard(label: string, value: number) {
  return html`
    <div class="stat-card">
      <div class="stat-label">${label}</div>
      <div class="stat-value">${value}</div>
    </div>
  `;
}

// Usage
const stats = html`
  <div class="stats-grid">
    ${renderStatCard("Total", 100)}
    ${renderStatCard("Valid", 95)}
  </div>
`;
```

## Type Safety

### TypeScript Support

The `html` tag provides type checking:

```typescript
interface DashboardData {
  title: string;
  total: number;
}

function generateHTML(data: DashboardData) {
  return html`
    <h1>${data.title}</h1>
    <p>Total: ${data.total}</p>
    <!-- TypeScript will error if data properties don't match -->
  `;
}
```

### Type Definitions

If needed, you can create custom type definitions:

```typescript
// types/html.d.ts
declare module "bun" {
  export function html(
    strings: TemplateStringsArray,
    ...values: any[]
  ): string;
}
```

## Common Patterns

### Conditional Rendering

```typescript
const showError = true;
const error = "Something went wrong";

const htmlContent = html`
  <div>
    ${showError ? html`<div class="error">${error}</div>` : ""}
    <div class="content">Main content</div>
  </div>
`;
```

### Loops and Lists

```typescript
const items = ["Item 1", "Item 2", "Item 3"];

const htmlContent = html`
  <ul>
    ${items.map(item => html`<li>${item}</li>`)}
  </ul>
`;
```

### Complex Nested Structures

```typescript
interface TagResult {
  file: string;
  tag: string;
  valid: boolean;
}

function renderTagRow(tag: TagResult) {
  return html`
    <tr data-valid="${tag.valid}">
      <td>${tag.file}</td>
      <td>${tag.tag}</td>
      <td>${tag.valid ? "✅ Valid" : "❌ Invalid"}</td>
    </tr>
  `;
}

const htmlContent = html`
  <table>
    <tbody>
      ${tags.map(tag => renderTagRow(tag))}
    </tbody>
  </table>
`;
```

## Migration Checklist

When migrating existing code:

1. ✅ Import `html` from `"bun"`
2. ✅ Replace template strings with `html` tagged templates
3. ✅ Remove explicit `: string` return type annotations (let TypeScript infer)
4. ✅ Test XSS prevention with malicious inputs
5. ✅ Verify nested templates work correctly
6. ✅ Update route handlers to use `c.html()`
7. ✅ Test performance with large documents

## Examples

See `examples/bun-html-tag-example.ts` for complete working examples.

## References

- [Bun 1.3 Blog Post](https://bun.com/blog/bun-v1.3)
- [Hono HTML Response](https://hono.dev/api/hono#html)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

## Implementation Status

**Current Status**: Using polyfill (`src/utils/html-tag-polyfill.ts`)

As of Bun 1.3.3, native `html` tagged template literal support is not yet available. The codebase uses a polyfill that provides:

- ✅ Automatic XSS protection via HTML entity escaping
- ✅ Support for nested templates
- ✅ Array handling for `.map()` operations
- ✅ Type safety via TypeScript

When Bun adds native `html` tag support, the polyfill will automatically detect and use the native implementation via `hasNativeHTMLTag()` check.

**Migration Path**: When Bun adds native support, simply change imports from:
```typescript
import { html } from "../src/utils/html-tag-polyfill";
```
to:
```typescript
import { html } from "bun";
```

The API will remain the same, ensuring a seamless transition.
