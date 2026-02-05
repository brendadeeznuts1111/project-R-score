# 🚀 HTMLRewriter Demo Suite - Complete Guide

## 🎯 What's Available

You now have **4 different ways** to explore and test HTMLRewriter:

### 1. 📊 Interactive Web Server (Port 3002)
**Best for:** Visual side-by-side comparison

```bash
bun run demo:html-rewriter:server
```

**Features:**
- ✅ Side-by-side iframe comparison
- ✅ Three transformation modes (Basic, Advanced, Text-only)
- ✅ Click buttons to switch modes
- ✅ Auto-refresh every 5 seconds
- ✅ See original and transformed HTML side-by-side

**Open:** http://localhost:3002

---

### 2. 🎨 Live HTML Editor (Port 3003)
**Best for:** Experimenting with your own HTML

```bash
bun run demo:html-rewriter:editor
```

**Features:**
- ✅ Edit HTML directly in browser
- ✅ Real-time transformation
- ✅ Multiple transformation modes
- ✅ Load example HTML for each mode
- ✅ See code and preview side-by-side
- ✅ Error handling and status messages

**Open:** http://localhost:3003

**Transformation Modes:**
- **Add Attributes**: Adds `data-processed` and classes
- **Inject Content**: Adds banners and emojis
- **Text Replace**: Replaces words (the → THE, a → A)
- **Remove Elements**: Removes scripts and styles
- **Custom**: Custom styling transformations

---

### 3. 📝 Code Comparison Demo
**Best for:** Understanding how code works

```bash
bun run demo:html-rewriter:compare
```

**Shows:**
- ✅ Before/after HTML examples
- ✅ Transformation code snippets
- ✅ Real transformation results
- ✅ 5 complete examples
- ✅ Code comments explaining each step

---

### 4. 📄 Static File Generator
**Best for:** Quick file output

```bash
bun run demo:html-rewriter:simple
```

**Creates:** `demo-rewriter-output.html`

**Features:**
- ✅ Shows 4 different transformations
- ✅ Saves final result to HTML file
- ✅ Opens automatically in browser
- ✅ Console output showing each step

---

## 🎮 Quick Start

### Try the Live Editor First (Recommended!)

```bash
# Start the live editor
bun run demo:html-rewriter:editor

# Browser should open automatically to http://localhost:3003
# If not, open it manually
```

**What to do:**
1. HTML is pre-loaded in the editor
2. Select a transformation mode from dropdown
3. Click "Transform" button
4. See the result in the right panel
5. Try editing the HTML and transforming again!

### Then Try the Interactive Server

```bash
# Start the interactive server
bun run demo:html-rewriter:server

# Open http://localhost:3002
```

**What to do:**
1. See original HTML on the left
2. See transformed HTML on the right
3. Click buttons to switch transformation modes
4. Compare the differences visually

---

## 📚 All Available Scripts

```bash
# Interactive demos
bun run demo:html-rewriter:server      # Port 3002 - Side-by-side comparison
bun run demo:html-rewriter:editor      # Port 3003 - Live HTML editor

# Code examples
bun run demo:html-rewriter:compare      # Code comparison examples
bun run demo:html-rewriter:simple      # Generate static HTML file
bun run demo:html-rewriter             # Comprehensive API demo (all features)

# Real-world usage
bun run tag:dashboard:rewriter         # Tag dashboard using HTMLRewriter
```

---

## 🔍 What Each Demo Shows

### Interactive Server (3002)
- **Original HTML**: Static template
- **Transformed HTML**: Updates based on selected mode
- **Modes**: Basic, Advanced, Text-only
- **Best for**: Understanding transformations visually

### Live Editor (3003)
- **Input HTML**: Editable textarea
- **Output HTML**: Live preview iframe
- **Modes**: 5 different transformation types
- **Best for**: Experimenting with your own HTML

### Code Comparison
- **Shows**: Code snippets + results
- **Examples**: 5 complete patterns
- **Best for**: Learning the API

### Simple Demo
- **Shows**: 4 transformations sequentially
- **Output**: Static HTML file
- **Best for**: Quick file generation

### Comprehensive Demo
- **Shows**: All HTMLRewriter features
- **Covers**: Input types, selectors, operations
- **Best for**: Complete API reference

---

## 💡 Key Learnings

### HTMLRewriter Basics

1. **Create a rewriter:**
   ```typescript
   const rewriter = new HTMLRewriter();
   ```

2. **Add handlers:**
   ```typescript
   rewriter.on('selector', {
     element(el) { /* modify element */ },
     text(text) { /* modify text */ },
     comments(comment) { /* modify comments */ },
   });
   ```

3. **Transform:**
   ```typescript
   const result = rewriter.transform(html);
   ```

### Bun Enhancements

- ✅ **Strings work directly**: `rewriter.transform("<div>content</div>")`
- ✅ **ArrayBuffers work directly**: `rewriter.transform(buffer)`
- ⚠️ **Blob/File need Response wrapper** in Bun 1.3.3

### Common Patterns

- **Add attributes**: `el.setAttribute('key', 'value')`
- **Inject content**: `el.append('<div>content</div>', { html: true })`
- **Replace text**: `text.replace('new text')`
- **Remove elements**: `el.remove()`
- **Document handlers**: `rewriter.onDocument({ end(end) { ... } })`

---

## 🎯 Next Steps

1. **Start with Live Editor**: `bun run demo:html-rewriter:editor`
2. **Try Interactive Server**: `bun run demo:html-rewriter:server`
3. **See Code Examples**: `bun run demo:html-rewriter:compare`
4. **Read Full Docs**: `docs/BUN-HTML-REWRITER.md`
5. **Check Real Usage**: `src/hyper-bun/tag-dashboard-rewriter.tsx`

---

## 🆘 Troubleshooting

**Servers not starting?**
- Check if ports 3002/3003 are already in use
- Kill existing processes: `lsof -ti:3002 | xargs kill`

**HTMLRewriter not found?**
- Update Bun: `bun upgrade`
- Check version: `bun --version` (needs 1.3.3+)

**Transformations not working?**
- Check selector syntax
- Verify HTML structure matches selectors
- Use `{ html: true }` for HTML content

---

## 📖 Documentation

- **Quick Start**: `docs/HTML-REWRITER-QUICK-START.md`
- **Full API**: `docs/BUN-HTML-REWRITER.md`
- **Official Docs**: https://bun.com/docs/runtime/html-rewriter

---

## 🎉 You're Ready!

Both servers are running:
- **Interactive Server**: http://localhost:3002
- **Live Editor**: http://localhost:3003

Open them in your browser and start experimenting! 🚀
