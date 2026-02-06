# Bun Markdown API - Comprehensive Analysis

## **Executive Summary**

Bun provides a **high-performance, built-in Markdown parser** written in Zig with three main APIs. While powerful, the API has important considerations for production use.

## **🚀 Three Core APIs**

### **1. `Bun.markdown.html()` - Simple HTML Conversion**
```typescript
const html = Bun.markdown.html("# Hello **world**", {
  tables: true,           // GFM tables
  strikethrough: true,    // ~~deleted~~
  tasklists: true,        // - [x] completed
  autolinks: true,        // Auto-link URLs/emails
  headings: true,         // Heading IDs + anchors
  wikiLinks: true,        // [[wiki links]]
  latexMath: true,        // $inline$ + $$display$$
  underline: true,        // __text__ → <u>
  tagFilter: true         // HTML tag filtering
});
```

### **2. `Bun.markdown.render()` - Full Customization**
```typescript
// Most powerful API - custom renderers for any format
const custom = Bun.markdown.render("# Hello", {
  heading: (children, { level, id }) => `<h${level} class="title">${children}</h${level}>`,
  code: (children, { language }) => `<pre class="lang-${language}">${children}</pre>`,
  link: (children, { href, title }) => `<a href="${href}" class="external">${children}</a>`
}, { autolinks: true }); // Parser options as 3rd arg
```

### **3. `Bun.markdown.react()` - React Integration**
```typescript
// Direct JSX output - perfect for React apps
function Markdown({ content }) {
  return Bun.markdown.react(content, {
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    pre: ({ language, children }) => (
      <CodeBlock language={language}>{children}</CodeBlock>
    )
  }, { headings: { ids: true } });
}
```

## **⚠️ Critical Issues & Gotchas**

### **1. Documentation Discrepancy**
**CRITICAL**: Conflicting default values in documentation:
- **Examples show**: `tables: true, strikethrough: true, tasklists: true` (implied defaults)
- **Options table shows**: All features default to `false`

**Recommendation**: Always set options explicitly.

### **2. Unstable API Warning**
```typescript
// ⚠️ This API is under active development and may change
```
- Breaking changes likely in future Bun versions
- Wrap usage in abstraction layers for production
- Maintain comprehensive test suites

### **3. Missing Documentation**
The official docs don't specify:
- Error handling behavior
- Maximum input size limits  
- Memory usage characteristics
- Thread safety for concurrent usage
- Performance benchmarks

## **🔧 Unique Features (Easy to Miss)**

### **Advanced Options**
```typescript
{
  // Less obvious but powerful features
  tagFilter: true,           // GFM-style HTML tag filtering
  wikiLinks: true,           // [[Internal Links]] syntax
  underline: true,           // __text__ → <u> instead of <strong>
  permissiveAtxHeaders: true, // #Headers without space
  collapseWhitespace: true,  // Normalize whitespace
  hardSoftBreaks: true,      // Soft breaks → hard breaks
  noIndentedCodeBlocks: true, // Disable 4-space indentation
  noHtmlBlocks: true,        // Disable raw HTML blocks
  noHtmlSpans: true         // Disable inline HTML
}
```

### **Callback Metadata (render() API)**
```typescript
// Rich metadata available in callbacks
{
  heading: (children, { level, id }) => {...},      // id when headings: { ids: true }
  code: (children, { language }) => {...},          // language from ```js
  list: (children, { ordered, start }) => {...},    // start number for ordered lists
  listItem: (children, { checked }) => {...},       // checked for task lists
  link: (children, { href, title }) => {...},       // full link attributes
  image: (children, { src, title }) => {...},       // image attributes
  th/td: (children, { align }) => {...}             // table cell alignment
}
```

## **📊 Performance Characteristics**

### **Known Advantages**
- **Zig Implementation**: Should outperform JavaScript parsers
- **Zero Dependencies**: Built into Bun runtime
- **Single-Pass Parsing**: Optimized algorithm
- **Memory Efficient**: Minimal allocations

### **Performance Unknowns**
- Actual benchmark numbers not documented
- Memory usage characteristics
- Large document handling (>1MB)
- Concurrent processing capabilities

## **🎯 Production Use Cases**

### **1. CLI Tools with ANSI Output**
```typescript
// Terminal-friendly output
const cliOutput = Bun.markdown.render(content, {
  heading: (text, { level }) => `\x1b[1;${31+level}m${text}\x1b[0m\n`,
  code: (text) => `\x1b[90m${text}\x1b[0m`,
  strong: (text) => `\x1b[1m${text}\x1b[0m`,
  emphasis: (text) => `\x1b[3m${text}\x1b[0m`,
  link: (text, { href }) => `${text} (\x1b[34m${href}\x1b[0m)`
});
```

### **2. Blog Platform with Syntax Highlighting**
```typescript
// Custom code block rendering
const blogHtml = Bun.markdown.render(markdown, {
  code: (code, { language }) => {
    const highlighted = highlightSyntax(code, language);
    return `<pre class="code-block language-${language}"><code>${highlighted}</code></pre>`;
  },
  heading: (text, { level, id }) => {
    return `<h${level} id="${id}"><a href="#${id}">${text}</a></h${level}>`;
  }
}, { 
  headings: { ids: true },
  tables: true,
  tasklists: true 
});
```

### **3. React Documentation Site**
```typescript
// Safe external links + custom components
function DocMarkdown({ content }) {
  return Bun.markdown.react(content, {
    a: ({ href, children }) => (
      <Link href={href} external={!href.startsWith('/')}>
        {children}
      </Link>
    ),
    img: ({ src, alt }) => (
      <Image src={src} alt={alt} loading="lazy" />
    ),
    table: ({ children }) => (
      <div className="table-wrapper">
        <table>{children}</table>
      </div>
    )
  }, {
    autolinks: true,
    headings: { ids: true },
    tables: true
  });
}
```

## **🔄 Migration Strategies**

### **From marked/markdown-it**
```typescript
// Similar callback API but different structure
// Old: marked.use({ heading: (text, level) => {...} })
// New: Bun.markdown.render(content, { heading: (text, { level }) => {...} })
```

### **From react-markdown**
```typescript
// No npm dependency needed
// Old: <ReactMarkdown>{content}</ReactMarkdown>
// New: Bun.markdown.react(content, { customComponents })
```

### **Abstraction Layer for Stability**
```typescript
// Wrap unstable API to future-proof
class MarkdownParser {
  constructor(options = {}) {
    this.options = {
      tables: true,
      strikethrough: true,
      tasklists: true,
      ...options
    };
  }
  
  toHtml(markdown) {
    try {
      return Bun.markdown.html(markdown, this.options);
    } catch (error) {
      console.error('Markdown parsing failed:', error);
      return markdown; // Fallback
    }
  }
  
  toReact(markdown, components = {}) {
    try {
      return Bun.markdown.react(markdown, components, this.options);
    } catch (error) {
      console.error('React markdown failed:', error);
      return <pre>{markdown}</pre>; // Fallback
    }
  }
}
```

## **📋 Best Practices**

### **1. Always Use Explicit Options**
```typescript
// ❌ Bad - relies on unclear defaults
const html = Bun.markdown.html(content);

// ✅ Good - explicit configuration
const html = Bun.markdown.html(content, {
  tables: true,
  strikethrough: true,
  tasklists: true,
  autolinks: true
});
```

### **2. Error Handling**
```typescript
function safeMarkdown(content, options = {}) {
  try {
    return Bun.markdown.html(content, options);
  } catch (error) {
    console.error('Markdown parse error:', error);
    return `<div class="error">Markdown parsing failed</div>${content}`;
  }
}
```

### **3. Performance Monitoring**
```typescript
function parseWithMetrics(content, options = {}) {
  const start = performance.now();
  const result = Bun.markdown.html(content, options);
  const duration = performance.now() - start;
  
  if (duration > 100) { // Log slow parses
    console.warn(`Slow markdown parse: ${duration.toFixed(2)}ms for ${content.length} chars`);
  }
  
  return result;
}
```

### **4. Testing Strategy**
```typescript
// Test with various markdown samples
const testCases = [
  { name: 'basic', input: '# Hello **world**' },
  { name: 'tables', input: '| A | B |\n|---|---|\n| 1 | 2 |' },
  { name: 'math', input: '$E = mc^2$' },
  { name: 'complex', input: require('./test-complex.md') }
];

testCases.forEach(({ name, input }) => {
  const result = Bun.markdown.html(input, { tables: true, latexMath: true });
  expect(result).toMatchSnapshot(name);
});
```

## **🚀 Recommendations**

### **For Production Use**
1. **Use Abstraction Layer**: Wrap the unstable API
2. **Explicit Options**: Never rely on defaults
3. **Comprehensive Testing**: Test all markdown features you use
4. **Error Handling**: Always wrap in try-catch
5. **Performance Monitoring**: Track parse times
6. **Version Pinning**: Lock Bun version to prevent breaking changes

### **When to Choose Bun Markdown**
- **Bun-native applications**: No dependencies needed
- **CLI tools**: Fast performance + ANSI output
- **React apps**: Direct JSX output
- **High-throughput scenarios**: Zig performance
- **Simple use cases**: Easy API surface

### **When to Be Cautious**
- **Long-term stability**: Unstable API
- **Complex requirements**: Missing documentation
- **Critical applications**: Breaking changes likely
- **Team environments**: Need consistent behavior across versions

## **🔍 Missing Features**

The API could benefit from:
- Error handling documentation
- Performance benchmarks
- Memory usage analysis
- Streaming support for large files
- Plugin system for extensions
- AST access for advanced processing

---

**Bottom Line**: Bun's Markdown API is powerful and fast, but the unstable status and documentation gaps require careful consideration for production use. Use abstraction layers and comprehensive testing to mitigate risks.
