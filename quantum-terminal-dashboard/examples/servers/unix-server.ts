// Bun server demonstrating Unix domain socket support
export default {
  unix: "/tmp/bun-test.sock", // Unix domain socket
  async fetch(req: Request) {
    return new Response(`Hello from Unix socket server! Path: ${new URL(req.url).pathname}`, {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};