// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// Serve all public/ files with correct MIME types
const PORT = 3000;

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname === '/' ? '/index.html' : url.pathname;

    const file = Bun.file(`public${path}`);
    if (await file.exists()) {
      return new Response(file);
    }
    return new Response('Not found', { status: 404 });
  },
});

console.log(`http://localhost:${PORT}/`);
