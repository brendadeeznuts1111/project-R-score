# HTMLRewriter Demo - Quick Start Guide

## 🚀 Interactive Server Demo (Recommended)

Run the interactive web server to see HTMLRewriter in action:

```bash
bun run demo:html-rewriter:server
```

Then open: **http://localhost:3002**

### Features:
- ✅ Side-by-side comparison (Original vs Transformed)
- ✅ Multiple transformation modes (Basic, Advanced, Text-only)
- ✅ Real-time HTML transformation
- ✅ Interactive preview with iframes
- ✅ Click buttons to switch modes

### What You'll See:
1. **Original HTML** - The source HTML before transformation
2. **Transformed HTML** - The result after HTMLRewriter processes it
3. **Three transformation modes:**
   - **Basic**: Simple element modifications
   - **Advanced**: Full-featured transformation with styles and scripts
   - **Text Only**: Text node manipulation only

## 📄 Simple File-Based Demo

Generate a static HTML file to view:

```bash
bun run demo:html-rewriter:simple
```

This creates `demo-rewriter-output.html` which you can open in your browser.

## 🔬 Comprehensive API Demo

See all HTMLRewriter features:

```bash
bun run demo:html-rewriter
```

Shows:
- All input types (Response, string, ArrayBuffer, Blob, File)
- All CSS selector types
- Element operations
- Text operations
- Comment operations
- Document handlers
- Async transformations

## 📚 Documentation

Full API reference: `docs/BUN-HTML-REWRITER.md`

## 🎯 Real-World Example

Tag Dashboard using HTMLRewriter:

```bash
bun run tag:dashboard:rewriter
```

## Key Features Demonstrated

### Input Types
- ✅ Response objects
- ✅ Strings (Bun enhancement!)
- ✅ ArrayBuffers (Bun enhancement!)
- ✅ Blobs (with Response wrapper)
- ✅ Files (with Response wrapper)

### Transformations
- ✅ Element attribute manipulation
- ✅ Content injection (before, after, prepend, append)
- ✅ Text node replacement
- ✅ Comment removal
- ✅ Document-level handlers
- ✅ HTML content insertion (`{ html: true }`)

### CSS Selectors
- ✅ Tag, class, ID selectors
- ✅ Attribute selectors (9 variants)
- ✅ Combinators (descendant, direct child)
- ✅ Pseudo-classes (nth-child, first-child, etc.)
- ✅ Universal selector

## Bun vs Cloudflare Workers

| Feature | Bun | Cloudflare Workers |
|---------|-----|-------------------|
| String input | ✅ Direct | ❌ Requires Response |
| ArrayBuffer input | ✅ Direct | ❌ Requires Response |
| Response input | ✅ | ✅ |
| CSS Selectors | ✅ Full support | ✅ Full support |

## Next Steps

1. **Try the interactive server**: `bun run demo:html-rewriter:server`
2. **View the output file**: Open `demo-rewriter-output.html`
3. **Read the docs**: `docs/BUN-HTML-REWRITER.md`
4. **See real usage**: `src/hyper-bun/tag-dashboard-rewriter.tsx`
