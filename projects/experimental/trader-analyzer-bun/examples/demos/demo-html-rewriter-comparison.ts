#!/usr/bin/env bun
/**
 * @fileoverview Side-by-side code comparison showing HTMLRewriter transformations
 * @description Demonstrates HTMLRewriter transformations with before/after code examples. Shows attribute manipulation, content injection, text replacement, element removal, and complete workflows.
 * @module examples/demos/demo-html-rewriter-comparison
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@6.1.3.0.0.0.0;instance-id=EXAMPLE-HTML-REWRITER-COMPARISON-001;version=6.1.3.0.0.0.0}]
 * [PROPERTIES:{example={value:"HTMLRewriter Comparison Demo";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-DEMO"];@version:"6.1.3.0.0.0.0"}}]
 * [CLASS:HTMLRewriterComparisonDemo][#REF:v-6.1.3.0.0.0.0.BP.EXAMPLES.DEMO.1.0.A.1.1.EXAMPLE.1.1]]
 * 
 * Version: 6.1.3.0.0.0.0
 * Ripgrep Pattern: 6\.1\.3\.0\.0\.0\.0|EXAMPLE-HTML-REWRITER-COMPARISON-001|BP-EXAMPLE@6\.1\.3\.0\.0\.0\.0
 * 
 * @example 6.1.3.0.0.0.0.1: Comparison Pattern
 * // Test Formula:
 * // 1. Display original HTML
 * // 2. Show transformation code
 * // 3. Apply HTMLRewriter transformation
 * // 4. Display transformed result
 * // Expected Result: Clear before/after comparison of HTML transformations
 * //
 * // Snippet:
 * ```typescript
 * console.info('Original HTML:', html);
 * console.info('Transformation Code:', code);
 * const result = rewriter.transform(html);
 * console.info('Result:', result);
 * ```
 * 
 * @see {@link https://bun.com/docs/runtime/html-rewriter Bun HTMLRewriter Documentation}
 * 
 * // Ripgrep: 6.1.3.0.0.0.0
 * // Ripgrep: EXAMPLE-HTML-REWRITER-COMPARISON-001
 * // Ripgrep: BP-EXAMPLE@6.1.3.0.0.0.0
 * 
 * Run: bun run scripts/demo-html-rewriter-comparison.ts
 */

const HTMLRewriter = globalThis.HTMLRewriter;

if (!HTMLRewriter) {
  console.error('❌ HTMLRewriter is not available in this Bun version.');
  process.exit(1);
}

console.info('\n' + '═'.repeat(70));
console.info('  HTMLRewriter Code Comparison Demo');
console.info('═'.repeat(70) + '\n');

// ═══════════════════════════════════════════════════════════════
// 6.1.3.0.0.0.0.4.0 EXAMPLE 1: Attribute Manipulation
// ═══════════════════════════════════════════════════════════════

console.info('📋 Example 1: Attribute Manipulation');
console.info('-'.repeat(70));

const html1 = '<div class="old">Content</div>';

console.info('📝 Original HTML:');
console.info(html1);
console.info('\n🔧 Transformation Code:');
console.info(`const rewriter = new HTMLRewriter()
  .on('div', {
    element(el) {
      el.setAttribute('class', 'new');
      el.setAttribute('data-enhanced', 'true');
      el.removeAttribute('old-attr');
    },
  });`);

const rewriter1 = new HTMLRewriter()
  .on('div', {
    element(el) {
      el.setAttribute('class', 'new');
      el.setAttribute('data-enhanced', 'true');
    },
  });

const result1 = rewriter1.transform(html1);
console.info('\n✅ Result:');
console.info(result1);
console.info('\n');

// ═══════════════════════════════════════════════════════════════
// 6.1.3.0.0.0.0.4.1 EXAMPLE 2: Content Injection
// ═══════════════════════════════════════════════════════════════

console.info('📋 Example 2: Content Injection');
console.info('-'.repeat(70));

const html2 = '<body><p>Hello</p></body>';

console.info('📝 Original HTML:');
console.info(html2);
console.info('\n🔧 Transformation Code:');
console.info(`const rewriter = new HTMLRewriter()
  .on('body', {
    element(el) {
      el.prepend('<header>Banner</header>', { html: true });
      el.append('<footer>Footer</footer>', { html: true });
    },
  })
  .on('p', {
    element(el) {
      el.before('<span>Before</span>', { html: true });
      el.after('<span>After</span>', { html: true });
    },
  });`);

const rewriter2 = new HTMLRewriter()
  .on('body', {
    element(el) {
      el.prepend('<header>Banner</header>', { html: true });
      el.append('<footer>Footer</footer>', { html: true });
    },
  })
  .on('p', {
    element(el) {
      el.before('<span>Before</span>', { html: true });
      el.after('<span>After</span>', { html: true });
    },
  });

const result2 = rewriter2.transform(html2);
console.info('\n✅ Result:');
console.info(result2);
console.info('\n');

// ═══════════════════════════════════════════════════════════════
// 6.1.3.0.0.0.0.4.2 EXAMPLE 3: Text Replacement
// ═══════════════════════════════════════════════════════════════

console.info('📋 Example 3: Text Node Replacement');
console.info('-'.repeat(70));

const html3 = '<p>This is the original text</p>';

console.info('📝 Original HTML:');
console.info(html3);
console.info('\n🔧 Transformation Code:');
console.info(`const rewriter = new HTMLRewriter()
  .on('p', {
    text(text) {
      text.replace(text.text.replace('original', 'enhanced'));
    },
  });`);

const rewriter3 = new HTMLRewriter()
  .on('p', {
    text(text) {
      text.replace(text.text.replace('original', 'enhanced'));
    },
  });

const result3 = rewriter3.transform(html3);
console.info('\n✅ Result:');
console.info(result3);
console.info('\n');

// ═══════════════════════════════════════════════════════════════
// 6.1.3.0.0.0.0.4.3 EXAMPLE 4: Element Removal
// ═══════════════════════════════════════════════════════════════

console.info('📋 Example 4: Element Removal');
console.info('-'.repeat(70));

const html4 = '<div><p>Keep this</p><script>Remove this</script><p>Keep this too</p></div>';

console.info('📝 Original HTML:');
console.info(html4);
console.info('\n🔧 Transformation Code:');
console.info(`const rewriter = new HTMLRewriter()
  .on('script', {
    element(el) {
      el.remove(); // Remove element and contents
    },
  });`);

const rewriter4 = new HTMLRewriter()
  .on('script', {
    element(el) {
      el.remove();
    },
  });

const result4 = rewriter4.transform(html4);
console.info('\n✅ Result:');
console.info(result4);
console.info('\n');

// ═══════════════════════════════════════════════════════════════
// 6.1.3.0.0.0.0.4.4 EXAMPLE 5: Complete Workflow
// ═══════════════════════════════════════════════════════════════

console.info('📋 Example 5: Complete Workflow');
console.info('-'.repeat(70));

const html5 = `<!DOCTYPE html>
<html>
<head><title>Page</title></head>
<body>
  <h1>Welcome</h1>
  <p class="intro">Introduction text</p>
  <div class="content">
    <p>Content paragraph</p>
  </div>
</body>
</html>`;

console.info('📝 Original HTML:');
console.info(html5);
console.info('\n🔧 Transformation Code:');
console.info(`const rewriter = new HTMLRewriter()
  .on('title', { element(el) { el.setInnerContent('Enhanced Page'); } })
  .on('h1', { element(el) { el.setAttribute('class', 'title'); } })
  .on('p.intro', { 
    element(el) { el.setAttribute('style', 'color: blue;'); },
    text(text) { text.replace('✨ ' + text.text); }
  })
  .onDocument({ 
    end(end) { end.append('<script>console.info("Enhanced!");</script>', { html: true }); }
  });`);

const rewriter5 = new HTMLRewriter()
  .on('title', {
    element(el) {
      el.setInnerContent('Enhanced Page');
    },
  })
  .on('h1', {
    element(el) {
      el.setAttribute('class', 'title');
    },
  })
  .on('p.intro', {
    element(el) {
      el.setAttribute('style', 'color: blue;');
    },
    text(text) {
      text.replace('✨ ' + text.text);
    },
  })
  .onDocument({
    end(end) {
      end.append('<script>console.info("Enhanced!");</script>', { html: true });
    },
  });

const result5 = rewriter5.transform(html5);
console.info('\n✅ Result:');
console.info(result5);
console.info('\n');

console.info('═'.repeat(70));
console.info('  Comparison Complete!');
console.info('═'.repeat(70));
console.info('\n💡 Key Takeaways:');
console.info('  • HTMLRewriter transforms HTML on-the-fly');
console.info('  • Multiple handlers can be chained');
console.info('  • Element, text, and comment handlers work together');
console.info('  • Document-level handlers for global changes');
console.info('  • All transformations are streaming (memory efficient)\n');
