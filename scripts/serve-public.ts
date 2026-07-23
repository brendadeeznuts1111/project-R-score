// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// Serve all public/ files with correct MIME types
const PORT = 3000;

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname === '/' ? '/index.html' : url.pathname;

    // Try exact path first
    let file = Bun.file(`public${path}`);
    if (await file.exists()) {
      return new Response(file);
    }
    // Try directory → index.html
    if (!path.endsWith('/')) path += '/';
    file = Bun.file(`public${path}index.html`);
    if (await file.exists()) {
      return new Response(file);
    }
    return new Response('Not found', { status: 404 });
  },
});

console.log(`http://localhost:${PORT}/`);
