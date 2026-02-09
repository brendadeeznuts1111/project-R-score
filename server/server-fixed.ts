// server/server-fixed.ts
import { BUN_DOCS, TYPED_ARRAY_URLS, RSS_URLS } from '../config/urls.ts';
import { FetchService } from '../services/core/fetch-service.ts';
import { AdvancedFetchService } from '../services/core/advanced-fetch-service.ts';

const fetchService = new FetchService();
const advancedFetchService = new AdvancedFetchService();

// Handle typed array documentation
async function handleTypedArrayDocs(url: URL): Promise<Response> {
  const section = url.hash.slice(1) || 'typedarray';
  const docs = await fetchService.fetchTypedArrayDocs(section);
  
  return new Response(docs, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

// Binary data documentation
async function handleBinaryData(url: URL): Promise<Response> {
  const response = await fetch(`${BUN_DOCS.BASE}${BUN_DOCS.RUNTIME.BINARY_DATA}`);
  
  const html = await response.text();
  
  return new Response(html, {
    status: response.status,
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

// Fetch example endpoint
async function handleFetchExample(): Promise<Response> {
  const exampleCode = `// Example from Bun docs: https://bun.sh/docs/runtime/networking/fetch
const response = await fetch("${BUN_DOCS.BASE}${BUN_DOCS.API.FETCH}");
console.log(response.status); // => 200
const text = await response.text(); // or response.json(), response.arrayBuffer(), etc.

// Our typed array base URL: ${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}
const typedArrayResponse = await fetch("${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}");
console.log(\`TypedArray docs status: \${typedArrayResponse.status}\`);
`;
  
  return new Response(exampleCode, {
    headers: { 'Content-Type': 'application/javascript' },
  });
}

// RSS feed endpoint
async function handleRSSFeed(): Promise<Response> {
  try {
    const feedXml = await fetchService.fetchRSSFeed();
    
    return new Response(feedXml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=1800',
      },
    });
  } catch (error: any) {
    return new Response(`Error fetching RSS: ${error.message}`, { status: 500 });
  }
}

// Return all typed array URLs
async function handleTypedArrayURLs(): Promise<Response> {
  const urls = {
    base: `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}`,
    methods: `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.METHODS}`,
    conversion: `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.CONVERSION}`,
    examples: `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.EXAMPLES}`,
    related: {
      fetch: `${BUN_DOCS.BASE}${BUN_DOCS.API.FETCH}`,
      binary_data: `${BUN_DOCS.BASE}${BUN_DOCS.RUNTIME.BINARY_DATA}`,
      networking: `${BUN_DOCS.BASE}${BUN_DOCS.RUNTIME.NETWORKING}`,
    }
  };
  
  return Response.json(urls);
}

// Generate our own RSS feed
async function generateRSSFeed(): Promise<Response> {
  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Bun TypedArray Documentation Updates</title>
  <link>${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}</link>
  <description>Latest updates and examples for TypedArrays in Bun</description>
  <lastBuildDate>${new Date().toISOString()}</lastBuildDate>
  
  <item>
    <title>TypedArray Methods Reference</title>
    <link>${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.METHODS}</link>
    <description>Complete reference of all TypedArray methods available in Bun</description>
    <pubDate>${new Date().toISOString()}</pubDate>
    <guid>${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.METHODS}</guid>
  </item>
  
  <item>
    <title>Binary Data Conversion Examples</title>
    <link>${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.CONVERSION}</link>
    <description>Examples of converting between different binary data formats</description>
    <pubDate>${new Date().toISOString()}</pubDate>
    <guid>${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.CONVERSION}</guid>
  </item>
</channel>
</rss>`;
  
  return new Response(feed, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}

// JSON feed endpoint
async function generateJSONFeed(): Promise<Response> {
  const feed = {
    version: "https://jsonfeed.org/version/1",
    title: "Bun TypedArray Documentation",
    home_page_url: `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}`,
    feed_url: `${BUN_DOCS.BASE}/feed/json`,
    items: [
      {
        id: TYPED_ARRAY_URLS.METHODS,
        url: `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.METHODS}`,
        title: "TypedArray Methods",
        content_text: "Complete reference of all TypedArray methods",
        date_published: new Date().toISOString(),
      },
      {
        id: TYPED_ARRAY_URLS.CONVERSION,
        url: `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.CONVERSION}`,
        title: "Binary Data Conversion",
        content_text: "Examples of converting between binary formats",
        date_published: new Date().toISOString(),
      },
    ],
  };
  
  return Response.json(feed);
}

// Root endpoint
async function handleRoot(): Promise<Response> {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Bun TypedArray Documentation Portal</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@1/css/pico.min.css">
  <link rel="alternate" type="application/rss+xml" href="/feed/rss" title="Bun TypedArray RSS">
  <link rel="alternate" type="application/json" href="/feed/json" title="Bun TypedArray JSON Feed">
</head>
<body>
  <main class="container">
    <h1>📚 Bun TypedArray Documentation</h1>
    
    <section>
      <h2>Base URL Pattern</h2>
      <p>All typed array documentation uses this base pattern:</p>
      <pre><code>${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}</code></pre>
    </section>
    
    <section>
      <h2>API Endpoints</h2>
      <div class="grid">
        <article>
          <h3>📄 Documentation</h3>
          <ul>
            <li><a href="/docs/typedarray">TypedArray Docs</a></li>
            <li><a href="/docs/runtime/binary-data">Binary Data Docs</a></li>
            <li><a href="${BUN_DOCS.BASE}${BUN_DOCS.API.FETCH}" target="_blank">Fetch API Docs</a></li>
          </ul>
        </article>
        
        <article>
          <h3>⚡ Quick Examples</h3>
          <ul>
            <li><a href="/api/fetch">Fetch Example</a></li>
            <li><a href="/api/advanced-fetch">Advanced Fetch Demo</a></li>
            <li><a href="/api/advanced-demo">Run Advanced Demo</a></li>
            <li><a href="/api/typedarray/urls">All TypedArray URLs</a></li>
            <li><a href="/api/rss">RSS Feed</a></li>
          </ul>
        </article>
        
        <article>
          <h3>📰 Feeds</h3>
          <ul>
            <li><a href="/feed/rss">RSS Feed (XML)</a></li>
            <li><a href="/feed/json">JSON Feed</a></li>
          </ul>
        </article>
      </div>
    </section>
    
    <section>
      <h2>Advanced Bun Fetch Features</h2>
      <p>This portal demonstrates advanced fetch capabilities from <a href="https://bun.sh/docs/runtime/networking/fetch" target="_blank">Bun's fetch documentation</a>:</p>
      <div class="grid">
        <article>
          <h4>🚀 Performance</h4>
          <ul>
            <li>DNS prefetching with <code>dns.prefetch()</code></li>
            <li>Preconnect with <code>fetch.preconnect()</code></li>
            <li>Automatic connection pooling</li>
            <li>HTTP keep-alive optimization</li>
          </ul>
        </article>
        <article>
          <h4>🔧 Bun-Specific</h4>
          <ul>
            <li><code>response.bytes()</code> for Uint8Array</li>
            <li><code>verbose: true</code> for debugging</li>
            <li><code>AbortSignal.timeout()</code></li>
            <li>Enhanced error handling</li>
          </ul>
        </article>
        <article>
          <h4>📡 Streaming</h4>
          <ul>
            <li>Stream response bodies</li>
            <li>Stream request bodies</li>
            <li>Binary data handling</li>
            <li>Concurrent requests</li>
          </ul>
        </article>
      </div>
    </section>
    
    <section>
      <h2>Try the Fetch Pattern</h2>
      <pre><code>// Using Bun's native fetch pattern:
const response = await fetch("/api/typedarray/urls");
console.log(response.status); // => 200
const data = await response.json();
console.log(data.base); // => "${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}"</code></pre>
      
      <button onclick="testFetch()">Test Fetch</button>
      <div id="result"></div>
    </section>
  </main>
  
  <script>
    async function testFetch() {
      const response = await fetch('/api/typedarray/urls');
      const result = document.getElementById('result');
      result.innerHTML = \`Status: \${response.status}\`;
      
      if (response.ok) {
        const data = await response.json();
        result.innerHTML += \`<pre>\${JSON.stringify(data, null, 2)}</pre>\`;
      }
    }
  </script>
</body>
</html>`;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}

// Advanced fetch demo endpoint
async function handleAdvancedFetchDemo(): Promise<Response> {
  const demoCode = `// Advanced Bun Fetch Features Demo
// This demonstrates all the advanced features from Bun's fetch documentation

import { AdvancedFetchService } from '../services/core/advanced-fetch-service.ts';
import { dns } from 'bun';

const service = new AdvancedFetchService();

// 1. DNS Prefetching (Bun-specific optimization)
dns.prefetch('bun.sh');

// 2. Preconnect (Bun-specific optimization)
await fetch.preconnect('https://bun.sh');

// 3. Fetch with timeout
const response = await fetch("https://bun.sh/docs/api/fetch", {
  signal: AbortSignal.timeout(5000),
  verbose: true, // Bun-specific debugging
});

// 4. Streaming response
for await (const chunk of response.body!) {
  console.log(\`Received chunk: \${chunk.length} bytes\`);
}

// 5. Binary data as Uint8Array (Bun-specific)
const bytes = await response.bytes();
console.log(\`Got \${bytes.length} bytes as Uint8Array\`);

// 6. POST with streaming body
const stream = new ReadableStream({
  start(controller) {
    controller.enqueue("Hello");
    controller.enqueue(" ");
    controller.enqueue("World");
    controller.close();
  },
});

await fetch("https://example.com", {
  method: "POST",
  body: stream,
});

// 7. Custom headers and verbose logging
await fetch("https://bun.sh/docs/api/fetch", {
  headers: {
    "User-Agent": "Bun-TypedArray-Docs/1.0",
    "X-Custom-Header": "Demo",
  },
  verbose: true,
});

// 8. Concurrent fetching with connection pooling
const responses = await Promise.all([
  fetch("https://bun.sh/docs/api/fetch"),
  fetch("https://bun.sh/docs/runtime/binary-data"),
  fetch("https://bun.sh/docs/runtime/networking"),
]);

// 9. Different response methods
const text = await response.text();
const jsonData = await response.clone().json();
const arrayBuffer = await response.clone().arrayBuffer();
const uint8Array = await response.clone().bytes(); // Bun-specific

console.log("Advanced fetch demo completed!");
`;
  
  return new Response(demoCode, {
    headers: { 'Content-Type': 'application/javascript' },
  });
}

// Run the actual advanced demo
async function runAdvancedDemo(): Promise<Response> {
  try {
    if (process.env.DEBUG === '1') {
      console.log('🎯 Running advanced fetch demo...');
    }
    
    // Run the demo in the background
    advancedFetchService.runFullDemo().catch((error) => {
      console.error('❌ Advanced fetch demo failed:', error);
    });
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Advanced Bun Fetch Demo</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@1/css/pico.min.css">
</head>
<body>
  <main class="container">
    <h1>🚀 Advanced Bun Fetch Demo</h1>
    <p>Running comprehensive fetch demo... Check the server console for detailed output.</p>
    
    <section>
      <h2>Features Demonstrated</h2>
      <ul>
        <li>✅ DNS Prefetching (Bun-specific)</li>
        <li>✅ Preconnect (Bun-specific)</li>
        <li>✅ Timeout with AbortSignal.timeout</li>
        <li>✅ Streaming response bodies</li>
        <li>✅ Binary data with Uint8Array (Bun-specific)</li>
        <li>✅ POST with streaming request bodies</li>
        <li>✅ Custom headers and verbose logging</li>
        <li>✅ Concurrent fetching with connection pooling</li>
        <li>✅ Error handling patterns</li>
        <li>✅ Multiple response body methods</li>
      </ul>
    </section>
    
    <section>
      <h2>Bun-Specific Extensions</h2>
      <ul>
        <li><code>response.bytes()</code> - Get Uint8Array</li>
        <li><code>verbose: true</code> - Debug logging</li>
        <li><code>dns.prefetch()</code> - DNS optimization</li>
        <li><code>fetch.preconnect()</code> - Connection optimization</li>
        <li><code>AbortSignal.timeout()</code> - Easy timeouts</li>
      </ul>
    </section>
    
    <section>
      <h2>Performance Features</h2>
      <ul>
        <li>Automatic connection pooling</li>
        <li>DNS caching (30 seconds by default)</li>
        <li>HTTP keep-alive</li>
        <li>Simultaneous connection limit (256 default)</li>
        <li>Response buffering optimization</li>
      </ul>
    </section>
    
    <button onclick="location.reload()">Run Demo Again</button>
    <button onclick="location.href='/'">Back to Portal</button>
  </main>
</body>
</html>`;
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });
    
  } catch (error: any) {
    return new Response(`Demo error: ${error.message}`, { status: 500 });
  }
}

// 404 handler
function handleNotFound(request: Request): Response {
  return new Response(`Endpoint not found: ${new URL(request.url).pathname}`, {
    status: 404,
    headers: { 'Content-Type': 'text/plain' },
  });
}

// Create server with endpoints matching Bun's fetch pattern
const SERVER_PORT = parseInt(process.env.SERVER_PORT || '3000', 10);
const SERVER_HOST = process.env.SERVER_HOST || 'localhost';
const server = Bun.serve({
  port: SERVER_PORT,
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Route handling
    switch (path) {
      case '/':
        return await handleRoot();
      case '/docs/typedarray':
        return await handleTypedArrayDocs(url);
      case '/docs/runtime/binary-data':
        return await handleBinaryData(url);
      case '/api/fetch':
        return await handleFetchExample();
      case '/api/advanced-fetch':
        return await handleAdvancedFetchDemo();
      case '/api/advanced-demo':
        return await runAdvancedDemo();
      case '/api/rss':
        return await handleRSSFeed();
      case '/api/typedarray/urls':
        return await handleTypedArrayURLs();
      case '/feed/rss':
        return await generateRSSFeed();
      case '/feed/json':
        return await generateJSONFeed();
      default:
        return handleNotFound(request);
    }
  },
});

console.log(`🚀 Starting Bun TypedArray Documentation Server on port ${SERVER_PORT}...`);
console.log(`📚 Base URL: ${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}`);
console.log(`🌐 Visit: http://${SERVER_HOST}:${SERVER_PORT}`);

export default server;
