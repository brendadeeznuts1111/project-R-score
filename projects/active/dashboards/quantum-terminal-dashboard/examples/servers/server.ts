// Simple Bun server demonstrating port configuration
export default {
  async fetch(req: Request) {
    return new Response(`Hello from Bun server on ${new URL(req.url).port}!`, {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};