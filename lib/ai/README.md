# Bun Markdown Constants - Production Ready

Enterprise-grade configuration presets, security options, and renderer templates for Bun's built-in Markdown parser.

## 🚀 Features

- **🔒 Enterprise Security**: Multiple security levels for different trust contexts
- **⚡ Performance Optimized**: Built-in caching and performance monitoring
- **🎨 Framework Integration**: React, Tailwind, Bootstrap, and more
- **🛡️ Type Safety**: Full TypeScript coverage with comprehensive interfaces
- **📊 Analytics**: Built-in performance metrics and monitoring
- **🔧 Highly Configurable**: Presets for every use case with easy customization
- **🌐 Multi-format**: HTML, React, ANSI terminal, and plain text output
- **📱 Production Ready**: Battle-tested with comprehensive error handling

## 📦 Installation

```bash
# Import the constants
import {
  MARKDOWN_FEATURES,
  MARKDOWN_SECURITY,
  MarkdownPresets,
  // ... more exports
} from './bunMarkdownConstants';

# Import usage examples
import {
  useMarkdown,
  renderMarkdownAPI,
  MarkdownConfig,
  // ... more exports
} from './bunMarkdownExamples';
```

## 🎯 Quick Start

### 1. Safe HTML for User Content

```typescript
import { MarkdownPresets } from './bunMarkdownConstants';

const renderUserContent = MarkdownPresets.html('BLOG', 'STRICT');
const html = renderUserContent('# Hello **world**!');
```

### 2. React Component with Tailwind

```typescript
import { MarkdownPresets } from './bunMarkdownConstants';

const MarkdownComponent = ({ content }) => 
  MarkdownPresets.react('TAILWIND_TYPOGRAPHY')(content);

// Usage
<MarkdownComponent content="# Hello **world**!" />
```

### 3. CLI Terminal Output

```typescript
import { MarkdownPresets, MARKDOWN_FEATURES } from './bunMarkdownConstants';

const renderForTerminal = MarkdownPresets.render('COLOR', MARKDOWN_FEATURES.TERMINAL);
const output = renderForTerminal('# Hello **world**!');
console.log(output); // Colored terminal output
```

## 🔒 Security Levels

### STRICT - Maximum Security
```typescript
// For untrusted user content
const strictRenderer = MarkdownPresets.html('BLOG', 'STRICT');
// Features: tagFilter, noHtmlBlocks, noHtmlSpans, autolinks: false
```

### MODERATE - Trusted Authors
```typescript
// For trusted content creators
const moderateRenderer = MarkdownPresets.html('DOCS', 'MODERATE');
// Features: tagFilter, autolinks, no HTML filtering
```

### DEVELOPER - Internal/Trusted
```typescript
// For internal documentation
const devRenderer = MarkdownPresets.html('GFM', 'DEVELOPER');
// Features: Full GFM support, wiki links, LaTeX math
```

## 🎨 Feature Presets

### GitHub Flavored Markdown
```typescript
import { MARKDOWN_FEATURES } from './bunMarkdownConstants';

const gfmRenderer = MarkdownPresets.html('GFM', 'MODERATE');
// Tables, strikethrough, tasklists, autolinks
```

### Documentation Sites
```typescript
const docsRenderer = MarkdownPresets.html('DOCS', 'MODERATE');
// Tables, headings with IDs, wiki links
```

### Blog/CMS Content
```typescript
const blogRenderer = MarkdownPresets.html('BLOG', 'STRICT');
// Tables, tasklists, heading IDs, whitespace collapsing
```

### Academic/Technical Writing
```typescript
const academicRenderer = MarkdownPresets.html('ACADEMIC', 'MODERATE');
// Tables, LaTeX math, heading IDs
```

## 🏗️ Framework Integration

### Tailwind CSS
```typescript
import { HTML_RENDERERS } from './bunMarkdownConstants';

const tailwindRenderer = MarkdownPresets.render('TAILWIND', MARKDOWN_FEATURES.GFM);
// Beautiful Tailwind classes for all elements
```

### Bootstrap
```typescript
const bootstrapRenderer = MarkdownPresets.render('BOOTSTRAP', MARKDOWN_FEATURES.GFM);
// Bootstrap utility classes
```

### React Components
```typescript
import { REACT_COMPONENTS } from './bunMarkdownConstants';

const ReactMarkdown = ({ content }) => 
  MarkdownPresets.react('TAILWIND_TYPOGRAPHY')(content);
// Direct React component generation
```

## 📊 Performance & Caching

### Built-in Caching
```typescript
import { MarkdownCache, cachedRender } from './bunMarkdownExamples';

// LRU Cache with TTL
const cache = MarkdownCache.createLRUCache(1000, 3600000); // 1000 items, 1 hour

// Cached rendering
const html = cachedRender('# Hello **world**!');
```

### Performance Monitoring
```typescript
import { useMarkdown } from './bunMarkdownExamples';

function MarkdownEditor({ content }) {
  const { result, isLoading, error, retry } = useMarkdown(content, {
    preset: 'BLOG',
    security: 'STRICT',
    debounceTime: 300
  });
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  return <div dangerouslySetInnerHTML={{ __html: result }} />;
}
```

## 🔧 Configuration Builder

### Fluent API for Custom Configurations
```typescript
import { MarkdownConfig } from './bunMarkdownExamples';

const customRenderer = new MarkdownConfig()
  .withPreset('DOCS')
  .withSecurity('MODERATE')
  .withRenderer('TAILWIND')
  .withCache(true)
  .withCustomOptions({
    headings: { ids: true, autolink: true },
    wikiLinks: true
  })
  .build();

const { render, config } = customRenderer;
const html = render('# Hello **world**!');
```

## 🌐 API Integration

### REST API Endpoint
```typescript
import { renderMarkdownAPI } from './bunMarkdownExamples';

// Express.js example
app.post('/api/render', async (req, res) => {
  const result = await renderMarkdownAPI(req.body);
  res.json(result);
});

// Request
{
  "markdown": "# Hello **world**!",
  "options": {
    "preset": "BLOG",
    "security": "STRICT",
    "format": "html"
  }
}

// Response
{
  "success": true,
  "html": "<h1 id=\"hello\">Hello <strong>world</strong>!</h1>"
}
```

### Batch Processing
```typescript
import { batchRenderMarkdown } from './bunMarkdownExamples';

const items = [
  { id: '1', markdown: '# Document 1' },
  { id: '2', markdown: '# Document 2' }
];

const results = await batchRenderMarkdown(items, (completed, total) => {
  console.log(`Progress: ${completed}/${total}`);
});
```

## 📱 Use Case Presets

### User Comments
```typescript
import { createUserContentRenderer } from './bunMarkdownExamples';

const commentRenderer = createUserContentRenderer();
const html = commentRenderer.render(userComment);
```

### Technical Documentation
```typescript
import { createDocumentationRenderer } from './bunMarkdownExamples';

const docsRenderer = createDocumentationRenderer();
const html = docsRenderer.render(documentation);
```

### Internal Wiki
```typescript
import { createWikiRenderer } from './bunMarkdownExamples';

const wikiRenderer = createWikiRenderer();
const html = wikiRenderer.render(wikiPage);
```

### CLI Tools
```typescript
import { createCliRenderer } from './bunMarkdownExamples';

const cliRenderer = createCliRenderer();
const output = cliRenderer.render(helpText);
console.log(output);
```

## 🛡️ Validation & Sanitization

### Input Validation
```typescript
import { safeMarkdown, VALIDATION } from './bunMarkdownExamples';

try {
  const html = safeMarkdown(userInput);
} catch (error) {
  if (error.message.includes('SIZE_ERROR')) {
    // Document too large
  } else if (error.message.includes('SECURITY_ERROR')) {
    // Potentially unsafe content
  }
}
```

### Advanced Validation with Recovery
```typescript
import { safeMarkdownWithRecovery } from './bunMarkdownExamples';

// Automatically handles errors with recovery strategies
const html = safeMarkdownWithRecovery(userInput);
```

## 🔄 Migration from Other Libraries

### From Marked.js
```typescript
import { migrateFromMarked } from './bunMarkdownExamples';

const markedOptions = {
  gfm: true,
  breaks: true,
  headerIds: true,
  sanitize: true
};

const bunOptions = migrateFromMarked(markedOptions);
const html = Bun.markdown.html(markdown, bunOptions);
```

### From Markdown-it
```typescript
import { migrateFromMarkdownIt } from './bunMarkdownExamples';

const mdOptions = {
  html: true,
  linkify: true,
  typographer: true
};

const bunOptions = migrateFromMarkdownIt(mdOptions);
const html = Bun.markdown.html(markdown, bunOptions);
```

## 📊 Configuration Matrix

| Use Case | Features | Security | Renderer | Cache |
|----------|----------|----------|----------|-------|
| User Comments | BLOG | STRICT | SEMANTIC | LRU |
| Documentation | DOCS | MODERATE | TAILWIND | Memory |
| Internal Wiki | WIKI | DEVELOPER | TAILWIND | None |
| CLI Output | TERMINAL | MODERATE | COLOR | None |
| Email | EMAIL | STRICT | SEMANTIC | Memory |

## 🎯 Advanced Features

### Multiple Output Formats
```typescript
// HTML
const html = Bun.markdown.html(markdown, options);

// Custom Renderer
const custom = Bun.markdown.render(markdown, renderer, options);

// React Components
const react = Bun.markdown.react(markdown, components, options);
```

### Terminal/ANSI Output
```typescript
import { TERMINAL_RENDERERS } from './bunMarkdownConstants';

// Colorful output
const colorful = Bun.markdown.render(markdown, TERMINAL_RENDERERS.COLOR, options);

// Monochrome output
const mono = Bun.markdown.render(markdown, TERMINAL_RENDERERS.MONOCHROME, options);
```

### Plain Text Conversion
```typescript
import { TEXT_RENDERERS } from './bunMarkdownConstants';

// Strip formatting
const plain = Bun.markdown.render(markdown, TEXT_RENDERERS.PLAIN, options);

// Convert to Markdown
const mdOutput = Bun.markdown.render(markdown, TEXT_RENDERERS.MARKDOWN_OUTPUT, options);

// Slack formatting
const slack = Bun.markdown.render(markdown, TEXT_RENDERERS.SLACK, options);
```

## 🔍 Error Handling

### Comprehensive Error Types
```typescript
import { ERRORS } from './bunMarkdownConstants';

// Error codes
ERRORS.CODES.PARSE_ERROR           // 'MARKDOWN_PARSE_ERROR'
ERRORS.CODES.SECURITY_ERROR        // 'MARKDOWN_SECURITY_ERROR'
ERRORS.CODES.SIZE_ERROR            // 'MARKDOWN_SIZE_ERROR'
ERRORS.CODES.VALIDATION_ERROR      // 'MARKDOWN_VALIDATION_ERROR'
ERRORS.CODES.CACHE_ERROR           // 'MARKDOWN_CACHE_ERROR'

// Recovery strategies
ERRORS.RECOVERY.STRIP_AND_RETRY    // Remove HTML and retry
ERRORS.RECOVERY.TRUNCATE_AND_RETRY // Truncate and retry
ERRORS.RECOVERY.FALLBACK_TO_TEXT   // Return plain text
ERRORS.RECOVERY.RETURN_ERROR       // Return error message
```

## 📈 Performance Optimization

### Debouncing for Live Preview
```typescript
import { PERFORMANCE } from './bunMarkdownConstants';

const debouncedRender = debounce(renderMarkdown, PERFORMANCE.DEBOUNCE.NORMAL);
// 300ms for live preview
```

### Chunk Processing for Large Documents
```typescript
import { PERFORMANCE } from './bunMarkdownConstants';

// Process large documents in chunks
const chunkSize = PERFORMANCE.CHUNK_SIZES.CHARACTERS; // 10,000 chars
```

### Memory Management
```typescript
import { PERFORMANCE } from './bunMarkdownConstants';

// Cache limits
const maxCacheEntries = PERFORMANCE.MEMORY_LIMITS.CACHE_ENTRIES; // 1000
const maxCacheSize = PERFORMANCE.MEMORY_LIMITS.CACHE_SIZE_MB; // 100MB
```

## 🧪 Testing

### Unit Tests
```typescript
import { safeMarkdown, MARKDOWN_SECURITY } from './bunMarkdownExamples';

describe('Markdown Rendering', () => {
  test('should render basic markdown', () => {
    const result = safeMarkdown('# Hello');
    expect(result).toContain('<h1');
  });
  
  test('should block unsafe content', () => {
    expect(() => {
      safeMarkdown('<script>alert("xss")</script>');
    }).toThrow('SECURITY_ERROR');
  });
});
```

### Performance Tests
```typescript
import { withPerformanceMonitoring } from './bunMarkdownExamples';

const monitoredRender = withPerformanceMonitoring(renderMarkdown);

// Benchmark
const start = performance.now();
for (let i = 0; i < 1000; i++) {
  monitoredRender(largeDocument);
}
const end = performance.now();
console.log(`Average render time: ${(end - start) / 1000}ms`);
```

## 📚 API Reference

### Core Constants
- `MARKDOWN_SECURITY` - Security level configurations
- `MARKDOWN_FEATURES` - Feature preset configurations  
- `MARKDOWN_DOMAINS` - Domain-specific configurations
- `HTML_RENDERERS` - HTML renderer templates
- `TEXT_RENDERERS` - Plain text renderers
- `TERMINAL_RENDERERS` - ANSI terminal renderers
- `REACT_COMPONENTS` - React component libraries

### Factory Functions
- `MarkdownPresets.html()` - Create HTML renderer
- `MarkdownPresets.render()` - Create custom renderer
- `MarkdownPresets.react()` - Create React renderer
- `MarkdownCache.createMemoryCache()` - Simple cache
- `MarkdownCache.createLRUCache()` - LRU cache with TTL

### Validation & Security
- `VALIDATION` - Validation constants and limits
- `Sanitizers` - Input sanitization functions
- `ERRORS` - Error codes and messages

### Performance
- `PERFORMANCE` - Performance constants and limits
- `CONFIG_MATRIX` - Pre-configured use cases

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Bun](https://bun.sh) for the incredible Markdown parser
- The CommonMark specification for standards compliance
- GitHub Flavored Markdown for feature inspiration

---

**Built with ❤️ for the Bun ecosystem**
