// server/content-type-server.ts
import { CONTENT_TYPES, ContentTypeHandler } from '../config/content-types.ts';
import { BUN_DOCS, TYPED_ARRAY_URLS } from '../config/urls.ts';
import { validateHost, validatePort } from '../lib/utils/env-validator.ts';

// Create server that demonstrates content-type handling with validated environment variables
const CONTENT_TYPE_SERVER_PORT = validatePort(process.env.CONTENT_TYPE_SERVER_PORT, 3001);
const CONTENT_TYPE_SERVER_HOST = validateHost(process.env.CONTENT_TYPE_SERVER_HOST) || validateHost(process.env.SERVER_HOST) || 'localhost';
const server = Bun.serve({
  port: CONTENT_TYPE_SERVER_PORT,
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Handle different content-type examples
    if (path === '/api/content-type/examples') {
      return handleContentTypeExamples();
    }
    
    if (path === '/api/content-type/test') {
      return await handleContentTypeTest(request);
    }
    
    if (path === '/api/typedarray/binary') {
      return await handleTypedArrayBinary(request);
    }
    
    if (path === '/api/content-type/auto-detect') {
      return await handleAutoDetect(request);
    }
    
    if (path === '/docs/content-type') {
      return handleContentTypeDocs();
    }
    
    if (path === '/api/verbose/demo') {
      return await handleVerboseDemo();
    }
    
    return handleDefault();
  },
});

// Show all content-type examples
function handleContentTypeExamples(): Response {
  const examples = {
    content_types: CONTENT_TYPES,
    examples: {
      json: {
        url: '/api/content-type/test',
        method: 'POST',
        headers: { 'Content-Type': CONTENT_TYPES.JSON },
        body: { message: 'Hello JSON' }
      },
      form_urlencoded: {
        url: '/api/content-type/test',
        method: 'POST',
        headers: { 'Content-Type': CONTENT_TYPES.FORM_URLENCODED },
        body: 'message=Hello+Form'
      },
      typed_array: {
        url: '/api/typedarray/binary',
        method: 'POST',
        headers: { 'Content-Type': CONTENT_TYPES.BINARY.UINT8_ARRAY },
        body: 'Uint8Array.from([72, 101, 108, 108, 111])'
      },
      auto_detect: {
        url: '/api/content-type/auto-detect',
        method: 'POST',
        body: { message: 'Auto-detect JSON' }
      }
    },
    documentation: {
      fetch: `${BUN_DOCS.BASE}/runtime/networking/fetch#content-type-handling`,
      typed_array: `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}`,
      binary_data: `${BUN_DOCS.BASE}/runtime/binary-data` 
    }
  };
  
  return Response.json(examples, {
    headers: { 
      'Cache-Control': 'public, max-age=3600'
    },
  });
}

// Test different content-types
async function handleContentTypeTest(request: Request): Promise<Response> {
  const contentType = request.headers.get('content-type') || 'unknown';
  let bodyParsed: any;
  
  try {
    if (contentType.includes(CONTENT_TYPES.JSON)) {
      bodyParsed = await request.json();
    } else if (contentType.includes(CONTENT_TYPES.FORM_URLENCODED)) {
      const text = await request.text();
      const params = new URLSearchParams(text);
      bodyParsed = Object.fromEntries(params);
    } else if (contentType.includes(CONTENT_TYPES.MULTIPART_FORM)) {
      const formData = await request.formData();
      bodyParsed = Object.fromEntries(formData);
    } else {
      bodyParsed = await request.text();
    }
  } catch (error) {
    bodyParsed = { error: error.message };
  }
  
  const response = {
    received: {
      method: request.method,
      contentType,
      contentLength: request.headers.get('content-length'),
      body: bodyParsed
    },
    timestamp: new Date().toISOString(),
    documentation: `${BUN_DOCS.BASE}/runtime/networking/fetch#content-type-handling` 
  };
  
  return Response.json(response, {
    headers: { 
      'X-Content-Type-Received': contentType
    },
  });
}

// Handle binary data with typed arrays
async function handleTypedArrayBinary(request: Request): Promise<Response> {
  const contentType = request.headers.get('content-type');
  const responseData = {
    method: request.method,
    contentType,
    binaryData: {
      available: ['arrayBuffer', 'bytes', 'blob']
    },
    examples: {
      // Binary data examples using fetch pattern
      fetchArrayBuffer: `const response = await fetch('/api/typedarray/binary');
const arrayBuffer = await response.arrayBuffer();
const uint8Array = new Uint8Array(arrayBuffer);`,
      
      fetchBytes: `const response = await fetch('/api/typedarray/binary');
const uint8Array = await response.bytes(); // Bun-specific shortcut`,
      
      createBinaryResponse: `// Creating a response with typed array
const uint8Array = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
return new Response(uint8Array, {
  headers: { 'Content-Type': 'application/octet-stream' }
});`
    },
    documentation: {
      fetch: `${BUN_DOCS.BASE}/runtime/networking/fetch#content-type-handling`,
      typed_array: `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}`,
      binary_methods: `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.METHODS}` 
    }
  };
  
  // Check if client wants binary response
  const accept = request.headers.get('accept');
  
  if (accept?.includes('application/octet-stream') || accept?.includes('*/*')) {
    // Return binary data
    const binaryData = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100]); // "Hello World"
    return new Response(binaryData, {
      headers: {
        'Content-Type': CONTENT_TYPES.BINARY.ARRAY_BUFFER,
        'Content-Length': binaryData.length.toString(),
        'X-Example': 'Binary response with Uint8Array'
      },
    });
  }
  
  // Return JSON response
  return Response.json(responseData, {
    headers: { 
      'Cache-Control': 'public, max-age=3600'
    },
  });
}

// Auto-detect content-type from request body
async function handleAutoDetect(request: Request): Promise<Response> {
  const contentType = request.headers.get('content-type');
  const autoDetectedType = ContentTypeHandler.getContentType(
    await request.clone().text()
  );
  
  const response = {
    request: {
      providedContentType: contentType,
      autoDetectedContentType: autoDetectedType,
      method: request.method,
      url: request.url
    },
    bunBehavior: {
      automaticContentType: 'Bun automatically sets Content-Type for:',
      behaviors: [
        'Blob objects: Uses the blob\'s type property',
        'FormData: Sets appropriate multipart boundary',
        'String/JSON: Defaults to text/plain, unless JSON detected',
        'TypedArrays: Uses application/octet-stream'
      ]
    },
    example: {
      fetchWithAutoContentType: `// Bun automatically sets Content-Type based on body type
const blob = new Blob(['Hello'], { type: 'text/plain' });
await fetch('/api/content-type/auto-detect', {
  method: 'POST',
  body: blob
  // Content-Type automatically set to 'text/plain'
});

const formData = new FormData();
formData.append('file', blob);
await fetch('/api/content-type/auto-detect', {
  method: 'POST',
  body: formData
  // Content-Type automatically set with boundary
});`
    },
    documentation: `${BUN_DOCS.BASE}/runtime/networking/fetch#content-type-handling` 
  };
  
  return Response.json(response, {
    headers: { 
      'X-Content-Type-Auto-Detected': autoDetectedType
    },
  });
}

// Content-type documentation page
function handleContentTypeDocs(): Response {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Content-Type Handling in Bun Fetch API</title>
  <style>
    body { font-family: -apple-system, sans-serif; padding: 2rem; max-width: 1000px; margin: 0 auto; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 6px; overflow-x: auto; }
    .example { border-left: 4px solid #4299e1; padding-left: 1rem; margin: 1rem 0; }
    .code-block { background: #1a202c; color: #e2e8f0; padding: 1rem; border-radius: 6px; }
  </style>
</head>
<body>
  <h1>Content-Type Handling in Bun Fetch API</h1>
  
  <p>Documentation: <a href="${BUN_DOCS.BASE}/runtime/networking/fetch#content-type-handling">Bun Fetch - Content-Type Handling</a></p>
  
  <h2>Automatic Content-Type Setting</h2>
  <p>Bun automatically sets the <code>Content-Type</code> header for request bodies when not explicitly provided:</p>
  
  <div class="example">
    <h3>📦 Blob Objects</h3>
    <pre><code>const blob = new Blob(['Hello, World!'], { type: 'text/plain' });
const response = await fetch('/api/endpoint', {
  method: 'POST',
  body: blob
  // Content-Type automatically set to 'text/plain'
});</code></pre>
  </div>
  
  <div class="example">
    <h3>📝 FormData</h3>
    <pre><code>const formData = new FormData();
formData.append('name', 'John');
formData.append('file', blob);

const response = await fetch('/api/endpoint', {
  method: 'POST',
  body: formData
  // Content-Type automatically set with multipart boundary
});</code></pre>
  </div>
  
  <div class="example">
    <h3>🔢 Typed Arrays (Uint8Array, ArrayBuffer)</h3>
    <pre><code>const uint8Array = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
const response = await fetch('/api/endpoint', {
  method: 'POST',
  body: uint8Array
  // Content-Type automatically set to 'application/octet-stream'
});</code></pre>
    <p>More on TypedArrays: <a href="${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}">TypedArray Documentation</a></p>
  </div>
  
  <h2>Explicit Content-Type Examples</h2>
  
  <div class="example">
    <h3>JSON</h3>
    <pre><code>const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': '${CONTENT_TYPES.JSON}'
  },
  body: JSON.stringify({ message: 'Hello' })
});</code></pre>
  </div>
  
  <div class="example">
    <h3>Form URL Encoded</h3>
    <pre><code>const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': '${CONTENT_TYPES.FORM_URLENCODED}'
  },
  body: 'name=John&age=30'
});</code></pre>
  </div>
  
  <h2>Testing Endpoints</h2>
  <ul>
    <li><a href="/api/content-type/examples">All Examples</a></li>
    <li><a href="/api/content-type/test">Test Content-Type Handler</a></li>
    <li><a href="/api/typedarray/binary">TypedArray Binary Endpoint</a></li>
    <li><a href="/api/content-type/auto-detect">Auto-Detect Content-Type</a></li>
  </ul>
  
  <h2>Fetch Pattern with Typed Arrays</h2>
  <div class="code-block">
    <pre><code>// From Bun documentation: ${BUN_DOCS.BASE}/runtime/networking/fetch
const response = await fetch('${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}');
console.log(response.status); // => 200

// Handle binary response
const arrayBuffer = await response.arrayBuffer();
const uint8Array = new Uint8Array(arrayBuffer);
console.log('Received', uint8Array.length, 'bytes');</code></pre>
  </div>
  
  <h2>Response Content-Type Handling</h2>
  <pre><code>// Creating responses with different content-types
new Response(JSON.stringify({ data: 'test' }), {
  headers: { 'Content-Type': '${CONTENT_TYPES.JSON}' }
});

new Response(new Uint8Array([1, 2, 3]), {
  headers: { 'Content-Type': '${CONTENT_TYPES.BINARY.ARRAY_BUFFER}' }
});

new Response('Hello World', {
  headers: { 'Content-Type': '${CONTENT_TYPES.TEXT_PLAIN}' }
});</code></pre>
</body>
</html>`;
  
  return new Response(html, {
    headers: { 'Content-Type': CONTENT_TYPES.TEXT_HTML }
  });
}

function handleDefault(): Response {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Content-Type Handling Examples</title>
</head>
<body>
  <h1>Content-Type Handling in Bun Fetch API</h1>
  <p>Explore how Bun handles Content-Type headers automatically and manually.</p>
  <ul>
    <li><a href="/docs/content-type">Documentation</a></li>
    <li><a href="/api/content-type/examples">API Examples</a></li>
    <li><a href="/api/verbose/demo">Verbose Logging Demo</a></li>
    <li><a href="${BUN_DOCS.BASE}/runtime/networking/fetch#content-type-handling">Official Docs</a></li>
    <li><a href="${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}">TypedArray Docs</a></li>
  </ul>
</body>
</html>`;
  
  return new Response(html, { headers: { 'Content-Type': CONTENT_TYPES.TEXT_HTML } });
}

// Handle verbose logging demo
async function handleVerboseDemo(): Promise<Response> {
  const { VerboseFetchDemo } = await import('../services/verbose-fetch-demo.ts');
  const demo = new VerboseFetchDemo();
  
  // Run demo in background
  demo.runAllVerboseDemos().catch(console.error);
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Verbose Fetch Logging Demo</title>
  <style>
    body { font-family: -apple-system, sans-serif; padding: 2rem; max-width: 1000px; margin: 0 auto; }
    pre { background: #1a202c; color: #e2e8f0; padding: 1rem; border-radius: 6px; overflow-x: auto; }
    .example { border-left: 4px solid #4299e1; padding-left: 1rem; margin: 1rem 0; }
    .verbose-output { background: #f7fafc; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 6px; font-family: monospace; }
  </style>
</head>
<body>
  <h1>🔍 Verbose Fetch Logging Demo</h1>
  <p>Running comprehensive verbose logging demonstrations... Check the server console for detailed HTTP request/response headers.</p>
  
  <h2>What Verbose Logging Shows</h2>
  <div class="example">
    <h3>📤 Request Headers</h3>
    <div class="verbose-output">
[fetch] > HTTP/1.1 POST http://${CONTENT_TYPE_SERVER_HOST}:${CONTENT_TYPE_SERVER_PORT}/api/content-type/test
[fetch] > Content-Type: application/json
[fetch] > User-Agent: Bun/1.3.3
[fetch] > Accept: */*
[fetch] > Host: ${CONTENT_TYPE_SERVER_HOST}:${CONTENT_TYPE_SERVER_PORT}
[fetch] > Content-Length: 32
    </div>
  </div>
  
  <div class="example">
    <h3>📥 Response Headers</h3>
    <div class="verbose-output">
[fetch] < 200 OK
[fetch] < Content-Type: application/json
[fetch] < Content-Length: 156
[fetch] < X-Content-Type-Received: application/json
[fetch] < Date: Wed, 04 Feb 2026 23:08:00 GMT
    </div>
  </div>
  
  <h2>Usage Examples</h2>
  <div class="example">
    <h3>Basic Verbose Logging</h3>
    <pre><code>const response = await fetch(`http://${CONTENT_TYPE_SERVER_HOST}:${CONTENT_TYPE_SERVER_PORT}/api/content-type/test`, {
  verbose: true // Bun-specific: shows detailed HTTP headers
});</code></pre>
  </div>
  
  <div class="example">
    <h3>Verbose with Content-Type</h3>
    <pre><code>const response = await fetch('http://${CONTENT_TYPE_SERVER_HOST}:${CONTENT_TYPE_SERVER_PORT}/api/content-type/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Hello' }),
  verbose: true // Shows all headers
});</code></pre>
  </div>
  
  <div class="example">
    <h3>Verbose with Binary Data</h3>
    <pre><code>const binaryData = new Uint8Array([72, 101, 108, 108, 111]);
const response = await fetch('http://${CONTENT_TYPE_SERVER_HOST}:${CONTENT_TYPE_SERVER_PORT}/api/typedarray/binary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/octet-stream' },
  body: binaryData,
  verbose: true
});</code></pre>
  </div>
  
  <h2>Test Commands</h2>
  <ul>
    <li><code>curl -X POST -H "Content-Type: application/json" -d '{"test": "data"}' http://${CONTENT_TYPE_SERVER_HOST}:${CONTENT_TYPE_SERVER_PORT}/api/content-type/test</code></li>
    <li><code>curl -H "Accept: application/octet-stream" http://${CONTENT_TYPE_SERVER_HOST}:${CONTENT_TYPE_SERVER_PORT}/api/typedarray/binary</code></li>
    <li><code>curl http://${CONTENT_TYPE_SERVER_HOST}:${CONTENT_TYPE_SERVER_PORT}/api/content-type/examples</code></li>
  </ul>
  
  <h2>Benefits of Verbose Logging</h2>
  <ul>
    <li>🔍 <strong>Debugging</strong> - See exactly what headers are sent/received</li>
    <li>📊 <strong>Learning</strong> - Understand HTTP protocol details</li>
    <li>🚀 <strong>Optimization</strong> - Analyze caching and compression</li>
    <li>🛠️ <strong>Troubleshooting</strong> - Identify network issues quickly</li>
    <li>📚 <strong>Documentation</strong> - Perfect for teaching HTTP concepts</li>
  </ul>
  
  <button onclick="location.reload()">Run Demo Again</button>
  <button onclick="location.href='/'">Back to Portal</button>
</body>
</html>`;
  
  return new Response(html, {
    headers: { 'Content-Type': CONTENT_TYPES.TEXT_HTML }
  });
}

console.log(`📨 Content-Type Server running on http://${CONTENT_TYPE_SERVER_HOST}:${CONTENT_TYPE_SERVER_PORT}`);
console.log(`📚 Documentation: ${BUN_DOCS.BASE}/runtime/networking/fetch#content-type-handling`);
