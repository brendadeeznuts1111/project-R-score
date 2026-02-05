<!-- Prefetch Optimizations -->
  <link rel="preconnect" href="https://bun.sh">
  <link rel="dns-prefetch" href="https://bun.sh">
  <link rel="preload" href="https://bun.sh/logo.svg" importance="high" crossorigin="anonymous">
  <link rel="preconnect" href="https://example.com">
  <link rel="dns-prefetch" href="https://example.com">
  <link rel="preconnect" href="https://cdn.jsdelivr.net">
  <link rel="dns-prefetch" href="https://cdn.jsdelivr.net">
  <link rel="preconnect" href="https://github.com">
  <link rel="dns-prefetch" href="https://github.com">
  <link rel="preconnect" href="https://developer.mozilla.org">
  <link rel="dns-prefetch" href="https://developer.mozilla.org">
<!-- End Prefetch Optimizations -->

# 🎨 Advanced Markdown Styling Demo

This document demonstrates **custom styling** for different content types using Bun.markdown.

## 📚 Content Type Examples

### Code Blocks
```typescript
// TypeScript code with custom styling
const response = await fetch("https://api.example.com");
const data = await response.json();
console.log("Data:", data);
```

```bash
# Shell commands
bun run dev
curl http://example.com/api/typedarray/urls
```

### Inline Elements
- **Bold text** in red color
- *Italic text* with underline
- `inline code` in cyan
- [Links 🌐](https://bun.sh/docs) with blue text and cyan URLs

### Lists
1. First item with custom bullet
2. Second item  
3. Third item with **nested bold**

- Unordered item with purple bullet
- Another item with `inline code`
- Item with [link 🌐](https://example.com)

### Blockquotes
> This is a blockquote with custom styling
> It can span multiple lines
> And has a nice prefix indicator

### Combined Elements
Here's a paragraph with **bold**, *italic*, `code`, and a [link 🌐](https://bun.sh/docs).

### Advanced Features
- **Status**: ✅ Working
- **Priority**: 🔥 High  
- **Type**: `string` | `number` | `boolean`

### Code with Syntax Highlighting
```javascript
// Advanced example
const server = Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response("Hello World!");
  }
});
```

### Tables (if supported)
| Feature | Status | Notes |
|---------|--------|-------|
| Styling | ✅ | Custom colors |
| Performance | ⚡ | Fast rendering |
| Compatibility | 🔧 | Bun native |

---

*Last updated: 2026-02-04*
