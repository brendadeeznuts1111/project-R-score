#!/usr/bin/env bun
/**
 * @fileoverview Live HTML editor with real-time HTMLRewriter transformation
 * @description Interactive web-based HTML editor with live HTMLRewriter transformation preview. Supports multiple transformation modes with real-time side-by-side comparison and performance timing.
 * @module examples/demos/demo-html-rewriter-live-editor
 * 
 * @example
 * ```bash
 * # Run the live editor
 * bun run examples/demos/demo-html-rewriter-live-editor.ts
 * 
 * # Then open in browser
 * open http://localhost:3003
 * ```
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@6.1.4.0.0.0.0;instance-id=EXAMPLE-HTML-REWRITER-LIVE-EDITOR-001;version=6.1.4.0.0.0.0}]
 * [PROPERTIES:{example={value:"HTMLRewriter Live Editor";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-DEMO"];@version:"6.1.4.0.0.0.0"}}]
 * [CLASS:HTMLRewriterLiveEditorDemo][#REF:v-6.1.4.0.0.0.0.BP.EXAMPLES.DEMO.1.0.A.1.1.EXAMPLE.1.1]]
 * 
 * Version: 6.1.4.0.0.0.0
 * Ripgrep Pattern: 6\.1\.4\.0\.0\.0\.0|EXAMPLE-HTML-REWRITER-LIVE-EDITOR-001|BP-EXAMPLE@6\.1\.4\.0\.0\.0\.0
 * 
 * @example 6.1.4.0.0.0.0.1: Live Editor Pattern
 * // Test Formula:
 * // 1. Start HTTP server with POST /api/transform endpoint
 * // 2. Serve interactive editor page with textarea and preview iframe
 * // 3. On transform request, apply HTMLRewriter transformation
 * // 4. Measure transformation time using Bun.nanoseconds()
 * // 5. Return transformed HTML and timing data
 * // Expected Result: Live editor with real-time transformation preview
 * //
 * // Snippet:
 * ```typescript
 * const server = Bun.serve({
 *   fetch(req) {
 *     if (url.pathname === '/api/transform') {
 *       const { html, mode } = await req.json();
 *       const startTime = Bun.nanoseconds();
 *       const transformed = rewriter.transform(new Response(html));
 *       const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
 *       return new Response(JSON.stringify({ transformed, duration }));
 *     }
 *   },
 * });
 * ```
 * 
 * @see {@link https://bun.com/docs/runtime/html-rewriter Bun HTMLRewriter Documentation}
 * @see {@link https://bun.com/docs/api/http Bun.serve() Documentation}
 * 
 * // Ripgrep: 6.1.4.0.0.0.0
 * // Ripgrep: EXAMPLE-HTML-REWRITER-LIVE-EDITOR-001
 * // Ripgrep: BP-EXAMPLE@6.1.4.0.0.0.0
 * 
 * Run: bun run scripts/demo-html-rewriter-live-editor.ts
 * Then open: http://localhost:3003
 */

const HTMLRewriter = (globalThis as any).HTMLRewriter;

if (!HTMLRewriter) {
  console.error('\n❌ HTMLRewriter is not available in this Bun version.');
  console.error('   Update Bun: bun upgrade');
  console.error('   Required: Bun 1.4+ or Cloudflare Workers compatibility mode\n');
  // Note: process.exit() works in Bun and is compatible
  process.exit(1);
}

// Parse port from environment with validation
const portEnv = Bun.env.HTML_REWRITER_EDITOR_PORT || '3003';
const port = parseInt(portEnv, 10);

if (isNaN(port) || port < 1 || port > 65535) {
  console.error(`\n❌ Invalid port: ${portEnv}`);
  console.error('   Port must be between 1 and 65535\n');
  process.exit(1);
}

const server = Bun.serve({
  port,
  hostname: Bun.env.HTML_REWRITER_EDITOR_HOST || '0.0.0.0',
  fetch(req) {
    const url = new URL(req.url);
    
    // Transform endpoint
    if (url.pathname === '/api/transform') {
      if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }
      
      return req.json().then(async (data: { html: string; mode: string }) => {
        const { html, mode } = data;
        
        // Validate input
        if (!html || typeof html !== 'string') {
          return new Response(JSON.stringify({
            success: false,
            error: 'Invalid HTML: must be a non-empty string',
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        if (!mode || typeof mode !== 'string') {
          return new Response(JSON.stringify({
            success: false,
            error: 'Invalid mode: must be a string',
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        let rewriter;
        
        switch (mode) {
          case 'add-attributes':
            rewriter = new HTMLRewriter()
              .on('*', {
                element(el) {
                  if (!el.hasAttribute('data-processed')) {
                    el.setAttribute('data-processed', 'true');
                  }
                },
              })
              .on('p', {
                element(el) {
                  el.setAttribute('class', 'enhanced-paragraph');
                },
              });
            break;
            
          case 'inject-content':
            rewriter = new HTMLRewriter()
              .on('body', {
                element(el) {
                  el.prepend('<div style="background: #e3f2fd; padding: 1rem; margin-bottom: 1rem; border-left: 4px solid #667eea;"><strong>📢 Injected Banner</strong></div>', { html: true });
                },
              })
              .on('p', {
                element(el) {
                  el.append(' <span style="color: #667eea;">✨</span>', { html: true });
                },
              });
            break;
            
          case 'text-replace':
            rewriter = new HTMLRewriter()
              .on('p', {
                text(text) {
                  text.replace(text.text.replace(/the/gi, 'THE').replace(/a/gi, 'A'));
                },
              });
            break;
            
          case 'remove-elements':
            rewriter = new HTMLRewriter()
              .on('script, style', {
                element(el) {
                  el.remove();
                },
              });
            break;
            
          case 'custom':
            // Custom transformation - add your own rules here
            rewriter = new HTMLRewriter()
              .on('h1, h2, h3', {
                element(el) {
                  el.setAttribute('style', 'color: #667eea;');
                },
              })
              .on('p', {
                element(el) {
                  el.setAttribute('style', 'line-height: 1.6;');
                },
              });
            break;
            
          default:
            rewriter = new HTMLRewriter();
        }
        
        try {
          // Measure transformation time using Bun.nanoseconds()
          const startTime = Bun.nanoseconds();
          
          const transformed = rewriter.transform(new Response(html));
          const result = await transformed.text();
          
          const endTime = Bun.nanoseconds();
          const duration = (endTime - startTime) / 1_000_000; // Convert to milliseconds
          
          return new Response(JSON.stringify({
            success: true,
            transformed: result,
            duration: `${duration.toFixed(3)} ms`,
          }), {
            headers: { 
              'Content-Type': 'application/json',
              'X-Transform-Duration': `${duration.toFixed(3)}ms`,
            },
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[HTMLRewriter] Transformation error:`, errorMessage);
          
          return new Response(JSON.stringify({
            success: false,
            error: errorMessage,
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      });
    }
    
    // Main editor page
    const editorPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HTMLRewriter Live Editor</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #f5f5f5;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1.5rem;
      text-align: center;
    }
    .container {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      padding: 1rem;
      overflow: hidden;
    }
    @media (max-width: 768px) {
      .container { grid-template-columns: 1fr; }
    }
    .panel {
      display: flex;
      flex-direction: column;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .panel-header {
      background: #f8f9fa;
      padding: 1rem;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .panel-content {
      flex: 1;
      overflow: auto;
    }
    textarea {
      width: 100%;
      height: 100%;
      border: none;
      padding: 1rem;
      font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
      font-size: 14px;
      resize: none;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    .controls {
      background: white;
      padding: 1rem;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      align-items: center;
    }
    select {
      padding: 0.5rem 1rem;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-size: 1rem;
      background: white;
    }
    button {
      padding: 0.5rem 1.5rem;
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
    }
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .status {
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
    }
    .status.success {
      background: #d4edda;
      color: #155724;
    }
    .status.error {
      background: #f8d7da;
      color: #721c24;
    }
  </style>
</head>
<body>
  <header>
    <h1>🚀 HTMLRewriter Live Editor</h1>
    <p>Edit HTML and see transformations in real-time</p>
  </header>
  
  <div class="controls">
    <select id="mode-select">
      <option value="add-attributes">Add Attributes</option>
      <option value="inject-content">Inject Content</option>
      <option value="text-replace">Text Replace</option>
      <option value="remove-elements">Remove Elements</option>
      <option value="custom">Custom Transform</option>
    </select>
    <button onclick="transform(this)">Transform</button>
    <button onclick="loadExample()">Load Example</button>
    <div id="status"></div>
  </div>
  
  <div class="container">
    <div class="panel">
      <div class="panel-header">
        <strong>📝 Input HTML</strong>
      </div>
      <div class="panel-content">
        <textarea id="input-html" placeholder="Enter HTML here..."><!DOCTYPE html>
<html>
<head>
  <title>Test Page</title>
</head>
<body>
  <h1>Hello World</h1>
  <p>This is a test paragraph.</p>
  <p>Another paragraph with some text.</p>
</body>
</html></textarea>
      </div>
    </div>
    
    <div class="panel">
      <div class="panel-header">
        <strong>✨ Transformed HTML</strong>
      </div>
      <div class="panel-content">
        <iframe id="output-frame" srcdoc="<p style='padding: 2rem; color: #666;'>Click 'Transform' to see the result</p>"></iframe>
      </div>
    </div>
  </div>
  
  <script>
    let transforming = false;
    
    function showStatus(message, type) {
      const status = document.getElementById('status');
      status.className = 'status ' + type;
      status.textContent = message;
      setTimeout(() => {
        status.textContent = '';
        status.className = 'status';
      }, 3000);
    }
    
    async function transform(btn) {
      if (transforming) return;
      
      const html = document.getElementById('input-html').value;
      const mode = document.getElementById('mode-select').value;
      
      if (!html.trim()) {
        showStatus('Please enter some HTML', 'error');
        return;
      }
      
      transforming = true;
      const button = btn || document.querySelector('button[onclick="transform()"]');
      if (button) {
        button.disabled = true;
        button.textContent = 'Transforming...';
      }
      
      try {
        const response = await fetch('/api/transform', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html, mode }),
        });
        
        const data = await response.json();
        
        if (data.success) {
          document.getElementById('output-frame').srcdoc = data.transformed;
          const duration = data.duration ? ' (' + data.duration + ')' : '';
          showStatus('✅ Transformation successful!' + duration, 'success');
        } else {
          showStatus('❌ Error: ' + data.error, 'error');
        }
      } catch (error) {
        showStatus('❌ Network error: ' + error.message, 'error');
      } finally {
        transforming = false;
        if (button) {
          button.disabled = false;
          button.textContent = 'Transform';
        }
      }
    }
    
    function loadExample() {
      const examples = {
        'add-attributes': \`<!DOCTYPE html>
<html>
<head><title>Example</title></head>
<body>
  <h1>Title</h1>
  <p>Paragraph 1</p>
  <p>Paragraph 2</p>
</body>
</html>\`,
        'inject-content': \`<!DOCTYPE html>
<html>
<head><title>Example</title></head>
<body>
  <h1>Welcome</h1>
  <p>This is a paragraph.</p>
</body>
</html>\`,
        'text-replace': \`<!DOCTYPE html>
<html>
<head><title>Example</title></head>
<body>
  <p>This is a test paragraph.</p>
  <p>Another paragraph with the word "the" in it.</p>
</body>
</html>\`,
        'remove-elements': \`<!DOCTYPE html>
<html>
<head>
  <title>Example</title>
  <style>body { color: red; }</style>
</head>
<body>
  <h1>Content</h1>
  <script>console.log('test');</script>
  <p>This paragraph will remain.</p>
</body>
</html>\`,
        'custom': \`<!DOCTYPE html>
<html>
<head><title>Example</title></head>
<body>
  <h1>Heading 1</h1>
  <h2>Heading 2</h2>
  <p>This is a paragraph with some content.</p>
  <p>Another paragraph here.</p>
</body>
</html>\`
      };
      
      const mode = document.getElementById('mode-select').value;
      document.getElementById('input-html').value = examples[mode] || examples['add-attributes'];
    }
    
    // Auto-transform on mode change
    document.getElementById('mode-select').addEventListener('change', function() {
      if (document.getElementById('input-html').value.trim()) {
        transform(this);
      }
    });
    
    // Load example on page load
    loadExample();
  </script>
</body>
</html>`;
    
    return new Response(editorPage, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
});

// ═══════════════════════════════════════════════════════════════
// 6.1.4.0.0.0.0.4.0 SERVER STARTUP
// ═══════════════════════════════════════════════════════════════

const serverUrl = `http://localhost:${server.port}`;

console.log('\n' + '═'.repeat(70));
console.log('  🎨 HTMLRewriter Live Editor');
console.log('═'.repeat(70));
console.log(`\n📊 Server running at: ${serverUrl}`);
console.log(`🌐 Open in browser: ${serverUrl}`);
console.log(`🔌 Hostname: ${server.hostname || '0.0.0.0'}`);
console.log(`🚪 Port: ${server.port}`);
console.log('\n💡 Features:');
console.log('  • Live HTML editor with real-time preview');
console.log('  • Multiple transformation modes');
console.log('  • Side-by-side comparison');
console.log('  • Load example HTML templates');
console.log('  • Performance timing (Bun.nanoseconds())');
console.log('\n🎮 Usage:');
console.log('  1. Enter HTML in the left panel');
console.log('  2. Select transformation mode');
console.log('  3. Click "Transform" to see result');
console.log('  4. View transformed HTML in right panel');
console.log('\n⌨️  Keyboard Shortcuts:');
console.log('  • Ctrl+C - Stop server');
console.log('  • r - Refresh (in browser)');
console.log('\nPress Ctrl+C to stop\n');

// ═══════════════════════════════════════════════════════════════
// 6.1.4.0.0.0.0.4.1 GRACEFUL SHUTDOWN
// ═══════════════════════════════════════════════════════════════

// Bun handles SIGINT/SIGTERM automatically
// For custom cleanup, you can use server.stop() when needed
// Example: server.stop() will gracefully close all connections
