# BUN MARKDOWN API - ELITE REFERENCE

## CORE METHODS

### `Bun.markdown.html(markdown: string, options?: Options): string` 
```javascript
// BASIC
const html = Bun.markdown.html("# Title");

// WITH OPTIONS
const html = Bun.markdown.html(markdown, {
  tables: true,
  strikethrough: true,
  tasklists: true,
  autolinks: true,
  headings: { ids: true }
});
```

### `Bun.markdown.render(markdown: string, callbacks: RenderCallbacks, options?: Options): string` 
```javascript
const output = Bun.markdown.render(markdown, {
  heading: (children, { level }) => `<h${level}>${children}</h${level}>`,
  paragraph: (children) => `<p>${children}</p>`,
  strong: (children) => `<strong>${children}</strong>` 
}, { tables: true });
```

### `Bun.markdown.react(markdown: string, components?: Components, options?: ReactOptions): ReactElement` 
```jsx
const element = Bun.markdown.react(markdown, {
  a: ({ href, children }) => <a href={href}>{children}</a>,
  h1: ({ children }) => <h1 className="title">{children}</h1>
}, { reactVersion: 18 });
```

---

## COMPLETE OPTIONS REFERENCE

### BOOLEAN OPTIONS
| Option | Default | Effect |
|--------|---------|--------|
| `tables` | `false` | `\| Tables \|` → `<table>` |
| `strikethrough` | `false` | `~~text~~` → `<del>` |
| `tasklists` | `false` | `- [x]` → `<li data-checked>` |
| `hardSoftBreaks` | `false` | Single newline → `<br>` |
| `wikiLinks` | `false` | `[[link]]` → `<a href="link">` |
| `underline` | `false` | `__text__` → `<u>` (not `<strong>`) |
| `latexMath` | `false` | `$E=mc^2$` → math element |
| `collapseWhitespace` | `false` | Collapse multiple spaces |
| `permissiveAtxHeaders` | `false` | Allow `#header` without space |
| `noIndentedCodeBlocks` | `false` | Disable 4-space code blocks |
| `noHtmlBlocks` | `false` | Disable HTML block parsing |
| `noHtmlSpans` | `false` | Disable inline HTML parsing |
| `tagFilter` | `false` | Filter dangerous HTML tags |

### OBJECT OPTIONS

#### `autolinks: boolean | { url?: boolean, www?: boolean, email?: boolean }` 
```javascript
// Enable all
{ autolinks: true }

// Specific types only
{ 
  autolinks: { 
    url: true,    // https://example.com
    www: true,    // www.example.com
    email: false  // user@example.com
  }
}
```

#### `headings: boolean | { ids?: boolean, autolink?: boolean }` 
```javascript
// Both IDs and anchor links
{ headings: true }
// <h2 id="title"><a href="#title">Title</a></h2>

// Only IDs
{ headings: { ids: true } }
// <h2 id="title">Title</h2>

// Only anchor links
{ headings: { autolink: true } }
// <h2><a href="#">Title</a></h2>
```

---

## RENDER CALLBACKS COMPLETE

### BLOCK CALLBACKS
```typescript
type RenderCallbacks = {
  // Structure
  heading: (children: string, meta: { level: number; id?: string }) => string | null;
  paragraph: (children: string) => string | null;
  blockquote: (children: string) => string | null;
  hr: () => string | null;
  
  // Code
  code: (children: string, meta: { language?: string }) => string | null;
  codespan: (children: string) => string | null;
  
  // Lists
  list: (children: string, meta: { ordered: boolean; start?: number }) => string | null;
  listItem: (children: string, meta: { checked?: boolean }) => string | null;
  
  // Tables
  table: (children: string) => string | null;
  thead: (children: string) => string | null;
  tbody: (children: string) => string | null;
  tr: (children: string) => string | null;
  th: (children: string, meta: { align?: "left" | "center" | "right" }) => string | null;
  td: (children: string, meta: { align?: "left" | "center" | "right" }) => string | null;
  
  // HTML
  html: (children: string) => string | null;
  
  // Inline
  strong: (children: string) => string | null;
  emphasis: (children: string) => string | null;
  link: (children: string, meta: { href: string; title?: string }) => string | null;
  image: (children: string, meta: { src: string; title?: string }) => string | null;
  strikethrough: (children: string) => string | null;
  text: (children: string) => string | null;
};
```

### CALLBACK PATTERNS

#### 1. HTML WITH CLASSES
```javascript
const renderer = {
  heading: (children, { level }) => 
    `<h${level} class="heading-${level}">${children}</h${level}>`,
  
  paragraph: (children) => 
    `<p class="paragraph">${children}</p>`,
  
  link: (children, { href }) => 
    `<a href="${href}" class="link">${children}</a>` 
};
```

#### 2. STRIP FORMATTING
```javascript
const plainTextRenderer = {
  heading: (children) => `${children}\n`,
  paragraph: (children) => `${children}\n`,
  strong: (children) => children,
  emphasis: (children) => children,
  link: (children) => children,
  image: () => '',
  code: (children) => children,
  codespan: (children) => children
};
```

#### 3. TERMINAL/ANSI OUTPUT
```javascript
const ansiRenderer = {
  heading: (children, { level }) => 
    `\x1b[1;3${level}m${children}\x1b[0m\n`,
  
  strong: (children) => 
    `\x1b[1m${children}\x1b[22m`,
  
  emphasis: (children) => 
    `\x1b[3m${children}\x1b[23m`,
  
  code: (children) => 
    `\x1b[90m${children}\x1b[0m` 
};
```

#### 4. CUSTOM DATA ATTRIBUTES
```javascript
const dataRenderer = {
  heading: (children, { level, id }) => 
    `<h${level} data-level="${level}" data-id="${id}">${children}</h${level}>`,
  
  link: (children, { href }) => 
    `<a href="${href}" data-external="${isExternal(href)}">${children}</a>`,
  
  image: (children, { src }) => 
    `<img src="${src}" alt="${children}" data-lazy="true">` 
};
```

---

## REACT COMPONENTS COMPLETE

### COMPONENT PROPS INTERFACE
```typescript
interface ReactComponents {
  // Headings
  h1?: (props: { id?: string; children: React.ReactNode }) => React.ReactElement;
  h2?: (props: { id?: string; children: React.ReactNode }) => React.ReactElement;
  h3?: (props: { id?: string; children: React.ReactNode }) => React.ReactElement;
  h4?: (props: { id?: string; children: React.ReactNode }) => React.ReactElement;
  h5?: (props: { id?: string; children: React.ReactNode }) => React.ReactElement;
  h6?: (props: { id?: string; children: React.ReactNode }) => React.ReactElement;
  
  // Block elements
  p?: (props: { children: React.ReactNode }) => React.ReactElement;
  blockquote?: (props: { children: React.ReactNode }) => React.ReactElement;
  pre?: (props: { language?: string; children: React.ReactNode }) => React.ReactElement;
  hr?: (props: {}) => React.ReactElement;
  
  // Lists
  ul?: (props: { children: React.ReactNode }) => React.ReactElement;
  ol?: (props: { start: number; children: React.ReactNode }) => React.ReactElement;
  li?: (props: { checked?: boolean; children: React.ReactNode }) => React.ReactElement;
  
  // Tables
  table?: (props: { children: React.ReactNode }) => React.ReactElement;
  thead?: (props: { children: React.ReactNode }) => React.ReactElement;
  tbody?: (props: { children: React.ReactNode }) => React.ReactElement;
  tr?: (props: { children: React.ReactNode }) => React.ReactElement;
  th?: (props: { align?: string; children: React.ReactNode }) => React.ReactElement;
  td?: (props: { align?: string; children: React.ReactNode }) => React.ReactElement;
  
  // Inline elements
  em?: (props: { children: React.ReactNode }) => React.ReactElement;
  strong?: (props: { children: React.ReactNode }) => React.ReactElement;
  a?: (props: { href: string; title?: string; children: React.ReactNode }) => React.ReactElement;
  img?: (props: { src: string; alt?: string; title?: string }) => React.ReactElement;
  code?: (props: { children: React.ReactNode }) => React.ReactElement;
  del?: (props: { children: React.ReactNode }) => React.ReactElement;
  br?: (props: {}) => React.ReactElement;
}
```

### REACT HOOKS INTEGRATION

#### 1. WITH STATE
```jsx
function InteractiveMarkdown({ content }) {
  const [expanded, setExpanded] = useState({});
  
  return Bun.markdown.react(content, {
    h2: ({ id, children }) => (
      <div className="section">
        <h2 id={id} onClick={() => setExpanded(s => ({...s, [id]: !s[id]}))}>
          {children} {expanded[id] ? '▼' : '▶'}
        </h2>
        {expanded[id] && <div className="content">...</div>}
      </div>
    ),
    
    pre: ({ language, children }) => {
      const [copied, setCopied] = useState(false);
      
      return (
        <div className="code-block">
          <button onClick={() => {
            navigator.clipboard.writeText(children);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <pre data-language={language}>{children}</pre>
        </div>
      );
    }
  });
}
```

#### 2. WITH CONTEXT
```jsx
const ThemeContext = createContext();

function ThemedMarkdown({ content }) {
  const theme = useContext(ThemeContext);
  
  return Bun.markdown.react(content, {
    h1: ({ children }) => (
      <h1 style={{ color: theme.colors.primary }}>
        {children}
      </h1>
    ),
    
    a: ({ href, children }) => (
      <a 
        href={href}
        style={{ color: theme.colors.link }}
        target="_blank"
      >
        {children}
      </a>
    ),
    
    code: ({ children }) => (
      <code style={{ 
        background: theme.colors.codeBg,
        color: theme.colors.codeText 
      }}>
        {children}
      </code>
    )
  });
}
```

#### 3. WITH REFS
```jsx
function ScrollableMarkdown({ content }) {
  const headingRefs = useRef({});
  
  useEffect(() => {
    // Track which headings are visible
  }, []);
  
  return Bun.markdown.react(content, {
    h2: ({ id, children }) => (
      <h2 
        id={id}
        ref={el => headingRefs.current[id] = el}
        className="heading"
      >
        {children}
      </h2>
    )
  });
}
```

---

## PERFORMANCE PATTERNS

### 1. CACHING STRATEGIES
```javascript
// Simple cache
const cache = new Map();

function cachedHtml(markdown, options) {
  const key = `${markdown}-${JSON.stringify(options)}`;
  if (cache.has(key)) return cache.get(key);
  
  const result = Bun.markdown.html(markdown, options);
  cache.set(key, result);
  return result;
}

// LRU Cache
class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }
  
  get(key) {
    if (!this.cache.has(key)) return null;
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }
  
  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}
```

### 2. MEMOIZATION
```jsx
// React component memoization
const MemoizedMarkdown = memo(function Markdown({ content }) {
  return Bun.markdown.react(content, memoizedComponents);
}, (prev, next) => prev.content === next.content);

// Factory with memoization
function createRenderer(options) {
  const memoized = memoizeOne((markdown) => 
    Bun.markdown.html(markdown, options)
  );
  
  return memoized;
}
```

### 3. LAZY PARSING
```javascript
// Parse only when needed
class LazyMarkdown {
  constructor(markdown, options) {
    this.markdown = markdown;
    this.options = options;
    this._html = null;
  }
  
  get html() {
    if (!this._html) {
      this._html = Bun.markdown.html(this.markdown, this.options);
    }
    return this._html;
  }
  
  render(callbacks) {
    return Bun.markdown.render(this.markdown, callbacks, this.options);
  }
}
```

---

## SECURITY PATTERNS

### 1. SAFE HTML CONFIGURATION
```javascript
const SAFE_CONFIG = {
  // Disable raw HTML
  noHtmlBlocks: true,
  noHtmlSpans: true,
  
  // Filter dangerous tags
  tagFilter: true,
  
  // Controlled autolinks
  autolinks: { 
    url: false, 
    www: false, 
    email: false 
  },
  
  // Enable useful features
  tables: true,
  strikethrough: true,
  headings: { ids: true }
};

// Safe renderer
const SAFE_RENDERER = {
  link: (children, { href }) => {
    if (!isSafeUrl(href)) return children;
    return `<a href="${escapeHtml(href)}">${escapeHtml(children)}</a>`;
  },
  
  image: (children, { src }) => {
    if (!isAllowedImage(src)) return '';
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(children)}">`;
  },
  
  text: (children) => escapeHtml(children)
};
```

### 2. CONTENT SANITIZATION
```javascript
import DOMPurify from 'dompurify';

function safeMarkdownHtml(markdown, options) {
  const html = Bun.markdown.html(markdown, {
    ...options,
    noHtmlBlocks: true,
    noHtmlSpans: true,
    tagFilter: true
  });
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'strong', 'em', 'a', 'code', 'pre', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    ALLOWED_ATTR: ['href', 'title', 'alt', 'src', 'id', 'class'],
    ALLOW_DATA_ATTR: false
  });
}
```

### 3. CSP-COMPLIANT OUTPUT
```javascript
function cspSafeRenderer() {
  return {
    // Remove inline event handlers
    link: (children, { href }) => 
      `<a href="${href}" rel="noopener noreferrer">${children}</a>`,
    
    // Add nonce to scripts
    html: (children) => {
      const nonce = generateNonce();
      return children.replace(
        /<script\b([^>]*)>/g, 
        `<script nonce="${nonce}" $1>` 
      );
    },
    
    // Sandbox iframes
    html: (children) => {
      return children.replace(
        /<iframe\b([^>]*)>/g,
        `<iframe sandbox="allow-same-origin" $1>` 
      );
    }
  };
}
```

---

## ADVANCED PATTERNS

### 1. PLUGIN SYSTEM
```javascript
class MarkdownPipeline {
  constructor(options) {
    this.options = options;
    this.preprocessors = [];
    this.postprocessors = [];
    this.renderHooks = {};
  }
  
  usePreprocessor(fn) {
    this.preprocessors.push(fn);
    return this;
  }
  
  usePostprocessor(fn) {
    this.postprocessors.push(fn);
    return this;
  }
  
  useRenderHook(type, fn) {
    if (!this.renderHooks[type]) this.renderHooks[type] = [];
    this.renderHooks[type].push(fn);
    return this;
  }
  
  render(markdown) {
    // Preprocess
    let processed = markdown;
    for (const pre of this.preprocessors) {
      processed = pre(processed);
    }
    
    // Render with hooks
    const callbacks = {};
    for (const [type, hooks] of Object.entries(this.renderHooks)) {
      callbacks[type] = (children, meta) => {
        let result = children;
        for (const hook of hooks) {
          result = hook(result, meta);
        }
        return result;
      };
    }
    
    const rendered = Bun.markdown.render(processed, callbacks, this.options);
    
    // Postprocess
    let final = rendered;
    for (const post of this.postprocessors) {
      final = post(final);
    }
    
    return final;
  }
}

// Usage
const pipeline = new MarkdownPipeline({ tables: true })
  .usePreprocessor(md => md.replace(/{{name}}/g, 'World'))
  .useRenderHook('heading', (text) => text.toUpperCase())
  .usePostprocessor(html => html.replace(/<img/g, '<img loading="lazy"'));
```

### 2. AST MANIPULATION
```javascript
function markdownToAST(markdown, options) {
  const ast = { type: 'root', children: [] };
  
  Bun.markdown.render(markdown, {
    heading: (children, meta) => {
      ast.children.push({
        type: 'heading',
        level: meta.level,
        id: meta.id,
        content: children,
        children: parseInline(children)
      });
      return '';
    },
    
    paragraph: (children) => {
      ast.children.push({
        type: 'paragraph',
        content: children,
        children: parseInline(children)
      });
      return '';
    }
    
    // ... more callbacks
  }, options);
  
  return ast;
}

// Process AST
function transformAST(ast, transformers) {
  function walk(node) {
    if (transformers[node.type]) {
      transformers[node.type](node);
    }
    if (node.children) {
      node.children.forEach(walk);
    }
  }
  walk(ast);
  return ast;
}
```

### 3. SERVER-SIDE RENDERING
```javascript
// Node.js/Server
import { renderToString } from 'react-dom/server';

function renderMarkdownToHTML(markdown, options = {}) {
  // For React Server Components
  const element = Bun.markdown.react(markdown, undefined, {
    ...options,
    reactVersion: 18
  });
  
  return renderToString(element);
}

// With streaming
import { renderToPipeableStream } from 'react-dom/server';

function streamMarkdown(res, markdown, options) {
  const element = Bun.markdown.react(markdown, undefined, options);
  
  const stream = renderToPipeableStream(element, {
    onShellReady() {
      stream.pipe(res);
    },
    onError(error) {
      console.error(error);
      res.status(500).send('Error rendering markdown');
    }
  });
}
```

### 4. REAL-TIME PREVIEW
```javascript
// Editor with live preview
function createMarkdownEditor(container) {
  const textarea = container.querySelector('textarea');
  const preview = container.querySelector('.preview');
  
  // Debounced render
  let renderTimeout;
  function updatePreview() {
    clearTimeout(renderTimeout);
    renderTimeout = setTimeout(() => {
      try {
        const element = Bun.markdown.react(textarea.value, {
          // Custom components for editor
          code: ({ children }) => (
            <code className="editor-code">{children}</code>
          ),
          
          pre: ({ language, children }) => (
            <pre className={`language-${language}`}>
              {children}
            </pre>
          )
        }, {
          tables: true,
          tasklists: true,
          headings: { ids: true }
        });
        
        // Update preview
        preview.innerHTML = '';
        preview.appendChild(element);
      } catch (error) {
        preview.textContent = `Error: ${error.message}`;
      }
    }, 100);
  }
  
  textarea.addEventListener('input', updatePreview);
  updatePreview();
}
```

---

## DEBUGGING & TESTING

### 1. DEBUG RENDERER
```javascript
function createDebugRenderer() {
  const calls = [];
  
  const renderer = new Proxy({}, {
    get(target, prop) {
      return (children, meta) => {
        calls.push({
          type: prop,
          children,
          meta,
          timestamp: Date.now()
        });
        
        // Pass through to default
        switch (prop) {
          case 'heading':
            return `<h${meta.level}>${children}</h${meta.level}>`;
          case 'paragraph':
            return `<p>${children}</p>`;
          // ... more defaults
          default:
            return children;
        }
      };
    }
  });
  
  return {
    renderer,
    getCalls: () => calls,
    reset: () => calls.length = 0
  };
}

// Usage
const debug = createDebugRenderer();
const result = Bun.markdown.render(markdown, debug.renderer);
console.log(debug.getCalls());
```

### 2. VALIDATION
```javascript
function validateMarkdown(markdown, options) {
  const errors = [];
  
  // Test render
  try {
    Bun.markdown.html(markdown, options);
  } catch (error) {
    errors.push({ type: 'parse', error: error.message });
  }
  
  // Check for potential issues
  if (markdown.includes('<script>')) {
    errors.push({ type: 'security', message: 'Contains script tags' });
  }
  
  // Validate link structure
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(markdown)) !== null) {
    const [, text, url] = match;
    if (!isValidUrl(url)) {
      errors.push({ 
        type: 'link', 
        text, 
        url, 
        message: 'Invalid URL' 
      });
    }
  }
  
  return errors;
}
```

---

## MIGRATION GUIDES

### FROM MARKED.JS
```javascript
// marked.js
const marked = require('marked');
const html = marked.parse(markdown);

// Bun equivalent
const html = Bun.markdown.html(markdown, {
  tables: true,
  strikethrough: true,
  tasklists: true,
  autolinks: true,
  headings: { ids: true },
  hardSoftBreaks: true
});
```

### FROM REACT-MARKDOWN
```jsx
// react-markdown
import ReactMarkdown from 'react-markdown';

function Component() {
  return <ReactMarkdown>{markdown}</ReactMarkdown>;
}

// Bun equivalent
function Component() {
  return Bun.markdown.react(markdown, undefined, {
    tables: true,
    strikethrough: true,
    autolinks: true
  });
}
```

### FROM REMARK/REHYPE
```javascript
// remark/rehype pipeline
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeStringify);

// Bun equivalent
const html = Bun.markdown.html(markdown, {
  tables: true,
  strikethrough: true,
  tasklists: true,
  autolinks: true,
  headings: { ids: true }
});
```

---

## ERROR CODES & SOLUTIONS

### COMMON ERRORS
```
1. "Callback not provided for element"
   Solution: Always provide paragraph callback at minimum

2. "Invalid React element"
   Solution: Use reactVersion: 18 for React 18 and older

3. "HTML injection blocked"
   Solution: Disable tagFilter or adjust security settings

4. "Memory limit exceeded"
   Solution: Chunk large markdown documents

5. "Invalid option combination"
   Solution: Check conflicting options like noHtmlBlocks with html callback
```

### DEBUG FLAGS
```javascript
// Enable debug logging
Bun.markdown.html(markdown, {
  tables: true,
  __debug: true  // If supported
});

// Or wrap with try/catch
try {
  const html = Bun.markdown.html(markdown, options);
} catch (error) {
  console.error('Markdown parse error:', {
    message: error.message,
    markdown: markdown.substring(0, 100),
    options
  });
}
```

---

## BENCHMARKS

```javascript
// Performance test
function benchmark(iterations = 1000) {
  const markdown = `# Test\n\n**Bold** and *italic*`;
  
  console.time('Bun.markdown.html');
  for (let i = 0; i < iterations; i++) {
    Bun.markdown.html(markdown, { tables: true });
  }
  console.timeEnd('Bun.markdown.html');
  
  console.time('Bun.markdown.render');
  for (let i = 0; i < iterations; i++) {
    Bun.markdown.render(markdown, {
      heading: (c, { l }) => `<h${l}>${c}</h${l}>`,
      paragraph: c => `<p>${c}</p>` 
    });
  }
  console.timeEnd('Bun.markdown.render');
}

// Memory usage
function measureMemory() {
  const before = process.memoryUsage().heapUsed;
  const result = Bun.markdown.html(largeMarkdown);
  const after = process.memoryUsage().heapUsed;
  
  console.log(`Memory used: ${(after - before) / 1024 / 1024} MB`);
}
```

---

## QUICK START CHEATSHEET

```javascript
// 1. SIMPLE HTML
const html = Bun.markdown.html(markdown, {
  tables: true,
  strikethrough: true,
  autolinks: true
});

// 2. CUSTOM RENDER
const output = Bun.markdown.render(markdown, {
  paragraph: c => `<p>${c}</p>`,
  heading: (c, { l }) => `<h${l}>${c}</h${l}>` 
});

// 3. REACT COMPONENTS
const element = Bun.markdown.react(markdown, {
  a: ({ href, c }) => <a href={href}>{c}</a>
}, { reactVersion: 18 });

// 4. SECURE CONFIG
const safe = Bun.markdown.html(userContent, {
  tagFilter: true,
  noHtmlBlocks: true,
  noHtmlSpans: true
});

// 5. PERFORMANT
const cached = memoize(md => 
  Bun.markdown.html(md, { tables: true })
);
```

---

**ELITE RULE:** Always test with your actual markdown content and validate output. The API is unstable - version-lock Bun and have fallback parsers ready.
