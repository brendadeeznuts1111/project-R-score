# BUN MARKDOWN API

## QUICK REFERENCE

### THREE METHODS
1. `Bun.markdown.html()` → HTML string
2. `Bun.markdown.render()` → Custom format
3. `Bun.markdown.react()` → React elements

### DEFAULT SETTINGS
- Most GFM features disabled by default
- Must explicitly enable options

## HTML METHOD

### BASIC USAGE
```javascript
const html = Bun.markdown.html("# Hello");
```

### ALL OPTIONS
```javascript
const html = Bun.markdown.html(markdown, {
  tables: false,               // GFM tables
  strikethrough: false,        // ~~strikethrough~~
  tasklists: false,            // - [x] tasks
  autolinks: false,            // Auto-link URLs
  headings: false,             // Heading IDs
  hardSoftBreaks: false,       // Single newlines = <br>
  wikiLinks: false,            // [[wiki links]]
  underline: false,            // __text__ = <u>
  latexMath: false,            // $math$ support
  collapseWhitespace: false,   // Remove extra spaces
  permissiveAtxHeaders: false, // #header (no space)
  noIndentedCodeBlocks: false, // Disable 4-space code
  noHtmlBlocks: false,         // Disable HTML blocks
  noHtmlSpans: false,          // Disable inline HTML
  tagFilter: false             // Security filter
});
```

### AUTOLINKS
```javascript
// All types
{ autolinks: true }

// Specific types
{ 
  autolinks: { 
    url: true, 
    www: true, 
    email: true 
  }
}
```

### HEADING IDs
```javascript
// Both IDs and anchors
{ headings: true }

// Only IDs
{ headings: { ids: true } }

// Only anchors
{ headings: { autolink: true } }
```

## RENDER METHOD

### CALLBACK STRUCTURE
```javascript
Bun.markdown.render(markdown, {
  // Block callbacks
  heading: (children, { level, id }) => string,
  paragraph: (children) => string,
  blockquote: (children) => string,
  code: (children, { language }) => string,
  list: (children, { ordered, start }) => string,
  listItem: (children, { checked }) => string,
  hr: () => string,
  table: (children) => string,
  thead: (children) => string,
  tbody: (children) => string,
  tr: (children) => string,
  th: (children, { align }) => string,
  td: (children, { align }) => string,
  html: (children) => string,
  
  // Inline callbacks
  strong: (children) => string,
  emphasis: (children) => string,
  link: (children, { href, title }) => string,
  image: (children, { src, title }) => string,
  codespan: (children) => string,
  strikethrough: (children) => string,
  text: (children) => string
}, parserOptions);
```

### BASIC EXAMPLE
```javascript
const result = Bun.markdown.render("# Title", {
  heading: (children, { level }) => `<h${level}>${children}</h${level}>`,
  paragraph: (children) => `<p>${children}</p>`
});
```

### OMIT ELEMENTS
```javascript
// Return null/undefined to remove
{
  image: () => null,
  html: () => ''
}
```

### WITH PARSER OPTIONS
```javascript
Bun.markdown.render(markdown, callbacks, {
  tables: true,
  autolinks: true
});
```

## REACT METHOD

### BASIC USAGE
```javascript
function Component() {
  return Bun.markdown.react("# Hello");
}
```

### COMPONENT OVERRIDES
```javascript
const element = Bun.markdown.react(markdown, {
  h1: ({ children, id }) => <h1 id={id}>{children}</h1>,
  p: ({ children }) => <p className="text">{children}</p>,
  a: ({ href, children }) => <a href={href} target="_blank">{children}</a>,
  img: ({ src, alt }) => <img src={src} alt={alt} />,
  code: ({ children }) => <code className="inline-code">{children}</code>,
  pre: ({ language, children }) => (
    <pre data-language={language}>{children}</pre>
  ),
  li: ({ checked, children }) => (
    <li data-checked={checked}>{children}</li>
  )
}, parserOptions);
```

### REACT VERSION
```javascript
// React 19+ (default)
Bun.markdown.react(markdown);

// React 18 and older
Bun.markdown.react(markdown, components, {
  reactVersion: 18,
  headings: { ids: true }
});
```

### ALL OVERRIDABLE TAGS
```javascript
// Block elements
h1, h2, h3, h4, h5, h6, p, blockquote, pre, hr, ul, ol, li, table, thead, tbody, tr, th, td

// Inline elements
em, strong, a, img, code, del, br
```

## SECURITY CONFIG

### SAFE SETTINGS
```javascript
const SAFE_OPTIONS = {
  tagFilter: true,      // Remove dangerous tags
  noHtmlBlocks: true,   // No raw HTML blocks
  noHtmlSpans: true,    // No inline HTML
  autolinks: false      // Don't auto-create links
};

const SAFE_CALLBACKS = {
  link: (children, { href }) => {
    // Validate URLs
    if (isSafeUrl(href)) {
      return `<a href="${href}">${children}</a>`;
    }
    return children;
  },
  image: () => '' // Remove all images
};
```

## PERFORMANCE PATTERNS

### CACHING
```javascript
const cache = new Map();

function cachedRender(markdown, callbacks, options) {
  const key = JSON.stringify({ markdown, options });
  if (cache.has(key)) return cache.get(key);
  
  const result = Bun.markdown.render(markdown, callbacks, options);
  cache.set(key, result);
  return result;
}
```

### FACTORY FUNCTION
```javascript
function createRenderer(baseCallbacks, baseOptions) {
  return (markdown, customCallbacks = {}) => 
    Bun.markdown.render(markdown, {
      ...baseCallbacks,
      ...customCallbacks
    }, baseOptions);
}
```

## COMMON USE CASES

### 1. BLOG/CONTENT
```javascript
const BLOG_OPTIONS = {
  tables: true,
  strikethrough: true,
  headings: { ids: true },
  autolinks: { url: true, www: true }
};
```

### 2. CLI TOOL
```javascript
const CLI_CALLBACKS = {
  heading: (text) => `\n\x1b[1;36m${text}\x1b[0m\n`,
  code: (text) => `\x1b[90m${text}\x1b[0m`,
  strong: (text) => `\x1b[1m${text}\x1b[0m`
};
```

### 3. REACT APP
```javascript
function MarkdownContent({ text }) {
  return Bun.markdown.react(text, {
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener">
        {children}
      </a>
    ),
    pre: ({ language, children }) => (
      <SyntaxHighlighter language={language}>
        {children}
      </SyntaxHighlighter>
    )
  }, {
    tables: true,
    tasklists: true
  });
}
```

## ERROR PATTERNS

### MISSING CALLBACKS
```javascript
// ❌ Paragraph content lost
{
  heading: (children) => `<h1>${children}</h1>`
  // No paragraph callback
}

// ✅ Always include paragraph
{
  heading: (children) => `<h1>${children}</h1>`,
  paragraph: (children) => `<p>${children}</p>`
}
```

### ESCAPE TEXT
```javascript
// ❌ XSS vulnerability
{
  text: (children) => children
}

// ✅ Escape HTML
{
  text: (children) => 
    children
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
}
```

## API COMPARISON

| Method | Output | Control Level | Use Case |
|--------|--------|---------------|----------|
| `html()` | HTML string | Low | Simple conversion |
| `render()` | Any string | High | Custom formats, CLI |
| `react()` | React elements | Medium | React apps |

## KEY NOTES

1. **Unstable API** - May change in future Bun versions
2. **Zero dependencies** - Built into Bun runtime
3. **Zig implementation** - High performance
4. **GFM defaults false** - Must enable explicitly
5. **Callback order** - Children already processed

## MINIMAL CONFIG

### BASIC HTML
```javascript
const html = Bun.markdown.html(markdown, {
  tables: true,
  strikethrough: true,
  autolinks: true
});
```

### BASIC REACT
```javascript
const element = Bun.markdown.react(markdown, undefined, {
  tables: true,
  headings: { ids: true }
});
```

### BASIC RENDER
```javascript
const output = Bun.markdown.render(markdown, {
  paragraph: (children) => `<p>${children}</p>`,
  heading: (children, { level }) => `<h${level}>${children}</h${level}>`
});
```

## RESOURCE

- **Source**: Built into Bun
- **Status**: Unstable (check for updates)
- **Performance**: Fast (Zig implementation)
- **Alternatives**: `marked`, `remark`, `markdown-it`

---

**USE THIS BASE FOR ALL BUN MARKDOWN OPERATIONS**
