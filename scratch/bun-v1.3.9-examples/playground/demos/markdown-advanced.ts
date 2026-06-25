#!/usr/bin/env bun
/**
 * Demo: Advanced Markdown Features (v1.3.8)
 * 
 * Bun.markdown.html(), .render(), .react()
 * GFM extensions, custom callbacks
 */

console.info("📝 Bun v1.3.8: Advanced Markdown Features\n");
console.info("=".repeat(70));

// 1. Basic HTML rendering
console.info("\n1️⃣ Bun.markdown.html() - Render to HTML");
console.info("-".repeat(70));

const basic = `# Hello World

This is **bold** and *italic* text.

- Item 1
- Item 2
- Item 3`;

const html = Bun.markdown.html(basic);
console.info("Input:");
console.info(basic);
console.info("\nOutput:");
console.info(html);

// 2. GFM Extensions
console.info("\n2️⃣ GitHub Flavored Markdown Extensions");
console.info("-".repeat(70));

const gfm = `# GFM Demo

## Table
| Name | Value |
|------|-------|
| Bun  | Fast  |
| Node | Slow  |

## Task List
- [x] Implemented
- [ ] Pending

## Strikethrough
This is ~~deleted~~ text.

## Autolink
Check out https://bun.sh`;

const gfmHtml = Bun.markdown.html(gfm);
console.info(gfmHtml);

// 3. Custom render with callbacks
console.info("\n3️⃣ Bun.markdown.render() - Custom Callbacks");
console.info("-".repeat(70));

const custom = `# Title

Hello **world**`;

const customHtml = Bun.markdown.render(custom, {
  heading: (children, { level }) => 
    `<h${level} class="title">${children}</h${level}>`,
  paragraph: (children) => `<p class="text">${children}</p>`,
  strong: (children) => `<b class="bold">${children}</b>`,
});

console.info("Custom HTML with classes:");
console.info(customHtml);

// 4. ANSI terminal output
console.info("\n4️⃣ ANSI Terminal Output");
console.info("-".repeat(70));

const ansi = Bun.markdown.render("# Hello\n\n**bold**", {
  heading: (children) => `\x1b[1;4m${children}\x1b[0m\n`,
  paragraph: (children) => children + "\n",
  strong: (children) => `\x1b[1m${children}\x1b[22m`,
});

console.info("ANSI output:");
console.info(ansi);

// 5. Options
console.info("\n5️⃣ Markdown Options");
console.info("-".repeat(70));

const withOptions = Bun.markdown.html("## Hello World", {
  headingIds: true,
});

console.info("With headingIds:");
console.info(withOptions);

console.info("\n✅ Markdown features demo complete!");
