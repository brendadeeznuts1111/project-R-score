# 🚀 Advanced Bun.markdown Features Demo

This demonstrates **all available overrides** from the official Bun documentation.

## 📋 Task Lists (GFM Extension)

- [x] Completed task with checkbox
- [ ] Pending task
- [x] Another completed item
- [ ] Task with **bold text**
- [ ] Task with `inline code`

## 🎨 Content Type Examples

### Code Blocks with Syntax Highlighting

```typescript
// TypeScript with custom styling
interface User {
  id: number;
  name: string;
  email: string;
}

const fetchUser = async (id: number): Promise<User> => {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
};
```

```bash
# Shell commands with green highlighting
bun run dev
bun run test
bun run build
```

```json
{
  "name": "enhanced-markdown",
  "version": "1.0.0",
  "scripts": {
    "start": "bun run index.ts"
  }
}
```

### Tables with Alignment

| Feature | Status | Notes | Priority |
|---------|--------|-------|----------|
| ANSI Rendering | ✅ | Working perfectly | 🔥 High |
| HTML Output | ✅ | With CSS classes | 🔥 High |
| Link Extraction | ✅ | All URLs captured | ⚡ Medium |
| Heading Parsing | ✅ | With IDs support | ⚡ Medium |
| Task Lists | ✅ | GFM compatible | 🔧 Low |

### Blockquotes with Nested Content

> **Important Note**: This is a blockquote with **bold text** and `inline code`.
> 
> It can span multiple lines and contain:
> - Nested lists
> - [ ] Task items
> - `Code snippets`

### Inline Elements

This paragraph contains **bold text**, *italic text*, ~~strikethrough~~, and `inline code`.

### Links and Images

External link: [Bun Documentation](https://bun.sh/docs "Official Bun docs")

Internal link: [API Documentation](./api.md)

Image example: ![Bun Logo](https://bun.sh/logo.png "Bun JavaScript Runtime")

### Lists (Ordered and Unordered)

1. First ordered item
2. Second item with **bold**
3. Third item with `code`

- Unordered item with emoji 🎨
- Another item with *italic*
- Item with [link](https://example.com)

### Horizontal Rule

---

### Combined Elements

> **Complex Example**: This blockquote contains:
> - A [link](https://bun.sh)
> - `inline code`
> - And **bold emphasis**

## 🔧 Advanced Features

### Strikethrough Text
~~This text is crossed out~~ but this is not.

### Emphasis vs Strong
*This is emphasis* (italic) vs **this is strong** (bold).

### Mixed Formatting
***Bold and italic*** text with `code` and [links](https://example.com).

### Performance Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Speed | 0.874 | ✅ Excellent |
| Memory | 0.590 | ⚠️ Optimizing |
| CPU | 0.982 | ✅ Efficient |
| Storage | 0.875 | ✅ Healthy |

---

*Last updated: 2026-02-04*  
*Generated with Enhanced Markdown Renderer*
