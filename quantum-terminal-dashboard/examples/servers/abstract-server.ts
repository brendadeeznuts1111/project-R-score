// Bun server demonstrating Linux abstract namespace socket support
export default {
  unix: "\0bun-abstract-socket", // Abstract namespace socket (Linux only)
  async fetch(req: Request) {
    return new Response(`Hello from abstract namespace socket server! Path: ${new URL(req.url).pathname}`, {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};