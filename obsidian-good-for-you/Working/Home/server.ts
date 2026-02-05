// Bun HTTP server for Apple ID Integration demos
const server = Bun.serve({
  port: 8080,
  fetch(req) {
    const url = new URL(req.url);
    
    // Serve the main Apple ID demo
    if (url.pathname === '/' || url.pathname === '/apple-id-demo.html') {
      const file = Bun.file('./apple-id-demo.html');
      return new Response(file);
    }
    
    // Serve the simple demo
    if (url.pathname === '/demo.html') {
      const file = Bun.file('./simple-demo.html');
      return new Response(file);
    }
    
    // Serve the comprehensive API demo
    if (url.pathname === '/api-demo.html') {
      const file = Bun.file('./api-demo.html');
      return new Response(file);
    }
    
    // Return 404 for other routes
    return new Response('Page not found', { 
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
  },
});

console.log(`🍎 Apple ID Integration Demo Server`);
console.log(`🚀 Running at http://localhost:${server.port}`);
console.log(`📱 Main Demo: http://localhost:${server.port}/apple-id-demo.html`);
console.log(`🔧 Simple Demo: http://localhost:${server.port}/demo.html`);
console.log(`📚 API Demo: http://localhost:${server.port}/api-demo.html`);
