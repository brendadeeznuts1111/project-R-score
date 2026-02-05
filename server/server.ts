// server/server.ts
import { BUN_DOCS, TYPED_ARRAY_URLS, RSS_URLS } from '../config/urls.ts';
import { FetchService } from '../services/fetch-service.ts';

const fetchService = new FetchService();

// Create server with endpoints matching Bun's fetch pattern
const SERVER_PORT = parseInt(process.env.SERVER_PORT || '3000', 10);
const server = Bun.serve({
  port: SERVER_PORT,
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Match the pattern from Bun docs: const response = await fetch("http://example.com");
    const endpoints: Record<string, (request?: Request, url?: URL) => Promise<Response>> = {
      // Documentation endpoints
      '/docs/typedarray': () => handleTypedArrayDocs(url),
      '/docs/runtime/binary-data': () => handleBinaryData(url),
      
      // API endpoints matching Bun's fetch examples
      '/api/fetch': () => handleFetchExample(),
      '/api/rss': () => handleRSSFeed(),
      '/api/typedarray/urls': () => handleTypedArrayURLs(),
      
      // RSS feed endpoints
      '/feed/rss': () => generateRSSFeed(),
      '/feed/json': () => generateJSONFeed(),
      
      // Default endpoint
      '/': () => handleRoot(),
    };
    
    const handler = endpoints[path] || handleNotFound;
    return await handler(request, url);
  },
});

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
    // Fetch from actual Bun docs
    const response = await fetch(`${BUN_DOCS.BASE}${BUN_DOCS.RUNTIME.BINARY_DATA}`);
    console.log(`Binary data docs fetch status: ${response.status}`);
    
    const html = await response.text();
    
    return new Response(html, {
      status: response.status,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  },
  
  // Fetch example endpoint (matches Bun's fetch documentation)
  async handleFetchExample(): Promise<Response> {
    // This endpoint demonstrates the exact pattern from Bun docs
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
  },
  
  // RSS feed endpoint
  async handleRSSFeed(): Promise<Response> {
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
  },
  
  // Return all typed array URLs
  async handleTypedArrayURLs(): Promise<Response> {
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
    
    return new Response(JSON.stringify(urls, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
  
  // Generate our own RSS feed
  async generateRSSFeed(): Promise<Response> {
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
  },
  
  // JSON feed endpoint (alternative to RSS)
  async generateJSONFeed(): Promise<Response> {
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
    
    return new Response(JSON.stringify(feed, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
  
  // Root endpoint
  async handleRoot(): Promise<Response> {
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
  },
  
  // 404 handler
  handleNotFound(request: Request): Response {
    return new Response(`Endpoint not found: ${new URL(request.url).pathname}`, {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};

console.log(`🚀 Starting Bun TypedArray Documentation Server on port ${SERVER_PORT}...`);
console.log(`📚 Base URL: ${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}`);
console.log(`🌐 Visit: http://localhost:${SERVER_PORT}`);

export default server;
