// Bun server using export default syntax with TypeScript satisfies
import type { Serve } from "bun";

export default {
  port: 4007,
  hostname: "localhost",

  fetch(req) {
    const url = new URL(req.url);
    return new Response(`Hello from export default server!\nMethod: ${req.method}\nPath: ${url.pathname}\nPort: ${url.port}`, {
      headers: { 'Content-Type': 'text/plain' }
    });
  },
} satisfies Serve.Options<undefined>;