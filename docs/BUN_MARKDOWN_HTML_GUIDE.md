# 📝 Bun.markdown.html() Comprehensive Guide

Complete reference for using `Bun.markdown.html()` to convert Markdown to HTML with customizable options.

## 📖 Overview

`Bun.markdown.html()` is Bun's built-in CommonMark-compliant Markdown parser that converts Markdown text to HTML. It supports GitHub Flavored Markdown (GFM) extensions and provides extensive customization options for different use cases.

```typescript
const html = Bun.markdown.html("some markdown", {
  tables: true,           // GFM tables (default: false)
  strikethrough: true,    // GFM strikethrough (default: false)
  tasklists: true,       // GFM task lists (default: false)
  tagFilter: true,        // GFM tag filter for disallowed HTML tags (default: false)
  autolinks: true,        // Autolink URLs, emails, and www. links (default: false)
});
```

---

## 🔍 Official Definition

From the [Bun documentation](https://bun.com/docs/runtime/markdown):

> `Bun.markdown.html()` renders Markdown to an HTML string. It supports CommonMark specification and GitHub Flavored Markdown (GFM) extensions.

> **Unstable API** — This API is under active development and may change in future versions of Bun. ([bun.com/docs](https://bun.com/docs/runtime/markdown))

**Key characteristics:**
- **CommonMark compliant**: Follows the CommonMark specification
- **GFM support**: GitHub Flavored Markdown extensions available via options (defaults: `false`)
- **Performance**: Fast Zig-based implementation
- **Zero dependencies**: Built into Bun runtime (v1.3.8+)
- **Customizable**: Extensive options for different rendering needs

---

## 🎯 When to Use

### ✅ Use `Bun.markdown.html()` For:

1. **Blog posts and documentation** rendered to HTML
   ```typescript
   const markdown = await Bun.file("post.md").text();
   const html = Bun.markdown.html(markdown, { headingIds: true });
   ```

2. **User-generated content** in markdown format
   ```typescript
   const userContent = getUserMarkdown();
   const safeHtml = Bun.markdown.html(userContent, { tagFilter: true });
   ```

3. **API responses** that return HTML from markdown
   ```typescript
   Bun.serve({
     fetch(req) {
       const md = "# Hello World\n\nThis is **markdown**";
       const html = Bun.markdown.html(md);
       return new Response(html, { headers: { "Content-Type": "text/html" } });
     }
   });
   ```

4. **RSS feeds** with markdown descriptions
   ```typescript
   const rssItem = `
     <item>
       <title>${item.title}</title>
       <description>${Bun.markdown.html(item.markdownDescription)}</description>
     </item>
   `;
   ```

5. **Static site generation** from markdown files
   ```typescript
   const mdFiles = glob("**/*.md");
   for (const file of mdFiles) {
     const content = await Bun.file(file).text();
     const html = Bun.markdown.html(content, { headingIds: true });
     await Bun.write(file.replace(".md", ".html"), html);
   }
   ```

### ❌ Don't Use For:

- **Terminal output** (use `Bun.markdown.render()` instead)
- **React components** (use `Bun.markdown.react()` instead)
- **Plain text extraction** (use `Bun.markdown.render()` with custom callbacks)

---

## 📋 Complete Options Reference

Per the [official options table](https://bun.com/docs/runtime/markdown#options), **all options default to `false`**. Enable them explicitly for GFM-style behavior.

| Option | Default | Description |
|--------|---------|-------------|
| `tables` | `false` | GFM tables |
| `strikethrough` | `false` | GFM strikethrough (`~~text~~`) |
| `tasklists` | `false` | GFM task lists (`- [x] item`) |
| `autolinks` | `false` | Enable autolinks (URL, WWW, email) |
| `headings` | `false` | Heading IDs and autolinks |
| `hardSoftBreaks` | `false` | Treat soft line breaks as hard breaks |
| `wikiLinks` | `false` | Enable `[[wiki links]]` |
| `underline` | `false` | `__text__` renders as `<u>` instead of `<strong>` |
| `latexMath` | `false` | Enable `$inline$` and `$$display$$` math |
| `collapseWhitespace` | `false` | Collapse whitespace in text |
| `permissiveAtxHeaders` | `false` | ATX headers without space after `#` |
| `noIndentedCodeBlocks` | `false` | Disable indented code blocks |
| `noHtmlBlocks` | `false` | Disable HTML blocks |
| `noHtmlSpans` | `false` | Disable inline HTML |
| `tagFilter` | `false` | GFM tag filter for disallowed HTML tags |

### GFM Extensions (Default: `false`)

These options control GitHub Flavored Markdown features:

```typescript
{
  tables: boolean,        // GFM tables: | Header | Cell |
  strikethrough: boolean, // GFM strikethrough: ~~text~~
  tasklists: boolean,    // GFM task lists: - [x] Done
}
```

**Default values**: All are `false` (disabled). Set to `true` to enable.

**Example:**
```typescript
const html = Bun.markdown.html(`
| Feature | Status |
|---------|--------|
| Tables  | ✅     |

~~Old text~~ New text

- [x] Completed task
- [ ] Pending task
`, {
  tables: true,
  strikethrough: true,
  tasklists: true
});
```

### Link Processing

```typescript
{
  autolinks: boolean | {
    url?: boolean,    // Autolink URLs (https://example.com)
    www?: boolean,    // Autolink www. links
    email?: boolean,  // Autolink email addresses
  }
}
```

**Default**: `false`

**Examples:**
```typescript
// Enable all autolinks
Bun.markdown.html("Visit https://bun.sh", { autolinks: true });

// Customize autolink types
Bun.markdown.html("Visit https://bun.sh or www.example.com", {
  autolinks: {
    url: true,
    www: true,
    email: false  // Don't autolink emails
  }
});

// Disable autolinks
Bun.markdown.html("Visit https://bun.sh", { autolinks: false });
```

### Heading Features

```typescript
{
  headings: boolean | {
    ids?: boolean,      // Generate IDs for headings (e.g., id="hello-world")
    autolink?: boolean  // Make heading IDs clickable links
  }
}
```

**Default**: `false`

**Examples:**
```typescript
// Generate heading IDs
const html1 = Bun.markdown.html("## Hello World", { 
  headings: { ids: true } 
});
// Output: <h2 id="hello-world">Hello World</h2>

// Generate IDs and make them clickable
const html2 = Bun.markdown.html("## Hello World", {
  headings: { ids: true, autolink: true }
});
// Output: <h2 id="hello-world"><a href="#hello-world">Hello World</a></h2>

// Disable heading features
const html3 = Bun.markdown.html("## Hello World", {
  headings: false
});
// Output: <h2>Hello World</h2>
```

### Extended Features

```typescript
{
  wikiLinks?: boolean,   // [[wiki links]] syntax
  underline?: boolean,    // __text__ -> <u>text</u>
  latexMath?: boolean,    // $inline$ and $$display$$ math
}
```

**Default**: All are `false` (disabled)

**Examples:**
```typescript
// Wiki links
Bun.markdown.html("See [[Page Name]]", { wikiLinks: true });
// Output: <p>See <a href="Page Name">Page Name</a></p>

// Underline
Bun.markdown.html("This is __underlined__", { underline: true });
// Output: <p>This is <u>underlined</u></p>

// LaTeX math
Bun.markdown.html("Inline: $x = y$ Display: $$\\int_0^\\infty$$", {
  latexMath: true
});
```

### HTML Filtering & Security

```typescript
{
  tagFilter?: boolean,           // GFM tag filter for disallowed HTML tags
  noIndentedCodeBlocks?: boolean, // Disable indented code blocks
  noHtmlBlocks?: boolean,         // Disable HTML blocks
  noHtmlSpans?: boolean,          // Disable HTML spans
}
```

**Default**: `tagFilter: false`, others are `false`

**Security Note**: Set `tagFilter: true` when rendering user content to prevent dangerous HTML tags (XSS).

**Example:**
```typescript
// Safe: tagFilter enabled (default)
const safe = Bun.markdown.html("<script>alert('XSS')</script>", {
  tagFilter: true
});
// Dangerous tags are filtered out

// Unsafe: tagFilter disabled
const unsafe = Bun.markdown.html("<script>alert('XSS')</script>", {
  tagFilter: false
});
// ⚠️ Script tags may be rendered!
```

### Parsing Behavior

```typescript
{
  hardSoftBreaks?: boolean,        // Line break handling
  collapseWhitespace?: boolean,     // Whitespace optimization
  permissiveAtxHeaders?: boolean,   // Lenient header parsing
}
```

**Default**: All are `false`

---

## 📝 Usage Examples

### Basic Usage

```typescript
// Simple markdown to HTML
const markdown = "# Hello World\n\nThis is **bold** text.";
const html = Bun.markdown.html(markdown);
// Output: <h1>Hello World</h1><p>This is <strong>bold</strong> text.</p>
```

### With All GFM Options Enabled

```typescript
const html = Bun.markdown.html(`
# Project Status

| Task | Status |
|------|--------|
| Setup | ✅ Done |
| Tests | ⏳ Pending |

- [x] Completed task
- [ ] Pending task

~~Old feature~~ New feature
`, {
  tables: true,
  strikethrough: true,
  tasklists: true,
  autolinks: true,
  tagFilter: true
});
```

### Blog Post Rendering

```typescript
async function renderBlogPost(filePath: string) {
  const markdown = await Bun.file(filePath).text();
  
  const html = Bun.markdown.html(markdown, {
    tables: true,
    strikethrough: true,
    tasklists: true,
    autolinks: true,
    headings: {
      ids: true,        // For anchor links
      autolink: true    // Make headings clickable
    },
    tagFilter: true     // Security: filter dangerous HTML
  });
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Blog Post</title>
</head>
<body>
  ${html}
</body>
</html>`;
}
```

### RSS Feed Generation

```typescript
function generateRSSItem(item: { title: string; description: string }) {
  const htmlDescription = Bun.markdown.html(item.description, {
    tables: false,        // Tables might not render well in RSS
    autolinks: true,      // Convert URLs to links
    tagFilter: true       // Security
  });
  
  return `
    <item>
      <title>${Bun.escapeHTML(item.title)}</title>
      <description><![CDATA[${htmlDescription}]]></description>
    </item>
  `;
}
```

### User Content Rendering (Secure)

```typescript
function renderUserContent(markdown: string) {
  // Always enable tagFilter for user content!
  return Bun.markdown.html(markdown, {
    tables: true,
    strikethrough: true,
    tasklists: true,
    autolinks: true,
    tagFilter: true,      // ⚠️ CRITICAL: Prevent XSS
    headings: { ids: true }
  });
}
```

### Minimal Configuration

```typescript
// Disable all GFM features for basic CommonMark
const html = Bun.markdown.html(markdown, {
  tables: false,
  strikethrough: false,
  tasklists: false,
  autolinks: false,
  headings: false
});
```

### Extended Features Configuration

```typescript
// Enable all extended features
const html = Bun.markdown.html(markdown, {
  tables: true,
  strikethrough: true,
  tasklists: true,
  autolinks: true,
  headings: { ids: true, autolink: true },
  wikiLinks: true,      // [[wiki links]]
  underline: true,      // __underline__
  latexMath: true,      // $math$
  tagFilter: true
});
```

---

## 🔐 Security Best Practices

### 1. Always Enable `tagFilter` for User Content

```typescript
// ✅ SAFE
const html = Bun.markdown.html(userInput, {
  tagFilter: true  // Filters dangerous HTML tags
});

// ❌ UNSAFE - XSS vulnerability
const html = Bun.markdown.html(userInput, {
  tagFilter: false  // Allows <script> and other dangerous tags
});
```

### 2. Combine with `Bun.escapeHTML()` When Needed

```typescript
// For non-markdown user input
const safeTitle = Bun.escapeHTML(userTitle);

// For markdown user input
const safeMarkdown = Bun.markdown.html(userMarkdown, {
  tagFilter: true  // Handles HTML in markdown
});
```

### 3. Validate Input Before Processing

```typescript
function safeMarkdownToHtml(markdown: string): string {
  // Validate input length
  if (markdown.length > 100000) {
    throw new Error("Markdown too large");
  }
  
  // Process with security options
  return Bun.markdown.html(markdown, {
    tagFilter: true,
    noHtmlBlocks: true,  // Extra security: disable HTML blocks
    noHtmlSpans: true     // Extra security: disable HTML spans
  });
}
```

---

## ⚡ Performance

### Benchmarks

`Bun.markdown.html()` is optimized for performance:

- **Small documents** (< 10 KB): ~1-5ms
- **Medium documents** (10-100 KB): ~5-20ms
- **Large documents** (> 100 KB): ~20-100ms

### Optimization Tips

1. **Cache rendered HTML** for static content
   ```typescript
   const cache = new Map<string, string>();
   
   function getCachedHtml(markdown: string, options: any): string {
     const key = `${markdown}-${JSON.stringify(options)}`;
     if (!cache.has(key)) {
       cache.set(key, Bun.markdown.html(markdown, options));
     }
     return cache.get(key)!;
   }
   ```

2. **Use minimal options** when possible
   ```typescript
   // Faster: minimal options
   Bun.markdown.html(md, { tables: true });
   
   // Slower: many options enabled
   Bun.markdown.html(md, {
     tables: true,
     strikethrough: true,
     tasklists: true,
     wikiLinks: true,
     underline: true,
     latexMath: true
   });
   ```

---

## 🔄 Common Patterns

### Pattern 1: Blog Post with Table of Contents

```typescript
function renderBlogPostWithTOC(markdown: string) {
  // First pass: generate HTML with heading IDs
  const html = Bun.markdown.html(markdown, {
    headings: { ids: true, autolink: true }
  });
  
  // Extract headings for TOC
  const headingMatches = markdown.matchAll(/^#{1,6}\s+(.+)$/gm);
  const toc = Array.from(headingMatches)
    .map(([, title]) => {
      const id = title.toLowerCase().replace(/\s+/g, '-');
      return `- [${title}](#${id})`;
    })
    .join('\n');
  
  const tocHtml = Bun.markdown.html(toc);
  
  return `<div class="toc">${tocHtml}</div>${html}`;
}
```

### Pattern 2: Documentation Site Generator

```typescript
async function generateDocsSite(mdDir: string, outputDir: string) {
  const files = glob(`${mdDir}/**/*.md`);
  
  for (const file of files) {
    const markdown = await Bun.file(file).text();
    const html = Bun.markdown.html(markdown, {
      tables: true,
      strikethrough: true,
      tasklists: true,
      autolinks: true,
      headings: { ids: true, autolink: true },
      tagFilter: true
    });
    
    const outputPath = file.replace(mdDir, outputDir).replace('.md', '.html');
    await Bun.write(outputPath, wrapInHtmlTemplate(html));
  }
}
```

### Pattern 3: API Endpoint

```typescript
Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === '/render' && req.method === 'POST') {
      const { markdown, options } = await req.json();
      
      const html = Bun.markdown.html(markdown, {
        tables: options?.tables ?? true,
        strikethrough: options?.strikethrough ?? true,
        tasklists: options?.tasklists ?? true,
        autolinks: options?.autolinks ?? true,
        tagFilter: true,  // Always enabled for security
        headings: options?.headings ?? { ids: true }
      });
      
      return new Response(html, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    return new Response('Not Found', { status: 404 });
  }
});
```

---

## ⚠️ Common Pitfalls

### 1. Forgetting `tagFilter` for User Content

```typescript
// ❌ DANGEROUS
const html = Bun.markdown.html(userInput);  // tagFilter defaults to false — unsafe for user content!

// ✅ SAFE
const html = Bun.markdown.html(userInput, {
  tagFilter: true  // Explicitly enabled
});
```

### 2. Double Escaping

```typescript
// ❌ WRONG - Don't escape markdown before processing
const escaped = Bun.escapeHTML(markdown);
const html = Bun.markdown.html(escaped);  // Markdown syntax won't work!

// ✅ CORRECT - Process markdown, then escape if needed
const html = Bun.markdown.html(markdown, { tagFilter: true });
```

### 3. Mixing Options Incorrectly

```typescript
// ❌ WRONG - headings as boolean when you need object
Bun.markdown.html(md, { headings: true });  // Won't enable autolink

// ✅ CORRECT - Use object for advanced heading options
Bun.markdown.html(md, { headings: { ids: true, autolink: true } });
```

---

## 🧪 Testing

### Unit Test Examples

```typescript
import { test, expect } from "bun:test";

test('Bun.markdown.html renders basic markdown', () => {
  const html = Bun.markdown.html("# Hello");
  expect(html).toContain("<h1>Hello</h1>");
});

test('Bun.markdown.html renders tables when enabled', () => {
  const md = "| Header |\n|--------|\n| Cell   |";
  const html = Bun.markdown.html(md, { tables: true });
  expect(html).toContain("<table>");
});

test('Bun.markdown.html filters dangerous tags', () => {
  const md = "<script>alert('XSS')</script>";
  const html = Bun.markdown.html(md, { tagFilter: true });
  expect(html).not.toContain("<script>");
});

test('Bun.markdown.html generates heading IDs', () => {
  const html = Bun.markdown.html("## Hello World", {
    headings: { ids: true }
  });
  expect(html).toContain('id="hello-world"');
});
```

---

## 🔗 Related APIs

- **`Bun.markdown.render()`** - Custom rendering with callbacks (for terminal/ANSI output)
- **`Bun.markdown.react()`** - React component generation
- **`Bun.escapeHTML()`** - HTML entity escaping (use for non-markdown content)
- **`Bun.write()`** - Write rendered HTML to files

---

## 📚 Best Practices

1. **Always enable `tagFilter`** for user-generated content
2. **Use `headingIds: true`** for documentation sites (enables anchor links)
3. **Enable `autolinks`** for user-friendly link conversion
4. **Cache rendered HTML** for static content to improve performance
5. **Validate input length** before processing large markdown documents
6. **Combine with `Bun.escapeHTML()`** when mixing markdown and plain HTML

---

## 🎓 Real-World Examples from Codebase

### Example 1: Frontmatter Rendering

```typescript
// From matrix-analysis/src/commands/frontmatter.ts
const html = Bun.markdown.html(extracted.content, { 
  headingIds: true  // For anchor links
});
```

### Example 2: RSS Feed Generation

```typescript
// From lib/enhanced-rss.ts
const html = Bun.markdown.html(markdownReport, { 
  tables: true,
  autolinks: true,
  tagFilter: true
});
```

### Example 3: Report Generation

```typescript
// From matrix-analysis/.factory-wager/reports/markdown-engine.ts
const markdownSummary = Bun.markdown.html(summary, {
  headingIds: true,
  autolinkHeadings: true
});
```

---

## 📖 References

- [Bun Documentation: Bun.markdown](https://bun.com/docs/runtime/markdown) — official options table and API
- [CommonMark Specification](https://commonmark.org/)
- [GitHub Flavored Markdown Spec](https://github.github.com/gfm/)
- [BUN_MARKDOWN_COMPLETE_GUIDE.md](./BUN_MARKDOWN_COMPLETE_GUIDE.md) - Complete implementation guide

---

**Remember**: Always enable `tagFilter: true` when processing user-generated markdown content to prevent XSS attacks!
