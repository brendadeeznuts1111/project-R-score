import { Bun } from "bun";

const server = Bun.serve({
  port: 3003,
  fetch(req) {
    return new Response("Test server working", {
      headers: { "Content-Type": "text/plain" },
    });
  },
});

console.log(`Test server on port 3003`);
