#!/usr/bin/env bun
/**
 * @fileoverview Simple, visual HTMLRewriter demo you can run locally to see transformations
 * @description A simplified HTMLRewriter demonstration showing basic transformations with visual output. Demonstrates element modification, content injection, text manipulation, and complete transformation workflows.
 * @module examples/demos/demo-html-rewriter-simple
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@6.1.1.0.0.0.0;instance-id=EXAMPLE-HTML-REWRITER-SIMPLE-001;version=6.1.1.0.0.0.0}]
 * [PROPERTIES:{example={value:"HTMLRewriter Simple Demo";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-DEMO"];@version:"6.1.1.0.0.0.0"}}]
 * [CLASS:HTMLRewriterSimpleDemo][#REF:v-6.1.1.0.0.0.0.BP.EXAMPLES.DEMO.1.0.A.1.1.EXAMPLE.1.1]]
 * 
 * Version: 6.1.1.0.0.0.0
 * Ripgrep Pattern: 6\.1\.1\.0\.0\.0\.0|EXAMPLE-HTML-REWRITER-SIMPLE-001|BP-EXAMPLE@6\.1\.1\.0\.0\.0\.0
 * 
 * @example 6.1.1.0.0.0.0.1: Basic Element Modification
 * // Test Formula:
 * // 1. Create HTMLRewriter with element handler
 * // 2. Transform HTML with element modifications
 * // 3. Verify attributes and content changes
 * // Expected Result: HTML elements modified with new attributes and content
 * //
 * // Snippet:
 * ```typescript
 * const rewriter = new HTMLRewriter()
 *   .on('h1', {
 *     element(el) {
 *       el.setAttribute('class', 'title');
 *       el.setAttribute('style', 'color: blue;');
 *     },
 *   });
 * const result = rewriter.transform(new Response(html));
 * ```
 * 
 * @see {@link https://bun.com/docs/runtime/html-rewriter Bun HTMLRewriter Documentation}
 * 
 * // Ripgrep: 6.1.1.0.0.0.0
 * // Ripgrep: EXAMPLE-HTML-REWRITER-SIMPLE-001
 * // Ripgrep: BP-EXAMPLE@6.1.1.0.0.0.0
 * 
 * Run: bun run scripts/demo-html-rewriter-simple.ts
 */

const HTMLRewriter = globalThis.HTMLRewriter;

if (!HTMLRewriter) {
  console.error('❌ HTMLRewriter is not available in this Bun version.');
  console.error('   Update Bun: bun upgrade');
  process.exit(1);
}

console.info('\n' + '═'.repeat(70));
console.info('  HTMLRewriter Visual Demo');
console.info('═'.repeat(70) + '\n');

// ═══════════════════════════════════════════════════════════════
// 6.1.1.0.0.0.0.4.0 ORIGINAL HTML
// ═══════════════════════════════════════════════════════════════

const originalHTML = `<!DOCTYPE html>
<html>
<head>
  <title>Original Page</title>
</head>
<body>
  <h1>Welcome</h1>
  <p class="intro">This is the original content.</p>
  <div class="content">
    <p>First paragraph</p>
    <p>Second paragraph</p>
  </div>
  <footer>Copyright 2024</footer>
</body>
</html>`;

console.info('📄 ORIGINAL HTML:');
console.info('-'.repeat(70));
console.info(originalHTML);
console.info('\n');

// ═══════════════════════════════════════════════════════════════
// 6.1.1.0.0.0.0.4.1 TRANSFORMATION 1: Basic Element Modification
// ═══════════════════════════════════════════════════════════════

console.info('🔧 TRANSFORMATION 1: Basic Element Modification');
console.info('-'.repeat(70));

const rewriter1 = new HTMLRewriter()
  .on('h1', {
    element(el) {
      el.setAttribute('class', 'title');
      el.setAttribute('style', 'color: blue;');
      el.prepend('🚀 ', { html: false });
    },
  })
  .on('p.intro', {
    element(el) {
      el.setAttribute('style', 'font-size: 1.2em; color: green;');
      el.append(' (Enhanced!)', { html: false });
    },
  })
  .on('footer', {
    element(el) {
      el.setInnerContent('© 2024 Enhanced Footer', { html: false });
    },
  });

const result1 = rewriter1.transform(new Response(originalHTML));
const transformed1 = await result1.text();

console.info('✅ RESULT:');
console.info(transformed1);
console.info('\n');

// ═══════════════════════════════════════════════════════════════
// 6.1.1.0.0.0.0.4.2 TRANSFORMATION 2: Content Injection
// ═══════════════════════════════════════════════════════════════

console.info('🔧 TRANSFORMATION 2: Content Injection');
console.info('-'.repeat(70));

const rewriter2 = new HTMLRewriter()
  .on('title', {
    element(el) {
      el.setInnerContent('Enhanced Page Title');
    },
  })
  .on('body', {
    element(el) {
      el.prepend('<div style="background: #f0f0f0; padding: 1rem; margin-bottom: 1rem;">📢 Banner: This page was enhanced by HTMLRewriter!</div>', { html: true });
    },
  })
  .on('.content', {
    element(el) {
      el.append('<p style="color: purple;"><strong>New paragraph added!</strong></p>', { html: true });
    },
  })
  .onDocument({
    end(end) {
      end.append('<script>console.info("Page enhanced by HTMLRewriter!");</script>', { html: true });
    },
  });

const result2 = rewriter2.transform(new Response(originalHTML));
const transformed2 = await result2.text();

console.info('✅ RESULT:');
console.info(transformed2);
console.info('\n');

// ═══════════════════════════════════════════════════════════════
// 6.1.1.0.0.0.0.4.3 TRANSFORMATION 3: Text Manipulation
// ═══════════════════════════════════════════════════════════════

console.info('🔧 TRANSFORMATION 3: Text Node Manipulation');
console.info('-'.repeat(70));

const rewriter3 = new HTMLRewriter()
  .on('p', {
    text(text) {
      // Replace "original" with "enhanced"
      if (text.text.includes('original')) {
        text.replace(text.text.replace(/original/gi, 'ENHANCED'));
      }
      // Add emoji to "Welcome"
      if (text.text.includes('Welcome')) {
        text.replace('👋 Welcome');
      }
    },
  })
  .on('h1', {
    text(text) {
      if (text.text.includes('Welcome')) {
        text.replace('👋 Welcome');
      }
    },
  });

const result3 = rewriter3.transform(new Response(originalHTML));
const transformed3 = await result3.text();

console.info('✅ RESULT:');
console.info(transformed3);
console.info('\n');

// ═══════════════════════════════════════════════════════════════
// 6.1.1.0.0.0.0.4.4 TRANSFORMATION 4: Complete Example (All Features)
// ═══════════════════════════════════════════════════════════════

console.info('🔧 TRANSFORMATION 4: Complete Example (All Features Combined)');
console.info('-'.repeat(70));

const rewriter4 = new HTMLRewriter()
  .on('title', {
    element(el) {
      el.setInnerContent('🚀 Enhanced Page - HTMLRewriter Demo');
    },
  })
  .on('h1', {
    element(el) {
      el.setAttribute('class', 'main-title');
      el.setAttribute('style', 'color: #667eea; font-size: 2.5em;');
      // Replace content at element level instead of text level to avoid duplication
      el.setInnerContent('👋 Welcome to HTMLRewriter', { html: false });
    },
  })
  .on('p.intro', {
    element(el) {
      el.setAttribute('class', 'intro enhanced');
      el.setAttribute('style', 'background: #f8f9fa; padding: 1rem; border-radius: 8px;');
    },
    text(text) {
      if (text.text.includes('original')) {
        text.replace(text.text.replace('original', '✨ enhanced'));
      }
    },
  })
  .on('.content p', {
    element(el) {
      el.setAttribute('style', 'margin: 0.5rem 0; padding: 0.5rem; border-left: 3px solid #667eea;');
    },
  })
  .on('footer', {
    element(el) {
      el.setAttribute('style', 'text-align: center; color: #666; margin-top: 2rem;');
      el.setInnerContent('© 2024 | Enhanced by Bun HTMLRewriter', { html: false });
    },
  })
  .onDocument({
    end(end) {
      end.append(`
<style>
  body { font-family: system-ui; max-width: 800px; margin: 0 auto; padding: 2rem; }
  .main-title { text-align: center; }
</style>
<script>
  console.info('✅ Page transformed by HTMLRewriter!');
  document.querySelectorAll('p').forEach(p => {
    p.addEventListener('click', () => {
      p.style.background = '#fff3cd';
      setTimeout(() => { p.style.background = ''; }, 1000);
    });
  });
</script>
      `, { html: true });
    },
  });

const result4 = rewriter4.transform(new Response(originalHTML));
const transformed4 = await result4.text();

console.info('✅ RESULT:');
console.info(transformed4);
console.info('\n');

// ═══════════════════════════════════════════════════════════════
// 6.1.1.0.0.0.0.4.5 SAVE TO FILE FOR VIEWING
// ═══════════════════════════════════════════════════════════════

const outputFile = Bun.file('demo-rewriter-output.html');
await Bun.write(outputFile, transformed4);

console.info('═'.repeat(70));
console.info('  Demo Complete!');
console.info('═'.repeat(70));
console.info('\n📁 Output saved to: demo-rewriter-output.html');
console.info('🌐 Open in browser: open demo-rewriter-output.html');
console.info('   Or: bun --bun demo-rewriter-output.html\n');
