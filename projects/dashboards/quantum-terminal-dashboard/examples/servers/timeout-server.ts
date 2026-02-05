// Bun server demonstrating idleTimeout configuration
export default {
  port: 4006,
  idleTimeout: 5, // 5 seconds idle timeout

  async fetch(req: Request) {
    const now = new Date().toISOString();
    return new Response(`Server time: ${now}\nIdle timeout: 5 seconds\nRequest: ${req.method} ${new URL(req.url).pathname}`, {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};