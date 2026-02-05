# HTMLRewriter Best Practices for Hyper-Bun

## Overview

This document outlines best practices for using Bun's HTMLRewriter API in Hyper-Bun, based on the [official Bun HTMLRewriter documentation](https://bun.com/docs/runtime/html-rewriter).

## Key Differences: Bun vs Cloudflare Workers

### Bun Enhancements

1. **Multiple Input Types**: Bun supports `string`, `Response`, `ArrayBuffer`, `Blob`, and `File` directly
2. **String Transformation**: Can transform strings directly without wrapping in Response
3. **File Support**: Native `Bun.File` support

### Cloudflare Workers Limitations

- Only supports `Response` objects
- Must wrap strings in `new Response(string)`

## Best Practices

### 1. Input Type Handling

**✅ Good**: Handle multiple input types

```typescript
function transform(input: string | Response | ArrayBuffer | Blob | File) {
  const rewriter = new HTMLRewriter().on("div", { /* ... */ });
  
  if (typeof input === 'string') {
    return rewriter.transform(input); // Bun enhancement
  } else if (input instanceof Response) {
    return rewriter.transform(input); // Preserves headers
  } else if (input instanceof ArrayBuffer) {
    return rewriter.transform(new Response(input));
  } else if (input instanceof Blob) {
    return rewriter.transform(new Response(input));
  } else if (input instanceof File) {
    return rewriter.transform(input); // Bun enhancement
  }
}
```

**❌ Avoid**: Assuming only Response objects

```typescript
// Don't do this - limits flexibility
function transform(input: Response) {
  return rewriter.transform(input);
}
```

### 2. Script Injection

**✅ Good**: Use `onDocument()` for reliable injection

```typescript
rewriter.onDocument({
  end: (end) => {
    end.prepend('<script>window.CONFIG = {...};</script>', { html: true });
  }
});
```

**✅ Alternative**: Inject in `<head>` for immediate availability

```typescript
rewriter.on("head", {
  element: (head) => {
    head.append('<script>window.CONFIG = {...};</script>', { html: true });
  }
});
```

**❌ Avoid**: Relying only on `body` prepend (may not work if body is empty)

```typescript
// Less reliable
rewriter.on("body", {
  element: (body) => {
    body.prepend('<script>...</script>', { html: true });
  }
});
```

### 3. CSS Selector Usage

**✅ Good**: Use specific attribute selectors

```typescript
// Exact match
rewriter.on('[data-feature="shadowGraph"]', handler);

// Has attribute
rewriter.on('[data-feature]', handler);

// Case-insensitive
rewriter.on('[data-feature="shadowgraph" i]', handler);

// Starts with
rewriter.on('[data-feature^="shadow"]', handler);
```

**✅ Good**: Combine selectors for complex matching

```typescript
// Feature flag AND role requirement
rewriter.on('[data-feature][data-access]', handler);

// Specific feature with specific role
rewriter.on('[data-feature="shadowGraph"][data-access="admin"]', handler);
```

**❌ Avoid**: Overly broad selectors

```typescript
// Too broad - matches everything
rewriter.on('*', handler);

// Better: be specific
rewriter.on('[data-feature]', handler);
```

### 4. Error Handling

**✅ Good**: Handle specific error types

```typescript
try {
  const result = rewriter.transform(input);
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('selector')) {
      console.error('Invalid CSS selector');
    } else if (error.message.includes('body already used')) {
      console.error('Response body already consumed');
    } else if (error.message.includes('memory')) {
      console.error('Memory allocation failed');
    }
  }
  throw error;
}
```

**❌ Avoid**: Generic error handling

```typescript
// Too generic
try {
  const result = rewriter.transform(input);
} catch (error) {
  console.error('Error:', error);
}
```

### 5. Element Operations

**✅ Good**: Chain operations for readability

```typescript
rewriter.on("div", {
  element: (el) => {
    el.setAttribute("class", "new-class")
      .setAttribute("data-id", "123")
      .append("<span>content</span>", { html: true });
  }
});
```

**✅ Good**: Check element state before operations

```typescript
rewriter.on("div", {
  element: (el) => {
    if (el.removed) return; // Already removed
    
    const feature = el.getAttribute("data-feature");
    if (!feature) return; // No feature attribute
    
    // Safe to proceed
    el.setInnerContent("Content");
  }
});
```

**❌ Avoid**: Operating on removed elements

```typescript
// Don't do this - element may already be removed
rewriter.on("div", {
  element: (el) => {
    el.remove();
    el.setAttribute("class", "new"); // Won't work
  }
});
```

### 6. Text Node Handling

**✅ Good**: Handle text chunks properly

```typescript
rewriter.on("p", {
  text: (text) => {
    if (text.lastInTextNode) {
      // Last chunk - safe to replace entire content
      text.replace("New text");
    } else {
      // Not last chunk - append or prepend
      text.after("Additional text");
    }
  }
});
```

**❌ Avoid**: Replacing text in middle chunks

```typescript
// Don't do this - may cause issues
rewriter.on("p", {
  text: (text) => {
    if (!text.lastInTextNode) {
      text.replace("New"); // May not work as expected
    }
  }
});
```

### 7. Async Operations

**✅ Good**: Understand async blocking behavior

```typescript
rewriter.on("div", {
  async element: async (el) => {
    // This will block transformation until complete
    const data = await fetchData();
    el.setInnerContent(data, { html: true });
  }
});
```

**⚠️ Warning**: Async operations block transformation

- Transformation waits for async operations to complete
- Use async sparingly
- Consider pre-fetching data before transformation

### 8. Response Preservation

**✅ Good**: Preserve Response properties

```typescript
const response = new Response(html, {
  headers: { 'Content-Type': 'text/html' },
  status: 200
});

// Headers and status are preserved
const transformed = rewriter.transform(response);
```

**✅ Good**: Handle streaming responses

```typescript
// Streaming is preserved automatically
const stream = new ReadableStream(/* ... */);
const response = new Response(stream);
const transformed = rewriter.transform(response);
```

### 9. Performance Considerations

**✅ Good**: Use specific selectors

```typescript
// Fast: specific selector
rewriter.on('[data-feature="shadowGraph"]', handler);

// Slower: universal selector
rewriter.on('*', handler);
```

**✅ Good**: Minimize handlers

```typescript
// Better: single handler for multiple elements
rewriter.on('[data-feature]', {
  element: (el) => {
    const feature = el.getAttribute("data-feature");
    // Handle all features in one handler
  }
});
```

**❌ Avoid**: Too many handlers

```typescript
// Less efficient: many handlers
rewriter.on('[data-feature="shadowGraph"]', handler1);
rewriter.on('[data-feature="alerts"]', handler2);
rewriter.on('[data-feature="stats"]', handler3);
// ... many more
```

### 10. Fallback Support

**✅ Good**: Check HTMLRewriter availability

```typescript
const HTMLRewriter = globalThis.HTMLRewriter || 
                     (typeof Bun !== 'undefined' && Bun.HTMLRewriter);

if (!HTMLRewriter) {
  // Fallback to string replacement
  return fallbackTransform(input);
}

const rewriter = new HTMLRewriter();
// ... use rewriter
```

**✅ Good**: Provide graceful degradation

```typescript
class UIContextRewriter {
  transform(input: string | Response) {
    if (this.isAvailable()) {
      return this.useHTMLRewriter(input);
    } else {
      return this.fallbackTransform(input);
    }
  }
  
  private fallbackTransform(input: string | Response): string {
    // Simple string replacement fallback
    if (typeof input === 'string') {
      return input.replace(/old/g, 'new');
    }
    // Handle Response fallback
    return input;
  }
}
```

## Common Patterns

### Pattern 1: Feature Flag Conditional Rendering

```typescript
const rewriter = new HTMLRewriter()
  .on('[data-feature]', {
    element: (el) => {
      const feature = el.getAttribute("data-feature");
      if (!context.featureFlags[feature]) {
        el.remove();
      }
    }
  });
```

### Pattern 2: Role-Based Access Control

```typescript
const rewriter = new HTMLRewriter()
  .on('[data-access]', {
    element: (el) => {
      const requiredRole = el.getAttribute("data-access");
      const allowedRoles = requiredRole.split(',').map(r => r.trim());
      if (!allowedRoles.includes(context.userRole) && context.userRole !== 'admin') {
        el.remove();
      }
    }
  });
```

### Pattern 3: Server-Side Timestamp Injection

```typescript
const rewriter = new HTMLRewriter()
  .on('[data-server-timestamp]', {
    element: (el) => {
      const format = el.getAttribute("data-format") || "locale";
      const timestamp = Date.now();
      const formatted = formatTimestamp(timestamp, format);
      el.setInnerContent(formatted);
    }
  });
```

### Pattern 4: Context Object Injection

```typescript
const rewriter = new HTMLRewriter()
  .onDocument({
    end: (end) => {
      const script = `<script>window.CONTEXT = ${JSON.stringify(context)};</script>`;
      end.prepend(script, { html: true });
    }
  })
  .on("head", {
    element: (head) => {
      const script = `<script>window.CONTEXT = ${JSON.stringify(context)};</script>`;
      head.append(script, { html: true });
    }
  });
```

## Testing

### Unit Testing

```typescript
import { describe, test, expect } from "bun:test";

describe("UIContextRewriter", () => {
  test("injects UI context", () => {
    const context = { apiBaseUrl: "http://localhost:3001" };
    const rewriter = new UIContextRewriter(context);
    const html = "<html><body></body></html>";
    const result = rewriter.transform(html);
    
    expect(result).toContain("window.HYPERBUN_UI_CONTEXT");
  });
  
  test("removes elements with disabled features", () => {
    const context = {
      featureFlags: { shadowGraph: false }
    };
    const rewriter = new UIContextRewriter(context);
    const html = '<div data-feature="shadowGraph">Content</div>';
    const result = rewriter.transform(html);
    
    expect(result).not.toContain("data-feature=\"shadowGraph\"");
  });
});
```

## See Also

- [Bun HTMLRewriter Documentation](https://bun.com/docs/runtime/html-rewriter)
- [Cloudflare HTMLRewriter Documentation](https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/)
- [lol-html GitHub Repository](https://github.com/cloudflare/lol-html)
- [HTMLRewriter UI Context Pattern](./HTML-REWRITER-UI-CONTEXT.md)
