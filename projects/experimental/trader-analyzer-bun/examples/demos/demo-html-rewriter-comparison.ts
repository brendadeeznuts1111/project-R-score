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
 * console.log('Original HTML:', html);
 * console.log('Transformation Code:', code);
 * const result = rewriter.transform(html);
 * console.log('Result:', result);
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

console.log('\n' + '═'.repeat(70));
console.log('  HTMLRewriter Code Comparison Demo');
console.log('═'.repeat(70) + '\n');

// ═══════════════════════════════════════════════════════════════
// 6.1.3.0.0.0.0.4.0 EXAMPLE 1: Attribute Manipulation
// ═══════════════════════════════════════════════════════════════

console.log('📋 Example 1: Attribute Manipulation');
console.log('-'.repeat(70));

const html1 = '<div class="old">Content</div>';

console.log('📝 Original HTML:');
console.log(html1);
console.log('\n🔧 Transformation Code:');
console.log(`const rewriter = new HTMLRewriter()
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
console.log('\n✅ Result:');
console.log(result1);
console.log('\n');

// ═══════════════════════════════════════════════════════════════
// 6.1.3.0.0.0.0.4.1 EXAMPLE 2: Content Injection
// ═══════════════════════════════════════════════════════════════

console.log('📋 Example 2: Content Injection');
console.log('-'.repeat(70));

const html2 = '<body><p>Hello</p></body>';

console.log('📝 Original HTML:');
console.log(html2);
console.log('\n🔧 Transformation Code:');
console.log(`const rewriter = new HTMLRewriter()
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
console.log('\n✅ Result:');
console.log(result2);
console.log('\n');

// ═══════════════════════════════════════════════════════════════
// 6.1.3.0.0.0.0.4.2 EXAMPLE 3: Text Replacement
// ═══════════════════════════════════════════════════════════════

console.log('📋 Example 3: Text Node Replacement');
console.log('-'.repeat(70));

const html3 = '<p>This is the original text</p>';

console.log('📝 Original HTML:');
console.log(html3);
console.log('\n🔧 Transformation Code:');
console.log(`const rewriter = new HTMLRewriter()
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
console.log('\n✅ Result:');
console.log(result3);
console.log('\n');

// ═══════════════════════════════════════════════════════════════
// 6.1.3.0.0.0.0.4.3 EXAMPLE 4: Element Removal
// ═══════════════════════════════════════════════════════════════

console.log('📋 Example 4: Element Removal');
console.log('-'.repeat(70));

const html4 = '<div><p>Keep this</p><script>Remove this</script><p>Keep this too</p></div>';

console.log('📝 Original HTML:');
console.log(html4);
console.log('\n🔧 Transformation Code:');
console.log(`const rewriter = new HTMLRewriter()
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
console.log('\n✅ Result:');
console.log(result4);
console.log('\n');

// ═══════════════════════════════════════════════════════════════
// 6.1.3.0.0.0.0.4.4 EXAMPLE 5: Complete Workflow
// ═══════════════════════════════════════════════════════════════

console.log('📋 Example 5: Complete Workflow');
console.log('-'.repeat(70));

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

console.log('📝 Original HTML:');
console.log(html5);
console.log('\n🔧 Transformation Code:');
console.log(`const rewriter = new HTMLRewriter()
  .on('title', { element(el) { el.setInnerContent('Enhanced Page'); } })
  .on('h1', { element(el) { el.setAttribute('class', 'title'); } })
  .on('p.intro', { 
    element(el) { el.setAttribute('style', 'color: blue;'); },
    text(text) { text.replace('✨ ' + text.text); }
  })
  .onDocument({ 
    end(end) { end.append('<script>console.log("Enhanced!");</script>', { html: true }); }
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
      end.append('<script>console.log("Enhanced!");</script>', { html: true });
    },
  });

const result5 = rewriter5.transform(html5);
console.log('\n✅ Result:');
console.log(result5);
console.log('\n');

console.log('═'.repeat(70));
console.log('  Comparison Complete!');
console.log('═'.repeat(70));
console.log('\n💡 Key Takeaways:');
console.log('  • HTMLRewriter transforms HTML on-the-fly');
console.log('  • Multiple handlers can be chained');
console.log('  • Element, text, and comment handlers work together');
console.log('  • Document-level handlers for global changes');
console.log('  • All transformations are streaming (memory efficient)\n');
