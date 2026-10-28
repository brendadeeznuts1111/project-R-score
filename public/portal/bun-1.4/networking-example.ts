// Example: Bun networking primitives (fetch + serve) with theme tokens.
const server = Bun.serve({
  port: 0,
  fetch(req) {
    return new Response("ok", { headers: { "content-type": "text/plain" } });
  },
});
console.log("listening on", server.url);
const res = await fetch(server.url);
console.log("status:", res.status, "body:", await res.text());
server.stop();