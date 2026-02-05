#!/usr/bin/env bun
/**
 * @fileoverview Interactive HTMLRewriter demo server - see transformations live in browser
 * @description HTTP server demonstrating HTMLRewriter transformations with side-by-side comparison. Provides multiple transformation modes (basic, advanced, text-only) with real-time preview capabilities.
 * @module examples/demos/demo-html-rewriter-server
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@6.1.2.0.0.0.0;instance-id=EXAMPLE-HTML-REWRITER-SERVER-001;version=6.1.2.0.0.0.0}]
 * [PROPERTIES:{example={value:"HTMLRewriter Server Demo";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-DEMO"];@version:"6.1.2.0.0.0.0"}}]
 * [CLASS:HTMLRewriterServerDemo][#REF:v-6.1.2.0.0.0.0.BP.EXAMPLES.DEMO.1.0.A.1.1.EXAMPLE.1.1]]
 * 
 * Version: 6.1.2.0.0.0.0
 * Ripgrep Pattern: 6\.1\.2\.0\.0\.0\.0|EXAMPLE-HTML-REWRITER-SERVER-001|BP-EXAMPLE@6\.1\.2\.0\.0\.0\.0
 * 
 * @example 6.1.2.0.0.0.0.1: Server Integration Pattern
 * // Test Formula:
 * // 1. Start Bun.serve() HTTP server
 * // 2. Create HTMLRewriter transformation functions
 * // 3. Handle API endpoints for original and transformed HTML
 * // 4. Serve interactive demo page with side-by-side preview
 * // Expected Result: HTTP server running with live HTML transformation preview
 * //
 * // Snippet:
 * ```typescript
 * const server = Bun.serve({
 *   port: 3002,
 *   fetch(req) {
 *     const url = new URL(req.url);
 *     if (url.pathname === '/api/transformed') {
 *       const rewriter = createTransformation();
 *       return rewriter.transform(new Response(originalHTML));
 *     }
 *     return new Response(demoPage, { headers: { 'Content-Type': 'text/html' } });
 *   },
 * });
 * ```
 * 
 * @see {@link https://bun.com/docs/runtime/html-rewriter Bun HTMLRewriter Documentation}
 * @see {@link https://bun.com/docs/api/http Bun.serve() Documentation}
 * 
 * // Ripgrep: 6.1.2.0.0.0.0
 * // Ripgrep: EXAMPLE-HTML-REWRITER-SERVER-001
 * // Ripgrep: BP-EXAMPLE@6.1.2.0.0.0.0
 * 
 * Run: bun run scripts/demo-html-rewriter-server.ts
 * Then open: http://localhost:3002
 */

const HTMLRewriter = globalThis.HTMLRewriter;

if (!HTMLRewriter) {
  console.error('❌ HTMLRewriter is not available in this Bun version.');
  console.error('   Update Bun: bun upgrade');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════
// 6.1.2.0.0.0.0.4.0 ORIGINAL HTML TEMPLATE
// ═══════════════════════════════════════════════════════════════

const originalHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Original Page</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome to HTMLRewriter Demo</h1>
    <p class="intro">This is the original content before transformation.</p>
    <div class="content">
      <h2>Content Section</h2>
      <p>First paragraph of content.</p>
      <p>Second paragraph of content.</p>
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
        <li>Item 3</li>
      </ul>
    </div>
    <footer>Copyright 2024</footer>
  </div>
</body>
</html>`;

// ═══════════════════════════════════════════════════════════════
// 6.1.2.0.0.0.0.4.1 TRANSFORMATION EXAMPLES
// ═══════════════════════════════════════════════════════════════

function createBasicTransformation() {
  return new HTMLRewriter()
    .on('h1', {
      element(el) {
        el.setAttribute('style', 'color: #667eea; font-size: 2.5em; text-align: center;');
        el.setInnerContent('🚀 Welcome to HTMLRewriter Demo', { html: false });
      },
    })
    .on('p.intro', {
      element(el) {
        el.setAttribute('style', 'background: #e3f2fd; padding: 1rem; border-radius: 6px; border-left: 4px solid #667eea;');
      },
      text(text) {
        if (text.text.includes('original')) {
          text.replace(text.text.replace('original', '✨ enhanced'));
        }
      },
    })
    .on('footer', {
      element(el) {
        el.setAttribute('style', 'text-align: center; color: #666; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ddd;');
        el.setInnerContent('© 2024 | Enhanced by Bun HTMLRewriter', { html: false });
      },
    });
}

function createAdvancedTransformation() {
  return new HTMLRewriter()
    .on('title', {
      element(el) {
        el.setInnerContent('🚀 Enhanced Page - HTMLRewriter Demo');
      },
    })
    .on('body', {
      element(el) {
        el.prepend(`
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; text-align: center; margin-bottom: 2rem;">
            <h2 style="margin: 0; color: white;">📢 Page Enhanced by HTMLRewriter!</h2>
            <p style="margin: 0.5rem 0 0 0; opacity: 0.9;">Watch the transformations happen in real-time</p>
          </div>
        `, { html: true });
      },
    })
    .on('h1', {
      element(el) {
        el.setAttribute('class', 'main-title');
        el.setAttribute('style', 'color: #667eea; font-size: 2.5em; text-align: center; margin-bottom: 1rem;');
        el.setInnerContent('👋 Welcome to HTMLRewriter', { html: false });
      },
    })
    .on('h2', {
      element(el) {
        el.setAttribute('style', 'color: #764ba2; border-bottom: 2px solid #667eea; padding-bottom: 0.5rem;');
      },
    })
    .on('p.intro', {
      element(el) {
        el.setAttribute('class', 'intro enhanced');
        el.setAttribute('style', 'background: #f8f9fa; padding: 1rem; border-radius: 8px; margin: 1rem 0;');
      },
      text(text) {
        if (text.text.includes('original')) {
          text.replace(text.text.replace('original', '✨ enhanced'));
        }
      },
    })
    .on('.content p', {
      element(el) {
        el.setAttribute('style', 'margin: 0.75rem 0; padding: 0.75rem; border-left: 3px solid #667eea; background: #f8f9fa;');
      },
    })
    .on('li', {
      element(el) {
        el.setAttribute('style', 'margin: 0.5rem 0; padding: 0.5rem;');
      },
      text(text) {
        if (text.text.includes('Item')) {
          text.replace('✅ ' + text.text);
        }
      },
    })
    .on('footer', {
      element(el) {
        el.setAttribute('style', 'text-align: center; color: #666; margin-top: 2rem; padding-top: 1rem; border-top: 2px solid #e0e0e0;');
        el.setInnerContent('© 2024 | Enhanced by Bun HTMLRewriter | Built with ❤️', { html: false });
      },
    })
    .onDocument({
      end(end) {
        end.append(`
<style>
  .main-title {
    animation: fadeIn 0.5s ease-in;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  p {
    transition: background 0.3s ease;
  }
  p:hover {
    background: #fff3cd !important;
  }
</style>
<script>
  console.log('✅ Page transformed by HTMLRewriter!');
  console.log('📊 Transformations applied:', {
    title: 'Modified',
    banner: 'Added',
    headings: 'Styled',
    paragraphs: 'Enhanced',
    list: 'Updated',
    footer: 'Replaced'
  });
  
  // Interactive demo
  document.querySelectorAll('p').forEach((p, i) => {
    p.addEventListener('click', function() {
      this.style.transform = 'scale(1.05)';
      this.style.transition = 'transform 0.2s';
      setTimeout(() => {
        this.style.transform = '';
      }, 200);
    });
  });
</script>
        `, { html: true });
      },
    });
}

function createTextOnlyTransformation() {
  return new HTMLRewriter()
    .on('p', {
      text(text) {
        // Replace "content" with "CONTENT" (uppercase)
        if (text.text.includes('content')) {
          text.replace(text.text.replace(/content/gi, 'CONTENT'));
        }
        // Replace "paragraph" with "PARAGRAPH"
        if (text.text.includes('paragraph')) {
          text.replace(text.text.replace(/paragraph/gi, 'PARAGRAPH'));
        }
      },
    })
    .on('h1, h2', {
      text(text) {
        if (text.text.includes('HTMLRewriter')) {
          text.replace('🔥 ' + text.text);
        }
      },
    });
}

// ═══════════════════════════════════════════════════════════════
// 6.1.2.0.0.0.0.4.2 WEB SERVER
// ═══════════════════════════════════════════════════════════════

const port = parseInt(Bun.env.HTML_REWRITER_PORT || '3002', 10);

const server = Bun.serve({
  port,
  fetch(req) {
    const url = new URL(req.url);
    
    // API endpoint to get original HTML
    if (url.pathname === '/api/original') {
      return new Response(originalHTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    
    // API endpoint to get transformed HTML
    if (url.pathname === '/api/transformed') {
      const mode = url.searchParams.get('mode') || 'basic';
      
      let rewriter;
      switch (mode) {
        case 'basic':
          rewriter = createBasicTransformation();
          break;
        case 'advanced':
          rewriter = createAdvancedTransformation();
          break;
        case 'text':
          rewriter = createTextOnlyTransformation();
          break;
        default:
          rewriter = createBasicTransformation();
      }
      
      const transformed = rewriter.transform(new Response(originalHTML));
      return transformed;
    }
    
    // Main demo page
    const demoPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HTMLRewriter Interactive Demo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #f5f5f5;
      padding: 2rem;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      text-align: center;
    }
    h1 { font-size: 2.5em; margin-bottom: 0.5rem; }
    .controls {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .button-group {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    button {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      background: #667eea;
      color: white;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    button:hover {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
    button.active {
      background: #764ba2;
    }
    .preview {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin-top: 2rem;
    }
    @media (max-width: 768px) {
      .preview { grid-template-columns: 1fr; }
    }
    .preview-panel {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .preview-header {
      background: #f8f9fa;
      padding: 1rem;
      border-bottom: 1px solid #e0e0e0;
      font-weight: 600;
    }
    .preview-content {
      padding: 1rem;
      max-height: 600px;
      overflow-y: auto;
    }
    iframe {
      width: 100%;
      height: 600px;
      border: none;
    }
    .info {
      background: #e3f2fd;
      padding: 1rem;
      border-radius: 6px;
      margin-bottom: 1rem;
      border-left: 4px solid #667eea;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🚀 HTMLRewriter Interactive Demo</h1>
      <p>See transformations happen in real-time</p>
    </header>
    
    <div class="controls">
      <div class="info">
        <strong>💡 How it works:</strong> Select a transformation mode below to see how HTMLRewriter modifies the HTML on-the-fly.
      </div>
      <div class="button-group">
        <button onclick="loadPreview('original')">📄 Original</button>
        <button onclick="loadPreview('basic')" class="active">🔧 Basic Transform</button>
        <button onclick="loadPreview('advanced')">✨ Advanced Transform</button>
        <button onclick="loadPreview('text')">📝 Text Only</button>
      </div>
    </div>
    
    <div class="preview">
      <div class="preview-panel">
        <div class="preview-header">📄 Original HTML</div>
        <div class="preview-content">
          <iframe id="original-frame" src="/api/original"></iframe>
        </div>
      </div>
      
      <div class="preview-panel">
        <div class="preview-header" id="transformed-header">🔧 Transformed HTML (Basic)</div>
        <div class="preview-content">
          <iframe id="transformed-frame" src="/api/transformed?mode=basic"></iframe>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    function loadPreview(mode) {
      // Update active button
      document.querySelectorAll('button').forEach(btn => {
        btn.classList.remove('active');
      });
      event.target.classList.add('active');
      
      // Update transformed frame
      const frame = document.getElementById('transformed-frame');
      const header = document.getElementById('transformed-header');
      
      if (mode === 'original') {
        frame.src = '/api/original';
        header.textContent = '📄 Original HTML';
      } else {
        frame.src = \`/api/transformed?mode=\${mode}\`;
        const modeNames = {
          basic: '🔧 Basic Transform',
          advanced: '✨ Advanced Transform',
          text: '📝 Text Only Transform'
        };
        header.textContent = modeNames[mode] || '🔧 Transformed HTML';
      }
    }
    
    // Auto-refresh every 5 seconds to show it's dynamic
    setInterval(() => {
      const frame = document.getElementById('transformed-frame');
      const currentSrc = frame.src;
      frame.src = '';
      setTimeout(() => {
        frame.src = currentSrc;
      }, 100);
    }, 5000);
  </script>
</body>
</html>`;
    
    return new Response(demoPage, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
});

console.log('\n' + '═'.repeat(70));
console.log('  🚀 HTMLRewriter Interactive Demo Server');
console.log('═'.repeat(70));
console.log(`\n📊 Server running at: http://localhost:${server.port}`);
console.log('🌐 Open in browser: http://localhost:' + server.port);
console.log('\n💡 Features:');
console.log('  • Side-by-side comparison (Original vs Transformed)');
console.log('  • Multiple transformation modes');
console.log('  • Real-time HTML transformation');
console.log('  • Interactive preview');
console.log('\n🎮 Controls:');
console.log('  • Click buttons to switch transformation modes');
console.log('  • View source to see transformed HTML');
console.log('  • Check browser console for transformation logs');
console.log('\nPress Ctrl+C to stop\n');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down server...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down server...');
  server.stop();
  process.exit(0);
});
