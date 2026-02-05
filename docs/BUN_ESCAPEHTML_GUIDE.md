# 🛡️ Bun.escapeHTML() Comprehensive Guide

Complete reference for using `Bun.escapeHTML()` to prevent XSS attacks and safely render user content in HTML.

## 📖 Overview

`Bun.escapeHTML()` is a high-performance, SIMD-optimized function that escapes HTML entities in user-provided content. It's essential for preventing Cross-Site Scripting (XSS) attacks when rendering untrusted user input in HTML.

```typescript
// Before Bun.escapeHTML()
const userInput = "<script>alert('XSS')</script>";
// Renders as executable script!

// After Bun.escapeHTML()
const safeInput = Bun.escapeHTML("<script>alert('XSS')</script>");
// Renders as: &lt;script&gt;alert(&#39;XSS&#39;)&lt;/script&gt;
// Safe to display!
```

---

## 🔍 Official Definition

From the [Bun documentation](https://bun.sh/docs/api/utils#bun-escapehtml):

> `Bun.escapeHTML()` escapes HTML entities in a string, converting `<`, `>`, `&`, `"`, and `'` to their corresponding HTML entity codes.

**Key characteristics:**
- **Performance**: 480 MB/s - 20 GB/s (SIMD-optimized)
- **Type safety**: Accepts `any` type (converts to string)
- **Security**: Prevents XSS attacks by escaping dangerous characters
- **Zero dependencies**: Built into Bun runtime

---

## 🎯 When to Use

### ✅ Always Use For:

1. **User-generated content** displayed in HTML
   ```typescript
   const userName = getUserInput();
   const safeName = Bun.escapeHTML(userName);
   document.body.innerHTML = `<p>Welcome, ${safeName}!</p>`;
   ```

2. **API responses** rendered in HTML
   ```typescript
   const apiData = await fetch('/api/data').then(r => r.json());
   const safeTitle = Bun.escapeHTML(apiData.title);
   ```

3. **Template literals** with dynamic content
   ```typescript
   const html = `<div>${Bun.escapeHTML(userContent)}</div>`;
   ```

4. **HTMLRewriter** content injection
   ```typescript
   new HTMLRewriter()
     .on('div', {
       text(text) {
         text.replace(Bun.escapeHTML(userInput));
       }
     });
   ```

5. **RSS/XML feed generation**
   ```typescript
   const rssItem = `
     <item>
       <title>${Bun.escapeHTML(item.title)}</title>
       <description>${Bun.escapeHTML(item.description)}</description>
     </item>
   `;
   ```

### ❌ Don't Use For:

- **Trusted static content** (no user input)
- **Content already escaped** (double-escaping creates display issues)
- **JSON data** (use `JSON.stringify()` instead)
- **CSS or JavaScript** (use appropriate sanitizers)

---

## 🔐 Security: XSS Prevention

### The XSS Problem

Without escaping, malicious scripts can execute:

```typescript
// ❌ DANGEROUS - XSS vulnerability
const userInput = "<script>alert('XSS')</script>";
document.body.innerHTML = `<div>${userInput}</div>`;
// Script executes! 🚨
```

### The Solution

```typescript
// ✅ SAFE - XSS prevented
const userInput = "<script>alert('XSS')</script>";
const safeInput = Bun.escapeHTML(userInput);
document.body.innerHTML = `<div>${safeInput}</div>`;
// Renders as text: <script>alert('XSS')</script>
```

### Escaped Characters

| Character | Entity Code | Example |
|-----------|-------------|---------|
| `<` | `&lt;` | `<script>` → `&lt;script&gt;` |
| `>` | `&gt;` | `</script>` → `&lt;/script&gt;` |
| `&` | `&amp;` | `AT&T` → `AT&amp;T` |
| `"` | `&quot;` | `"hello"` → `&quot;hello&quot;` |
| `'` | `&#39;` | `don't` → `don&#39;t` |

---

## 📝 Usage Examples

### Basic Usage

```typescript
// Simple string escaping
const unsafe = '<script>alert("XSS")</script>';
const safe = Bun.escapeHTML(unsafe);
console.log(safe);
// Output: &lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;
```

### Type Handling

`Bun.escapeHTML()` accepts any type and converts it to a string:

```typescript
// Numbers
Bun.escapeHTML(42);           // "42"
Bun.escapeHTML(3.14);         // "3.14"

// Booleans
Bun.escapeHTML(true);         // "true"
Bun.escapeHTML(false);        // "false"

// Objects (converted to string)
Bun.escapeHTML({ key: '<value>' });  // "[object Object]"

// Null/Undefined
Bun.escapeHTML(null);         // "null"
Bun.escapeHTML(undefined);    // "undefined"
```

### HTML Generation Pattern

```typescript
async function generateSafeHTML(userContent: string) {
  const safeContent = Bun.escapeHTML(userContent);
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Safe Page</title>
</head>
<body>
  <h1>User Content</h1>
  <p>${safeContent}</p>
</body>
</html>`;
  
  await Bun.write("output.html", html);
}
```

### With Bun.write()

```typescript
// Pattern: await Bun.write("out.html", Bun.escapeHTML(content))
const userInput = '<script>alert("XSS")</script>Hello & "World"';
const safeHtml = `<!DOCTYPE html>
<html>
<body>
  <p>${Bun.escapeHTML(userInput)}</p>
</body>
</html>`;

await Bun.write("safe.html", safeHtml);
```

### HTMLRewriter Integration

```typescript
class SanitizingHandler {
  text(text: Text) {
    const content = text.text;
    text.replace(Bun.escapeHTML(content));
  }
  
  element(element: Element) {
    const attribute = element.getAttribute('data-user');
    if (attribute) {
      element.setAttribute('data-user', Bun.escapeHTML(attribute));
    }
  }
}

new HTMLRewriter()
  .on('div', new SanitizingHandler())
  .transform(response);
```

### RSS Feed Generation

```typescript
function generateRSSItem(item: { title: string; description: string }) {
  return `
    <item>
      <title>${Bun.escapeHTML(item.title)}</title>
      <description>${Bun.escapeHTML(item.description)}</description>
    </item>
  `;
}
```

### Dashboard/UI Rendering

```typescript
// Safe rendering of user data in dashboards
function renderUserCard(user: { name: string; email: string }) {
  return `
    <div class="user-card">
      <h2>${Bun.escapeHTML(user.name)}</h2>
      <p>${Bun.escapeHTML(user.email)}</p>
    </div>
  `;
}
```

### Error Message Display

```typescript
function renderError(error: Error) {
  const safeMessage = Bun.escapeHTML(error.message);
  const safeStack = Bun.escapeHTML(error.stack ?? "");
  
  return `
    <div class="error">
      <p>${safeMessage}</p>
      <pre>${safeStack}</pre>
    </div>
  `;
}
```

---

## ⚡ Performance

### Benchmarks

`Bun.escapeHTML()` is SIMD-optimized and extremely fast:

- **Small strings** (< 100 chars): ~20 GB/s
- **Medium strings** (1-10 KB): ~2-5 GB/s  
- **Large strings** (> 100 KB): ~480 MB/s - 2 GB/s

### Comparison: Native vs Userland

```typescript
// ❌ Slow userland implementation
function escapeHtmlReplace(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ✅ Fast native implementation
const escaped = Bun.escapeHTML(s);
```

**Performance difference**: `Bun.escapeHTML()` is **10-100x faster** than userland `.replace()` chains, especially for larger strings.

---

## 🔄 Integration Patterns

### Pattern 1: Template Literal Helper

```typescript
function safeHtml(strings: TemplateStringsArray, ...values: any[]) {
  let result = strings[0];
  for (let i = 0; i < values.length; i++) {
    result += Bun.escapeHTML(String(values[i]));
    result += strings[i + 1];
  }
  return result;
}

// Usage
const html = safeHtml`<div>${userInput}</div>`;
```

### Pattern 2: Object Escaping Utility

```typescript
function escapeObject(obj: Record<string, any>): Record<string, string> {
  const escaped: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    escaped[key] = Bun.escapeHTML(String(value));
  }
  return escaped;
}

// Usage
const safeData = escapeObject({ name: '<script>', email: 'user@example.com' });
```

### Pattern 3: Combined with Bun.stringWidth

```typescript
// Calculate width before escaping (for display purposes)
const logLine = "User: <script>alert('XSS')</script>";
const width = Bun.stringWidth(logLine);
const safeLog = Bun.escapeHTML(logLine);

// Truncate safely
const truncated = width > 89 
  ? Bun.escapeHTML(logLine.slice(0, 86)) + "…"
  : Bun.escapeHTML(logLine);
```

### Pattern 4: Safe JSON Display

```typescript
function safeJsonDisplay(data: any): string {
  const jsonString = JSON.stringify(data, null, 2);
  return Bun.escapeHTML(jsonString);
}

// Usage in HTML
const html = `<pre>${safeJsonDisplay(userData)}</pre>`;
```

---

## ⚠️ Common Pitfalls

### 1. Double Escaping

```typescript
// ❌ WRONG - Double escaping
const once = Bun.escapeHTML(userInput);
const twice = Bun.escapeHTML(once);
// Result: &amp;lt;script&amp;gt; (displays as text: &lt;script&gt;)

// ✅ CORRECT - Escape once
const safe = Bun.escapeHTML(userInput);
```

### 2. Escaping Trusted Content

```typescript
// ❌ Unnecessary escaping of static content
const html = `<div>${Bun.escapeHTML("Hello World")}</div>`;
// "Hello World" is safe, no need to escape

// ✅ Only escape dynamic/untrusted content
const html = `<div>Hello World</div>`;
const dynamicHtml = `<div>${Bun.escapeHTML(userInput)}</div>`;
```

### 3. Not Escaping Attribute Values

```typescript
// ❌ DANGEROUS - Unescaped attribute
const html = `<div data-user="${userInput}">Content</div>`;
// XSS vulnerability if userInput contains quotes

// ✅ SAFE - Escaped attribute
const html = `<div data-user="${Bun.escapeHTML(userInput)}">Content</div>`;
```

### 4. Mixing with innerHTML

```typescript
// ❌ DANGEROUS - Direct innerHTML assignment
element.innerHTML = userInput;

// ✅ SAFE - Escape before assignment
element.innerHTML = Bun.escapeHTML(userInput);
```

---

## 🧪 Testing

### Unit Test Examples

```typescript
import { test, expect } from "bun:test";

test('Bun.escapeHTML escapes script tags', () => {
  const html = '<script>alert("XSS")</script>';
  const escaped = Bun.escapeHTML(html);
  expect(escaped).not.toContain('<script>');
  expect(escaped).toContain('&lt;script&gt;');
});

test('Bun.escapeHTML handles special characters', () => {
  const input = 'AT&T\'s "deal" <now>';
  const escaped = Bun.escapeHTML(input);
  expect(escaped).toBe('AT&amp;T&#39;s &quot;deal&quot; &lt;now&gt;');
});

test('Bun.escapeHTML accepts numbers', () => {
  expect(Bun.escapeHTML(42)).toBe('42');
});

test('Bun.escapeHTML accepts booleans', () => {
  expect(Bun.escapeHTML(true)).toBe('true');
  expect(Bun.escapeHTML(false)).toBe('false');
});
```

---

## 🔗 Related APIs

- **`Bun.stringWidth()`** - Calculate display width (use before escaping for truncation)
- **`Bun.stripANSI()`** - Remove ANSI codes before escaping
- **`HTMLRewriter`** - Transform HTML streams (escape content in handlers)
- **`Bun.write()`** - Write files (escape content before writing HTML)

---

## 📚 Best Practices

1. **Always escape user input** before rendering in HTML
2. **Escape once** - don't double-escape already-safe content
3. **Use for all dynamic content** - even if you "trust" the source
4. **Combine with Bun.stringWidth()** for display-aware truncation
5. **Test edge cases** - empty strings, null, undefined, special characters
6. **Document escaping** in code comments for security audits

---

## 🎓 Real-World Examples from Codebase

### Example 1: Scanner HTML Generation

```typescript
// From scanner/scripts/generate-visual-docs.ts
function escapeHTML(value: any): string {
  return Bun.escapeHTML(String(value));
}

// Usage in HTML template
const html = `
  <tr data-name="${escapeHTML(constant.name)}">
    <td><code>${escapeHTML(constant.name)}</code></td>
  </tr>
`;
```

### Example 2: RSS Feed Generation

```typescript
// From matrix-analysis/tools/tier1380-registry.ts
const title = Bun.escapeHTML(`${op.direction}: ${op.key}`);
const description = Bun.escapeHTML(
  `Operation: ${op.type} on ${op.key}`
);
```

### Example 3: Error Page Rendering

```typescript
// From enterprise-dashboard/src/server/utils/error-pages.ts
export function escapeHtml(str: string): string {
  return Bun.escapeHTML(str);
}

export function generateErrorPage(error: Error) {
  const safeMessage = escapeHtml(error.message);
  const safeStack = escapeHtml(error.stack ?? "");
  // ... render safe HTML
}
```

---

## 📖 References

- [Bun Documentation: Bun.escapeHTML](https://bun.sh/docs/api/utils#bun-escapehtml)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [MDN: HTML Entity Reference](https://developer.mozilla.org/en-US/docs/Glossary/Entity)

---

**Remember**: When in doubt, escape! It's better to escape unnecessarily than to leave an XSS vulnerability.
