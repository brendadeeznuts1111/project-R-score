# Bun HTMLRewriter API Reference

## Overview

`HTMLRewriter` is Bun's streaming HTML transformer API that allows you to modify HTML on-the-fly as it's being parsed. It's similar to Cloudflare Workers' HTMLRewriter but with enhanced capabilities.

**Official Documentation:** [Bun HTMLRewriter](https://bun.com/docs/runtime/html-rewriter)

**Key Advantage:** Bun's HTMLRewriter accepts multiple input types directly (strings, ArrayBuffers), while Cloudflare Workers only supports Response objects.

## Quick Start

```typescript
import { HTMLRewriter } from 'bun';

const rewriter = new HTMLRewriter()
  .on('div.content', {
    element(el) {
      el.setAttribute('class', 'new-content');
      el.append('<p>New content</p>', { html: true });
    },
    text(text) {
      text.replace('new text');
    },
    comments(comment) {
      comment.remove();
    },
  });

// Transform Response
const result = rewriter.transform(new Response('<div class="content">Original</div>'));
console.log(await result.text()); // '<div class="new-content">new text<p>New content</p></div>'

// Transform string directly (Bun enhancement!)
const result2 = rewriter.transform('<div class="content">Original</div>');
console.log(result2); // '<div class="new-content">new text<p>New content</div>'
```

## Input Types

HTMLRewriter can transform HTML from various sources. The input is automatically handled based on its type:

### From Response

```typescript
rewriter.transform(new Response("<div>content</div>"));
// Returns: Response
```

### From String (Bun Enhancement!)

```typescript
rewriter.transform("<div>content</div>");
// Returns: string
// Note: Cloudflare Workers doesn't support this
```

### From ArrayBuffer (Bun Enhancement!)

```typescript
rewriter.transform(new TextEncoder().encode("<div>content</div>").buffer);
// Returns: ArrayBuffer
// Note: Cloudflare Workers doesn't support this
```

### From Blob

```typescript
rewriter.transform(new Blob(["<div>content</div>"]));
// Note: In Bun 1.3.3, requires Response wrapper
rewriter.transform(new Response(new Blob(["<div>content</div>"])));
```

### From File

```typescript
rewriter.transform(Bun.file("index.html"));
// Note: In Bun 1.3.3, requires Response wrapper
rewriter.transform(new Response(Bun.file("index.html")));
```

**Important:** Cloudflare Workers implementation of HTMLRewriter only supports Response objects. Bun's implementation is more flexible!

## Element Handlers

The `on(selector, handlers)` method allows you to register handlers for HTML elements that match a CSS selector. The handlers are called for each matching element during parsing:

```typescript
rewriter.on("div.content", {
  // Handle elements
  element(element) {
    element.setAttribute("class", "new-content");
    element.append("<p>New content</p>", { html: true });
  },
  // Handle text nodes
  text(text) {
    text.replace("new text");
  },
  // Handle comments
  comments(comment) {
    comment.remove();
  },
});
```

### Async Handlers

Handlers can be asynchronous and return a Promise. Note that async operations will block the transformation until they complete:

```typescript
rewriter.on("div", {
  async element(element) {
    await Bun.sleep(1000);
    element.setInnerContent("<span>replace</span>", { html: true });
  },
});
```

## CSS Selector Support

The `on()` method supports a wide range of CSS selectors:

### Tag Selectors

```typescript
rewriter.on("p", handler);
```

### Class Selectors

```typescript
rewriter.on("p.red", handler);
```

### ID Selectors

```typescript
rewriter.on("h1#header", handler);
```

### Attribute Selectors

```typescript
rewriter.on("p[data-test]", handler); // Has attribute
rewriter.on('p[data-test="one"]', handler); // Exact match
rewriter.on('p[data-test="one" i]', handler); // Case-insensitive
rewriter.on('p[data-test="one" s]', handler); // Case-sensitive
rewriter.on('p[data-test~="two"]', handler); // Word match
rewriter.on('p[data-test^="a"]', handler); // Starts with
rewriter.on('p[data-test$="1"]', handler); // Ends with
rewriter.on('p[data-test*="b"]', handler); // Contains
rewriter.on('p[data-test|="a"]', handler); // Dash-separated
```

### Combinators

```typescript
rewriter.on("div span", handler); // Descendant
rewriter.on("div > span", handler); // Direct child
```

### Pseudo-classes

```typescript
rewriter.on("p:nth-child(2)", handler);
rewriter.on("p:first-child", handler);
rewriter.on("p:nth-of-type(2)", handler);
rewriter.on("p:first-of-type", handler);
rewriter.on("p:not(:first-child)", handler);
```

### Universal Selector

```typescript
rewriter.on("*", handler);
```

## Element Operations

Elements provide various methods for manipulation. All modification methods return the element instance for chaining:

```typescript
rewriter.on("div", {
  element(el) {
    // Attributes
    el.setAttribute("class", "new-class").setAttribute("data-id", "123");
    
    const classAttr = el.getAttribute("class"); // "new-class"
    const hasId = el.hasAttribute("id"); // boolean
    el.removeAttribute("class");
    
    // Content manipulation
    el.setInnerContent("New content"); // Escapes HTML by default
    el.setInnerContent("<p>HTML content</p>", { html: true }); // Parses HTML
    el.setInnerContent(""); // Clear content
    
    // Position manipulation
    el.before("Content before").after("Content after")
      .prepend("First child").append("Last child");
    
    // HTML content insertion
    el.before("<span>before</span>", { html: true })
      .after("<span>after</span>", { html: true })
      .prepend("<span>first</span>", { html: true })
      .append("<span>last</span>", { html: true });
    
    // Removal
    el.remove(); // Remove element and contents
    el.removeAndKeepContent(); // Remove only the element tags
    
    // Properties
    console.log(el.tagName); // Lowercase tag name
    console.log(el.namespaceURI); // Element's namespace URI
    console.log(el.selfClosing); // Whether element is self-closing (e.g. <div />)
    console.log(el.canHaveContent); // Whether element can contain content (false for void elements like <br>)
    console.log(el.removed); // Whether element was removed
    
    // Attributes iteration
    for (const [name, value] of el.attributes) {
      console.log(name, value);
    }
    
    // End tag handling
    el.onEndTag(endTag => {
      endTag.before("Before end tag");
      endTag.after("After end tag");
      endTag.remove(); // Remove the end tag
      console.log(endTag.name); // Tag name in lowercase
    });
  },
});
```

## Text Operations

Text handlers provide methods for text manipulation. Text chunks represent portions of text content and provide information about their position in the text node:

```typescript
rewriter.on("p", {
  text(text) {
    // Content
    console.log(text.text); // Text content
    console.log(text.lastInTextNode); // Whether this is the last chunk
    console.log(text.removed); // Whether text was removed
    
    // Manipulation
    text.before("Before text").after("After text")
        .replace("New text").remove();
    
    // HTML content insertion
    text
      .before("<span>before</span>", { html: true })
      .after("<span>after</span>", { html: true })
      .replace("<span>replace</span>", { html: true });
  },
});
```

## Comment Operations

Comment handlers allow comment manipulation with similar methods to text nodes:

```typescript
rewriter.on("*", {
  comments(comment) {
    // Content
    console.log(comment.text); // Comment text
    comment.text = "New comment text"; // Set comment text
    console.log(comment.removed); // Whether comment was removed
    
    // Manipulation
    comment.before("Before comment").after("After comment")
           .replace("New comment").remove();
    
    // HTML content insertion
    comment
      .before("<span>before</span>", { html: true })
      .after("<span>after</span>", { html: true })
      .replace("<span>replace</span>", { html: true });
  },
});
```

## Document Handlers

The `onDocument(handlers)` method allows you to handle document-level events. These handlers are called for events that occur at the document level rather than within specific elements:

```typescript
rewriter.onDocument({
  // Handle doctype
  doctype(doctype) {
    console.log(doctype.name); // "html"
    console.log(doctype.publicId); // public identifier if present
    console.log(doctype.systemId); // system identifier if present
  },
  // Handle text nodes
  text(text) {
    console.log(text.text);
  },
  // Handle comments
  comments(comment) {
    console.log(comment.text);
  },
  // Handle document end
  end(end) {
    end.append("<!-- Footer -->", { html: true });
  },
});
```

## Response Handling

When transforming a Response:
- The status code, headers, and other response properties are preserved
- The body is transformed while maintaining streaming capabilities
- Content-encoding (like gzip) is handled automatically
- The original response body is marked as used after transformation
- Headers are cloned to the new response

## Error Handling

HTMLRewriter operations can throw errors in several cases:
- Invalid selector syntax in `on()` method
- Invalid HTML content in transformation methods
- Stream errors when processing Response bodies
- Memory allocation failures
- Invalid input types (e.g., passing Symbol)
- Body already used errors

Errors should be caught and handled appropriately:

```typescript
try {
  const result = rewriter.transform(input);
  // Process result
} catch (error) {
  console.error("HTMLRewriter error:", error);
}
```

## Bun-Specific Enhancements

### Direct String and ArrayBuffer Support

Unlike Cloudflare Workers, Bun's HTMLRewriter accepts strings and ArrayBuffers directly:

```typescript
// ✅ Works in Bun (returns string)
const result = rewriter.transform("<div>content</div>");

// ✅ Works in Bun (returns ArrayBuffer)
const buffer = new TextEncoder().encode("<div>content</div>").buffer;
const result = rewriter.transform(buffer);

// ⚠️ Cloudflare Workers only supports Response objects
const result = rewriter.transform(new Response("<div>content</div>"));
```

### Performance Benefits

- Streaming transformations for large HTML documents
- Efficient memory usage
- No need to load entire HTML into memory
- Supports async operations in handlers

## Examples

### Example 1: Basic Element Transformation

```typescript
const rewriter = new HTMLRewriter()
  .on('h1', {
    element(el) {
      el.setAttribute('class', 'title');
      el.prepend('📝 ', { html: false });
    },
  });

const html = '<h1>Hello World</h1>';
const result = rewriter.transform(html);
console.log(result); // '<h1 class="title">📝 Hello World</h1>'
```

### Example 2: Multiple Handler Types

```typescript
const rewriter = new HTMLRewriter()
  .on('div.content', {
    element(el) {
      el.setAttribute('class', 'enhanced');
    },
    text(text) {
      if (text.text.includes('old')) {
        text.replace(text.text.replace('old', 'new'));
      }
    },
    comments(comment) {
      comment.remove();
    },
  });
```

### Example 3: Async Transformation

```typescript
const rewriter = new HTMLRewriter()
  .on('div', {
    async element(el) {
      // Fetch data asynchronously
      const data = await fetch('https://api.example.com/data').then(r => r.json());
      el.setInnerContent(`<p>${data.message}</p>`, { html: true });
    },
  });
```

### Example 4: Server-Side HTML Enhancement

```typescript
export function enhanceHTML(html: string, data: any): Response {
  const rewriter = new HTMLRewriter()
    .on('title', {
      element(el) {
        el.setInnerContent(`${data.title} - My Site`);
      },
    })
    .on('body', {
      element(el) {
        el.setAttribute('data-page', data.page);
      },
    })
    .onDocument({
      end(end) {
        end.append(`<script>window.__DATA__ = ${JSON.stringify(data)};</script>`, { html: true });
      },
    });
  
  return rewriter.transform(new Response(html));
}
```

## Best Practices

1. **Use specific selectors**: More specific selectors are more efficient
2. **Handle errors**: Always wrap transformations in try/catch
3. **Use async handlers carefully**: They block the transformation
4. **Prefer streaming**: For large documents, use Response objects for streaming
5. **Chain transformations**: Multiple `on()` calls can be chained
6. **Use `{ html: true }`**: When inserting HTML content, always use the option

## Comparison with Cloudflare Workers

| Feature | Bun | Cloudflare Workers |
|---------|-----|-------------------|
| String input | ✅ Direct | ❌ Requires Response |
| ArrayBuffer input | ✅ Direct | ❌ Requires Response |
| Response input | ✅ | ✅ |
| Blob input | ⚠️ Needs Response wrapper | ✅ |
| File input | ⚠️ Needs Response wrapper | ✅ |
| CSS Selectors | ✅ Full support | ✅ Full support |
| Async handlers | ✅ | ✅ |
| Streaming | ✅ | ✅ |

## See Also

- [Official Bun HTMLRewriter Documentation](https://bun.com/docs/runtime/html-rewriter)
- [Demo Script](../scripts/demo-html-rewriter.ts)
- [Tag Dashboard with HTMLRewriter](../src/hyper-bun/tag-dashboard-rewriter.tsx)

## Related APIs

- `Bun.serve()` - HTTP server for serving transformed HTML
- `Bun.file()` - File input for HTMLRewriter
- `Response` - Standard web API for HTTP responses
