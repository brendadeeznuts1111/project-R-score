// Environment variables
const PORT = process.env.PORT || "3879";

console.log(`🚀 Starting server on http://localhost:${PORT}`);
console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);

// MIME type mapping
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

function getMimeType(path: string): string {
  const ext = path.substring(path.lastIndexOf('.'));
  return mimeTypes[ext as keyof typeof mimeTypes] || 'text/plain';
}

const server = Bun.serve({
  port: parseInt(PORT),
  development: process.env.NODE_ENV !== "production",
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // Serve static files from public directory
    try {
      const filePath = `./public${path === "/" ? "/index.html" : path}`;
      const file = Bun.file(filePath);
      const exists = await file.exists();
      
      if (exists) {
        const mimeType = getMimeType(filePath);
        return new Response(file, {
          headers: {
            'Content-Type': mimeType,
            'Cache-Control': process.env.NODE_ENV === 'production' 
              ? 'public, max-age=31536000' 
              : 'no-cache',
          }
        });
      }
    } catch (error) {
      console.error("Error serving file:", error);
    }

    // Fallback to index.html for SPA routing
    try {
      const indexFile = Bun.file("./public/index.html");
      const exists = await indexFile.exists();
      
      if (exists) {
        return new Response(indexFile, {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache',
          }
        });
      }
    } catch (error) {
      console.error("Error serving index.html:", error);
    }

    return new Response("File not found", { status: 404 });
  },
});

console.log(`✅ Server running at http://localhost:${PORT}`);
console.log(`📁 Serving files from ./public directory`);

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down server...");
  server.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Shutting down server...");
  server.stop();
  process.exit(0);
});
