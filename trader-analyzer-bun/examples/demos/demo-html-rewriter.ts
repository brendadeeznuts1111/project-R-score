#!/usr/bin/env bun
/**
 * @fileoverview Comprehensive demo of Bun's HTMLRewriter API
 * @description Demonstrates HTMLRewriter capabilities including input types, element handlers, CSS selectors, text manipulation, document handlers, async transformations, and error handling. Highlights Bun-specific enhancements over Cloudflare Workers implementation.
 * @module examples/demos/demo-html-rewriter
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@6.1.0.0.0.0.0;instance-id=EXAMPLE-HTML-REWRITER-001;version=6.1.0.0.0.0.0}]
 * [PROPERTIES:{example={value:"HTMLRewriter Base Demo";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-DEMO"];@version:"6.1.0.0.0.0.0"}}]
 * [CLASS:HTMLRewriterDemo][#REF:v-6.1.0.0.0.0.0.BP.EXAMPLES.DEMO.1.0.A.1.1.EXAMPLE.1.1]]
 * 
 * Version: 6.1.0.0.0.0.0
 * Ripgrep Pattern: 6\.1\.0\.0\.0\.0\.0|EXAMPLE-HTML-REWRITER-001|BP-EXAMPLE@6\.1\.0\.0\.0\.0\.0
 * 
 * Demonstrates:
 * - Input types (Response, string, ArrayBuffer, Blob, File) - all accepted directly!
 * - Element handlers and CSS selectors
 * - Text and comment manipulation
 * - Document-level handlers
 * - Async transformations
 * - Error handling
 * 
 * Key Feature: Bun's HTMLRewriter accepts multiple input types (enhanced vs Cloudflare Workers):
 * 
 * ✅ Bun-Specific Enhancements (not available in Cloudflare Workers):
 * - Strings → returns string (direct, no wrapper needed!)
 * - ArrayBuffer → returns ArrayBuffer (direct, no wrapper needed!)
 * 
 * ✅ Common Support:
 * - Response objects → returns Response
 * 
 * ⚠️ Bun 1.3.3 Limitations:
 * - Blob → requires Response wrapper
 * - Bun.file() → requires Response wrapper
 * 
 * @example 6.1.0.0.0.0.0.1: Basic HTMLRewriter Usage
 * // Test Formula:
 * // 1. Create HTMLRewriter instance
 * // 2. Register element handler with CSS selector
 * // 3. Transform HTML input (string, Response, or ArrayBuffer)
 * // 4. Verify transformation applied correctly
 * // Expected Result: HTML transformed with attributes/modifications applied
 * //
 * // Snippet:
 * ```typescript
 * const rewriter = new HTMLRewriter()
 *   .on('.content', {
 *     element(el) {
 *       el.setAttribute('data-enhanced', 'true');
 *     },
 *   });
 * const result = rewriter.transform('<div class="content">Hello</div>');
 * // Result: '<div class="content" data-enhanced="true">Hello</div>'
 * ```
 * 
 * @see {@link https://bun.com/docs/runtime/html-rewriter Bun HTMLRewriter Documentation}
 * 
 * // Ripgrep: 6.1.0.0.0.0.0
 * // Ripgrep: EXAMPLE-HTML-REWRITER-001
 * // Ripgrep: BP-EXAMPLE@6.1.0.0.0.0.0
 */

// Make this file a module to support top-level await
export {};

// HTMLRewriter availability check
// Note: HTMLRewriter is available in Bun 1.4+ or via Cloudflare Workers compatibility
const HTMLRewriter = (globalThis as any).HTMLRewriter;

if (!HTMLRewriter) {
  console.error('\n❌ HTMLRewriter is not available in this Bun version.');
  console.error('   HTMLRewriter requires Bun 1.4+ or Cloudflare Workers compatibility mode.');
  console.error('   Update Bun: bun upgrade');
  console.error('   Or use Cloudflare Workers compatibility: bun --compat\n');
  console.error('   For now, this demo shows the API structure and usage patterns.');
  console.error('   The code is ready to use once HTMLRewriter is available.\n');
  process.exit(0); // Exit gracefully with info message
}

console.log('\n' + '═'.repeat(70));
console.log('  Bun HTMLRewriter API Demo');
console.log('═'.repeat(70) + '\n');

// ═══════════════════════════════════════════════════════════════
// 6.1.0.0.0.0.0.4.0 DEMO 1: Input Types
// ═══════════════════════════════════════════════════════════════

console.log('📋 Demo 1: Input Types (Bun-Enhanced vs Cloudflare Workers)');
console.log('-'.repeat(70));
console.log('💡 Bun Enhancement: Strings and ArrayBuffers work directly!');
console.log('   Cloudflare Workers only supports Response objects.\n');

// From Response
const responseHTML = '<div class="content">Response content</div>';
const response1 = new Response(responseHTML);
const rewriter1 = new HTMLRewriter()
  .on('.content', {
    element(el) {
      el.setAttribute('data-source', 'response');
    },
  });
const result1 = rewriter1.transform(response1);
console.log('✅ Response input:', await result1.text());

// From string (direct - no Response wrapper needed!)
const stringHTML = '<div class="content">String content</div>';
const rewriter2 = new HTMLRewriter()
  .on('.content', {
    element(el) {
      el.setAttribute('data-source', 'string');
    },
  });
// HTMLRewriter accepts strings directly - returns string
const result2 = rewriter2.transform(stringHTML);
console.log('✅ String input (direct):', result2);

// From ArrayBuffer (direct - no Response wrapper needed!)
const arrayBufferHTML = '<div class="content">ArrayBuffer content</div>';
const buffer = new TextEncoder().encode(arrayBufferHTML).buffer;
const rewriter3 = new HTMLRewriter()
  .on('.content', {
    element(el) {
      el.setAttribute('data-source', 'arraybuffer');
    },
  });
// HTMLRewriter accepts ArrayBuffer directly - returns ArrayBuffer
const result3 = rewriter3.transform(buffer);
const result3Text = new TextDecoder().decode(result3);
console.log('✅ ArrayBuffer input (direct):', result3Text);

// From Blob (Note: In Bun 1.3.3, Blob needs Response wrapper)
const blobHTML = '<div class="content">Blob content</div>';
const blob = new Blob([blobHTML]);
const rewriter4 = new HTMLRewriter()
  .on('.content', {
    element(el) {
      el.setAttribute('data-source', 'blob');
    },
  });
// Note: Blob input requires Response wrapper in current Bun version
const result4 = rewriter4.transform(new Response(blob));
console.log('✅ Blob input (via Response):', await result4.text());

// From File (Note: In Bun 1.3.3, Bun.file() needs Response wrapper)
try {
  const testFile = Bun.file('/tmp/test-rewriter.html');
  await Bun.write(testFile, '<div class="content">File content</div>');
  const rewriter5 = new HTMLRewriter()
    .on('.content', {
      element(el) {
        el.setAttribute('data-source', 'file');
      },
    });
  // Note: Bun.file() requires Response wrapper in Bun 1.3.3
  // Future versions may support direct File input
  const result5 = rewriter5.transform(new Response(testFile));
  console.log('✅ File input (via Response):', await result5.text());
  await Bun.write(testFile, ''); // Cleanup
} catch (error) {
  console.log('⚠️  File input demo skipped:', (error as Error).message);
}

console.log();

// ═══════════════════════════════════════════════════════════════
// 6.1.0.0.0.0.0.4.1 DEMO 2: Element Handlers (Multiple Handler Types)
// ═══════════════════════════════════════════════════════════════

console.log('📋 Demo 2: Element Handlers with Multiple Handler Types');
console.log('-'.repeat(70));
console.log('💡 Single on() call can handle: element, text, and comments\n');

const elementHTML = `
  <div class="container">
    <!-- Original comment -->
    <div class="content">Original content</div>
    <p class="red">Red paragraph</p>
    <p class="blue">Blue paragraph with text</p>
    <div class="nested">
      <span>Nested content</span>
    </div>
    <!-- Another comment -->
  </div>
`;

// Example: Multiple handler types in single on() call (official docs pattern)
const rewriter6a = new HTMLRewriter()
  .on('div.content', {
    // Handle elements
    element(element) {
      element.setAttribute('class', 'new-content');
      element.append('<p>New content</p>', { html: true });
    },
    // Handle text nodes
    text(text) {
      text.replace('new text');
    },
    // Handle comments
    comments(comment) {
      comment.remove();
    },
  });

const result6a = rewriter6a.transform(new Response(elementHTML));
console.log('✅ Multiple handlers (element, text, comments) in one on() call:');
console.log(await result6a.text());
console.log();

// Example: Separate handlers for different elements
const rewriter6b = new HTMLRewriter()
  .on('.red', {
    element(el) {
      el.setAttribute('style', 'color: red;');
      el.append(' (enhanced)', { html: false });
    },
  })
  .on('.blue', {
    element(el) {
      el.setAttribute('style', 'color: blue;');
      el.prepend('Enhanced: ', { html: false });
    },
    // Handle text within .blue
    text(text) {
      if (text.text.includes('text')) {
        text.replace(text.text.replace('text', 'TEXT'));
      }
    },
  })
  .on('.nested span', {
    element(el) {
      el.setAttribute('data-nested', 'true');
      el.before('<strong>Before:</strong>', { html: true });
      el.after('<em>After</em>', { html: true });
    },
  });

const result6b = rewriter6b.transform(new Response(elementHTML));
console.log('✅ Separate handlers with text manipulation:');
console.log(await result6b.text());
console.log();

// ═══════════════════════════════════════════════════════════════
// 6.1.0.0.0.0.0.4.2 DEMO 2B: Complete Element Operations API
// ═══════════════════════════════════════════════════════════════

console.log('📋 Demo 2B: Complete Element Operations API');
console.log('-'.repeat(70));
console.log('💡 Demonstrates all element properties and methods from official docs\n');

const elementOpsHTML = `
  <div id="demo" class="original" data-test="value">
    Original content
  </div>
  <div class="remove-me">This will be removed</div>
  <div class="keep-content">This content will remain</div>
  <br />
  <div class="end-tag-demo">End tag demo</div>
`;

// Example: Complete Element Operations (official docs pattern)
console.log('📝 Complete Element Operations:');
const rewriter6c = new HTMLRewriter()
  .on('#demo', {
    element(el) {
      console.log('  Element Properties:');
      console.log(`    tagName: "${el.tagName}"`);
      console.log(`    namespaceURI: "${el.namespaceURI}"`);
      console.log(`    selfClosing: ${el.selfClosing}`);
      console.log(`    canHaveContent: ${el.canHaveContent}`);
      console.log(`    removed: ${el.removed}`);
      
      console.log('\n  Attribute Operations:');
      // Attributes
      el.setAttribute('class', 'new-class').setAttribute('data-id', '123');
      const classAttr = el.getAttribute('class'); // "new-class"
      console.log(`    getAttribute("class"): "${classAttr}"`);
      const hasId = el.hasAttribute('id'); // boolean
      console.log(`    hasAttribute("id"): ${hasId}`);
      el.removeAttribute('class');
      console.log('    removeAttribute("class") executed');
      
      console.log('\n  Content Manipulation:');
      // Content manipulation
      el.setInnerContent('New content'); // Escapes HTML by default
      el.setInnerContent('<p>HTML content</p>', { html: true }); // Parses HTML
      
      console.log('\n  Position Manipulation:');
      // Position manipulation
      el.before('Content before ').after(' Content after')
        .prepend('First child ').append(' Last child');
      
      console.log('\n  HTML Content Insertion:');
      // HTML content insertion
      el.before('<span style="color: blue;">before</span>', { html: true })
        .after('<span style="color: green;">after</span>', { html: true })
        .prepend('<span style="color: red;">first</span>', { html: true })
        .append('<span style="color: purple;">last</span>', { html: true });
      
      console.log('\n  Attributes Iteration:');
      // Attributes iteration
      for (const [name, value] of el.attributes) {
        console.log(`    ${name} = "${value}"`);
      }
      
      // End tag handling
      el.onEndTag(endTag => {
        console.log('\n  End Tag Operations:');
        endTag.before('Before end tag ', { html: false });
        endTag.after(' After end tag', { html: false });
        console.log(`    endTag.name: "${endTag.name}"`);
      });
    },
  })
  .on('.remove-me', {
    element(el) {
      // Removal
      el.remove(); // Remove element and contents
    },
  })
  .on('.keep-content', {
    element(el) {
      // Remove only the element tags, keep content
      el.removeAndKeepContent();
    },
  })
  .on('br', {
    element(el) {
      console.log('\n  Void Element Properties:');
      console.log(`    tagName: "${el.tagName}"`);
      console.log(`    canHaveContent: ${el.canHaveContent}`); // false for <br>
      console.log(`    selfClosing: ${el.selfClosing}`);
    },
  });

const result6c = rewriter6c.transform(new Response(elementOpsHTML));
console.log('\n✅ Result:');
console.log(await result6c.text());
console.log();

// ═══════════════════════════════════════════════════════════════
// 6.1.0.0.0.0.0.4.3 DEMO 3: CSS Selectors (Complete Coverage)
// ═══════════════════════════════════════════════════════════════

console.log('📋 Demo 3: CSS Selector Support (Complete)');
console.log('-'.repeat(70));
console.log('💡 Demonstrates all selector types from official documentation\n');

const selectorHTML = `
  <div>
    <!-- Tag selectors -->
    <p>Tag selector</p>
    <p class="red">Class selector</p>
    <h1 id="header">ID selector</h1>
    
    <!-- Attribute selectors -->
    <p data-test>Has attribute</p>
    <p data-test="one">Exact match</p>
    <p data-test="ONE">Case-insensitive test</p>
    <p data-test="one" data-case="sensitive">Case-sensitive test</p>
    <p data-test="two words">Word match test</p>
    <p data-test="abc">Starts with 'a'</p>
    <p data-test="xyz1">Ends with '1'</p>
    <p data-test="abc123">Contains 'b'</p>
    <p data-test="a-b-c">Dash-separated 'a'</p>
    
    <!-- Combinators -->
    <div class="parent">
      <span>Descendant span</span>
      <div>
        <span>Nested descendant</span>
      </div>
    </div>
    <div class="direct-parent">
      <span>Direct child span</span>
      <div>
        <span>Not direct child</span>
      </div>
    </div>
    
    <!-- Pseudo-classes -->
    <ul>
      <li>First item</li>
      <li>Second item</li>
      <li>Third item</li>
    </ul>
    <div>
      <p>First paragraph</p>
      <p>Second paragraph</p>
      <p>Third paragraph</p>
    </div>
    
    <!-- Universal selector -->
    <span>Universal selector target</span>
  </div>
`;

const rewriter7 = new HTMLRewriter()
  // Tag selectors
  .on('p', {
    element(el) {
      if (!el.hasAttribute('data-tagged')) {
        el.setAttribute('data-tagged', 'true');
      }
    },
  })
  
  // Class selectors
  .on('p.red', {
    element(el) {
      el.setAttribute('style', 'color: red;');
      el.setAttribute('data-class-matched', 'true');
    },
  })
  
  // ID selectors
  .on('h1#header', {
    element(el) {
      el.setAttribute('data-id-matched', 'true');
      el.setAttribute('style', 'font-size: 2em;');
    },
  })
  
  // Attribute selectors
  .on('p[data-test]', {
    element(el) {
      el.setAttribute('data-has-attr', 'true');
    },
  })
  .on('p[data-test="one"]', {
    element(el) {
      el.setAttribute('data-exact-match', 'true');
    },
  })
  .on('p[data-test="one" i]', {
    element(el) {
      el.setAttribute('data-case-insensitive', 'true');
    },
  })
  .on('p[data-test="one" s]', {
    element(el) {
      el.setAttribute('data-case-sensitive', 'true');
    },
  })
  .on('p[data-test~="two"]', {
    element(el) {
      el.setAttribute('data-word-match', 'true');
    },
  })
  .on('p[data-test^="a"]', {
    element(el) {
      el.setAttribute('data-starts-with', 'true');
    },
  })
  .on('p[data-test$="1"]', {
    element(el) {
      el.setAttribute('data-ends-with', 'true');
    },
  })
  .on('p[data-test*="b"]', {
    element(el) {
      el.setAttribute('data-contains', 'true');
    },
  })
  .on('p[data-test|="a"]', {
    element(el) {
      el.setAttribute('data-dash-separated', 'true');
    },
  })
  
  // Combinators
  .on('div.parent span', {
    element(el) {
      el.setAttribute('data-descendant', 'true');
    },
  })
  .on('div.direct-parent > span', {
    element(el) {
      el.setAttribute('data-direct-child', 'true');
    },
  })
  
  // Pseudo-classes
  .on('li:nth-child(2)', {
    element(el) {
      el.setAttribute('data-nth-child-2', 'true');
    },
  })
  .on('li:first-child', {
    element(el) {
      el.setAttribute('data-first-child', 'true');
    },
  })
  .on('p:nth-of-type(2)', {
    element(el) {
      el.setAttribute('data-nth-of-type-2', 'true');
    },
  })
  .on('p:first-of-type', {
    element(el) {
      el.setAttribute('data-first-of-type', 'true');
    },
  })
  .on('p:not(:first-child)', {
    element(el) {
      el.setAttribute('data-not-first-child', 'true');
    },
  })
  
  // Universal selector
  .on('*', {
    element(el) {
      if (!el.hasAttribute('data-universal')) {
        el.setAttribute('data-universal', 'matched');
      }
    },
  });

const result7 = rewriter7.transform(new Response(selectorHTML));
console.log('✅ Complete selector coverage:');
console.log(await result7.text());
console.log();

// Summary of selectors demonstrated
console.log('📊 Selector Types Demonstrated:');
console.log('  ✅ Tag selectors: p');
console.log('  ✅ Class selectors: p.red');
console.log('  ✅ ID selectors: h1#header');
console.log('  ✅ Attribute selectors: [attr], [attr="val"], [attr="val" i], [attr="val" s]');
console.log('  ✅ Attribute operators: ~= (word), ^= (starts), $= (ends), *= (contains), |= (dash)');
console.log('  ✅ Combinators: div span (descendant), div > span (direct child)');
console.log('  ✅ Pseudo-classes: :nth-child(), :first-child, :nth-of-type(), :first-of-type, :not()');
console.log('  ✅ Universal selector: *');
console.log();

// ═══════════════════════════════════════════════════════════════
// 6.1.0.0.0.0.0.4.4 DEMO 4: Text Operations (Complete API)
// ═══════════════════════════════════════════════════════════════

console.log('📋 Demo 4: Text Node Manipulation (Complete API)');
console.log('-'.repeat(70));
console.log('💡 Demonstrates all text node properties and methods\n');

const textHTML = `
  <p>First chunk of text</p>
  <p>Second paragraph with multiple words</p>
  <p>Original text content here</p>
`;

// Example 1: Text properties and basic manipulation
console.log('📝 Example 1: Text Properties and Basic Manipulation');
const rewriter8a = new HTMLRewriter()
  .on('p', {
    text(text) {
      // Content properties (demonstrated on first paragraph only)
      if (text.text.includes('First') && !text.lastInTextNode) {
        console.log(`  text.text: "${text.text}"`);
        console.log(`  text.lastInTextNode: ${text.lastInTextNode}`);
        console.log(`  text.removed: ${text.removed}`);
      }
      
      // Manipulation (chained)
      if (text.text.includes('First')) {
        text.before('Before text ').after(' After text').replace('Modified chunk');
      }
    },
  });

const result8a = rewriter8a.transform(new Response(textHTML));
console.log('✅ Result:', await result8a.text());
console.log();

// Example 2: HTML content insertion (official docs pattern)
console.log('📝 Example 2: HTML Content Insertion');
const rewriter8b = new HTMLRewriter()
  .on('p', {
    text(text) {
      // HTML content insertion with { html: true }
      if (text.text.includes('Second')) {
        text
          .before('<span style="color: blue;">before</span>', { html: true })
          .after('<span style="color: green;">after</span>', { html: true });
      }
    },
  });

const result8b = rewriter8b.transform(new Response(textHTML));
console.log('✅ Result:', await result8b.text());
console.log();

// Example 3: Replace with HTML
console.log('📝 Example 3: Replace with HTML');
const rewriter8c = new HTMLRewriter()
  .on('p', {
    text(text) {
      if (text.text.includes('Original')) {
        text.replace('<span style="color: red;">replace</span>', { html: true });
      }
    },
  });

const result8c = rewriter8c.transform(new Response(textHTML));
console.log('✅ Result:', await result8c.text());
console.log();

// Example 4: Remove text
console.log('📝 Example 4: Remove Text');
const rewriter8d = new HTMLRewriter()
  .on('p', {
    text(text) {
      if (text.text.includes('Original')) {
        text.remove();
      }
    },
  });

const result8d = rewriter8d.transform(new Response(textHTML));
console.log('✅ Result:', await result8d.text());
console.log();

// Example 5: Complete API demonstration (official docs pattern)
console.log('📝 Example 5: Complete Text API (Official Pattern)');
const completeTextHTML = '<p>Complete text API demo</p>';
const rewriter8e = new HTMLRewriter()
  .on('p', {
    text(text) {
      // Only process first chunk to avoid duplicate transformations
      if (text.text && !text.text.includes('before') && !text.text.includes('replace')) {
        // Content properties
        console.log(`  text.text: "${text.text}"`);
        console.log(`  text.lastInTextNode: ${text.lastInTextNode}`);
        console.log(`  text.removed: ${text.removed}`);

        // Manipulation (all methods - demonstrating API)
        // Note: In practice, you'd use one method, not all at once
        text.replace('New text');
        
        // HTML content insertion
        text
          .before('<span style="color: blue;">before</span>', { html: true })
          .after('<span style="color: green;">after</span>', { html: true });
      }
    },
  });

const result8e = rewriter8e.transform(new Response(completeTextHTML));
console.log('✅ Result:', await result8e.text());
console.log();
console.log('📚 Text API Summary:');
console.log('  Properties: text.text, text.lastInTextNode, text.removed');
console.log('  Methods: text.before(), text.after(), text.replace(), text.remove()');
console.log('  HTML insertion: Use { html: true } option');
console.log();

// ═══════════════════════════════════════════════════════════════
// 6.1.0.0.0.0.0.4.5 DEMO 5: Comment Operations
// ═══════════════════════════════════════════════════════════════

console.log('📋 Demo 5: Comment Manipulation');
console.log('-'.repeat(70));

const commentHTML = `
  <div>
    <!-- Original comment -->
    <p>Content</p>
    <!-- Another comment -->
  </div>
`;

const rewriter9 = new HTMLRewriter()
  .on('*', {
    comments(comment) {
      if (comment.text.includes('Original')) {
        comment.text = 'Modified comment';
      } else {
        comment.remove();
      }
    },
  });

const result9 = rewriter9.transform(new Response(commentHTML));
console.log('✅ Comment manipulation:', await result9.text());
console.log();

// ═══════════════════════════════════════════════════════════════
// 6.1.0.0.0.0.0.4.6 DEMO 6: Document Handlers
// ═══════════════════════════════════════════════════════════════

console.log('📋 Demo 6: Document-Level Handlers');
console.log('-'.repeat(70));

const docHTML = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <p>Content</p>
</body>
</html>`;

const rewriter10 = new HTMLRewriter()
  .onDocument({
    doctype(doctype) {
      console.log('  📄 Doctype:', doctype.name);
    },
    end(end) {
      end.append('<!-- Footer added by HTMLRewriter -->', { html: true });
    },
  });

const result10 = rewriter10.transform(new Response(docHTML));
console.log('✅ Document handlers applied');
console.log(await result10.text());
console.log();

// ═══════════════════════════════════════════════════════════════
// 6.1.0.0.0.0.0.4.7 DEMO 7: Async Transformations
// ═══════════════════════════════════════════════════════════════

console.log('📋 Demo 7: Async Transformations');
console.log('-'.repeat(70));
console.log('💡 Handlers can be async - transformation blocks until complete\n');

const asyncHTML = '<div class="async">Async content</div>';

// Example: Async element handler (exact pattern from official docs)
const rewriter11a = new HTMLRewriter()
  .on('div', {
    async element(element) {
      await Bun.sleep(10); // Simulate async operation (e.g., fetch data)
      element.setInnerContent('<span>replace</span>', { html: true });
    },
  });

const startTime1 = Bun.nanoseconds();
const result11a = await rewriter11a.transform(new Response(asyncHTML));
const duration1 = (Bun.nanoseconds() - startTime1) / 1_000_000;
console.log(`✅ Async element handler (${duration1.toFixed(2)}ms):`);
console.log(await result11a.text());
console.log();

// Example: Multiple async operations
const asyncHTML2 = '<div class="async">Async content</div><div class="async2">More async</div>';

const rewriter11b = new HTMLRewriter()
  .on('.async', {
    async element(el) {
      await Bun.sleep(10); // Simulate async operation
      el.setAttribute('data-async', 'true');
      el.append(' (loaded)', { html: false });
    },
  })
  .on('.async2', {
    async element(el) {
      await Bun.sleep(5); // Simulate faster async operation
      el.setAttribute('data-loaded', 'true');
      el.prepend('Loaded: ', { html: false });
    },
  });

const startTime2 = Bun.nanoseconds();
const result11b = await rewriter11b.transform(new Response(asyncHTML2));
const duration2 = (Bun.nanoseconds() - startTime2) / 1_000_000;
console.log(`✅ Multiple async handlers (${duration2.toFixed(2)}ms):`);
console.log(await result11b.text());
console.log();

// ═══════════════════════════════════════════════════════════════
// 6.1.0.0.0.0.0.4.8 DEMO 8: Element Chaining
// ═══════════════════════════════════════════════════════════════

console.log('📋 Demo 8: Method Chaining');
console.log('-'.repeat(70));

const chainHTML = '<div class="chain">Chain me</div>';

const rewriter12 = new HTMLRewriter()
  .on('.chain', {
    element(el) {
      el
        .setAttribute('data-step1', 'true')
        .setAttribute('data-step2', 'true')
        .setAttribute('data-step3', 'true')
        .before('<span>Before</span>', { html: true })
        .after('<span>After</span>', { html: true });
    },
  });

const result12 = rewriter12.transform(new Response(chainHTML));
console.log('✅ Method chaining:', await result12.text());
console.log();

// ═══════════════════════════════════════════════════════════════
// 6.1.0.0.0.0.0.4.9 DEMO 9: Error Handling
// ═══════════════════════════════════════════════════════════════

console.log('📋 Demo 9: Error Handling');
console.log('-'.repeat(70));

try {
  const invalidHTML = '<div>Unclosed tag';
  const rewriter13 = new HTMLRewriter()
    .on('div', {
      element(el) {
        // This will work even with invalid HTML
        el.setAttribute('data-processed', 'true');
      },
    });
  const result13 = rewriter13.transform(new Response(invalidHTML));
  console.log('✅ Error handling (graceful):', await result13.text());
} catch (error) {
  console.log('⚠️  Error caught:', (error as Error).message);
}
console.log();

// ═══════════════════════════════════════════════════════════════
// 6.1.0.0.0.0.0.4.10 DEMO 10: Complex Transformation
// ═══════════════════════════════════════════════════════════════

console.log('📋 Demo 10: Complex Real-World Example');
console.log('-'.repeat(70));

const complexHTML = `
  <html>
  <head>
    <title>Dashboard</title>
  </head>
  <body>
    <header>
      <h1>Welcome</h1>
    </header>
    <main>
      <div class="stats">
        <div class="stat" data-value="100">Total</div>
        <div class="stat" data-value="95">Valid</div>
      </div>
      <table>
        <tbody>
          <tr><td>Item 1</td></tr>
          <tr><td>Item 2</td></tr>
        </tbody>
      </table>
    </main>
  </body>
  </html>
`;

const rewriter14 = new HTMLRewriter()
  .on('title', {
    element(el) {
      el.setInnerContent('Enhanced Dashboard');
    },
  })
  .on('h1', {
    text(text) {
      if (text.text.includes('Welcome')) {
        text.replace('Welcome to Hyper-Bun');
      }
    },
  })
  .on('.stat[data-value]', {
    element(el) {
      const value = el.getAttribute('data-value');
      el.setInnerContent(`${el.getAttribute('data-value') || 'Unknown'}: ${value}`);
    },
  })
  .on('tbody tr', {
    element(el) {
      el.setAttribute('data-enhanced', 'true');
    },
  })
  .onDocument({
    end(end) {
      end.append('<script>console.log("Enhanced by HTMLRewriter");</script>', { html: true });
    },
  });

const result14 = rewriter14.transform(new Response(complexHTML));
console.log('✅ Complex transformation:');
console.log(await result14.text());
console.log();

console.log('═'.repeat(70));
console.log('  Demo Complete!');
console.log('═'.repeat(70));
console.log('\n💡 Key Takeaways:');
console.log('  • Bun Enhancement: Strings and ArrayBuffers work directly!');
console.log('  • Cloudflare Workers only supports Response objects');
console.log('  • Powerful CSS selector support');
console.log('  • Element, text, and comment manipulation');
console.log('  • Document-level handlers');
console.log('  • Async transformations supported');
console.log('  • Method chaining for fluent API');
console.log('\n🚀 Bun-Specific Advantages:');
console.log('  • Direct string input: rewriter.transform("<div>content</div>")');
console.log('  • Direct ArrayBuffer input: rewriter.transform(buffer)');
console.log('  • More flexible than Cloudflare Workers implementation');
console.log('\n📚 Official Documentation:');
console.log('  https://bun.com/docs/runtime/html-rewriter');
console.log('  Note: Cloudflare Workers only supports Response objects\n');
