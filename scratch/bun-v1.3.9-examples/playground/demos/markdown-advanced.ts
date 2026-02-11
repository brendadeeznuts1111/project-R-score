#!/usr/bin/env bun
/**
 * Demo: Advanced Markdown Features (v1.3.8)
 * 
 * Bun.markdown.html(), .render(), .react()
 * GFM extensions, custom callbacks
 */

console.log("📝 Bun v1.3.8: Advanced Markdown Features\n");
console.log("=".repeat(70));

// 1. Basic HTML rendering
console.log("\n1️⃣ Bun.markdown.html() - Render to HTML");
console.log("-".repeat(70));

const basic = `# Hello World

This is **bold** and *italic* text.

- Item 1
- Item 2
- Item 3`;

const html = Bun.markdown.html(basic);
console.log("Input:");
console.log(basic);
console.log("\nOutput:");
console.log(html);

// 2. GFM Extensions
console.log("\n2️⃣ GitHub Flavored Markdown Extensions");
console.log("-".repeat(70));

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
console.log(gfmHtml);

// 3. Custom render with callbacks
console.log("\n3️⃣ Bun.markdown.render() - Custom Callbacks");
console.log("-".repeat(70));

const custom = `# Title

Hello **world**`;

const customHtml = Bun.markdown.render(custom, {
  heading: (children, { level }) => 
    `<h${level} class="title">${children}</h${level}>`,
  paragraph: (children) => `<p class="text">${children}</p>`,
  strong: (children) => `<b class="bold">${children}</b>`,
});

console.log("Custom HTML with classes:");
console.log(customHtml);

// 4. ANSI terminal output
console.log("\n4️⃣ ANSI Terminal Output");
console.log("-".repeat(70));

const ansi = Bun.markdown.render("# Hello\n\n**bold**", {
  heading: (children) => `\x1b[1;4m${children}\x1b[0m\n`,
  paragraph: (children) => children + "\n",
  strong: (children) => `\x1b[1m${children}\x1b[22m`,
});

console.log("ANSI output:");
console.log(ansi);

// 5. Options
console.log("\n5️⃣ Markdown Options");
console.log("-".repeat(70));

const withOptions = Bun.markdown.html("## Hello World", {
  headingIds: true,
});

console.log("With headingIds:");
console.log(withOptions);

console.log("\n✅ Markdown features demo complete!");
