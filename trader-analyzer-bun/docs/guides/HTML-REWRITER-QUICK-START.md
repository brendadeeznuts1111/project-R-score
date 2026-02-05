# HTMLRewriter Quick Start Guide

## 🚀 Three Ways to Test HTMLRewriter

### 1. Interactive Web Server (Best for Visual Learning)

```bash
bun run demo:html-rewriter:server
```

**Open:** http://localhost:3002

**Features:**
- Side-by-side comparison (Original vs Transformed)
- Three transformation modes
- Real-time preview
- Click buttons to switch modes

### 2. Live HTML Editor (Best for Experimentation)

```bash
bun run demo:html-rewriter:editor
```

**Open:** http://localhost:3003

**Features:**
- Edit HTML directly in browser
- See transformations in real-time
- Multiple transformation modes
- Load example HTML
- Side-by-side code and preview

### 3. Code Comparison Demo (Best for Understanding)

```bash
bun run demo:html-rewriter:compare
```

**Shows:**
- Before/after code examples
- Transformation code snippets
- Real results
- Multiple use cases

## 📚 Quick Examples

### Basic Element Modification

```typescript
const rewriter = new HTMLRewriter()
  .on('h1', {
    element(el) {
      el.setAttribute('class', 'title');
      el.setAttribute('style', 'color: blue;');
    },
  });

const result = rewriter.transform('<h1>Hello</h1>');
console.log(result); // '<h1 class="title" style="color: blue;">Hello</h1>'
```

### Content Injection

```typescript
const rewriter = new HTMLRewriter()
  .on('body', {
    element(el) {
      el.prepend('<header>Banner</header>', { html: true });
      el.append('<footer>Footer</footer>', { html: true });
    },
  });

const result = rewriter.transform(new Response('<body><p>Content</p></body>'));
```

### Text Replacement

```typescript
const rewriter = new HTMLRewriter()
  .on('p', {
    text(text) {
      text.replace(text.text.replace('old', 'new'));
    },
  });
```

### Multiple Handlers

```typescript
const rewriter = new HTMLRewriter()
  .on('div.content', {
    element(el) {
      el.setAttribute('class', 'enhanced');
    },
    text(text) {
      text.replace('Enhanced: ' + text.text);
    },
    comments(comment) {
      comment.remove();
    },
  });
```

## 🎯 Common Patterns

### Pattern 1: Add Attributes to All Elements

```typescript
rewriter.on('*', {
  element(el) {
    el.setAttribute('data-processed', 'true');
  },
});
```

### Pattern 2: Inject Scripts/CSS

```typescript
rewriter.onDocument({
  end(end) {
    end.append('<script>console.log("Enhanced!");</script>', { html: true });
  },
});
```

### Pattern 3: Remove Specific Elements

```typescript
rewriter.on('script, style', {
  element(el) {
    el.remove();
  },
});
```

### Pattern 4: Transform Based on Content

```typescript
rewriter.on('p', {
  text(text) {
    if (text.text.includes('important')) {
      text.replace('<strong>' + text.text + '</strong>', { html: true });
    }
  },
});
```

## 🔍 Input Types

```typescript
// ✅ String (Bun enhancement!)
rewriter.transform("<div>content</div>"); // Returns string

// ✅ ArrayBuffer (Bun enhancement!)
rewriter.transform(buffer); // Returns ArrayBuffer

// ✅ Response
rewriter.transform(new Response("<div>content</div>")); // Returns Response

// ⚠️ Blob (needs Response wrapper in Bun 1.3.3)
rewriter.transform(new Response(blob));

// ⚠️ File (needs Response wrapper in Bun 1.3.3)
rewriter.transform(new Response(Bun.file("index.html")));
```

## 📖 Next Steps

1. **Try the interactive server**: `bun run demo:html-rewriter:server`
2. **Experiment with the editor**: `bun run demo:html-rewriter:editor`
3. **See code examples**: `bun run demo:html-rewriter:compare`
4. **Read full docs**: `docs/BUN-HTML-REWRITER.md`
5. **See real usage**: `src/hyper-bun/tag-dashboard-rewriter.tsx`
6. **[Integration Guide](../INTEGRATION-GUIDE.md)** - How HTMLRewriter integrates with PORT constants, CLI tools, and Registry HTML access
7. **[Registry HTML Access](../REGISTRY-HTML-ACCESS.md)** - Using HTMLRewriter in production (registry.html)

## 🆘 Troubleshooting

**HTMLRewriter not found?**
```bash
bun upgrade  # Update to latest Bun version
```

**Transformations not working?**
- Check selector syntax
- Verify HTML structure matches selectors
- Use `{ html: true }` for HTML content insertion

**Need help?**
- Check `docs/BUN-HTML-REWRITER.md` for complete API reference
- Run `bun run demo:html-rewriter` to see all features
