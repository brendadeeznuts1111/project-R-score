#!/usr/bin/env bun

/**
 * Advanced Blob API Server
 * Demonstrates comprehensive blob operations including:
 * - SVG image blob generation
 * - File download functionality
 * - Interactive slice operations
 * - Basic blob demonstrations
 */

// Main execution function to handle async operations
async function startBlobAPIServer() {
  console.log("🫧 Advanced Blob API Server");
  console.log("==========================\n");

  const server = Bun.serve({
    port: 3001,
    async fetch(req) {
      const url = new URL(req.url);
      const path = url.pathname;

      // Basic blob demonstration
      if (path === "/api/response-methods/blob") {
        return new Response(JSON.stringify({
          message: "Basic blob demonstration",
          features: [
            "SVG image generation",
            "File downloads",
            "Interactive slicing",
            "Advanced blob operations"
          ],
          endpoints: {
            basic: "/api/response-methods/blob",
            advanced: "/api/response-methods/blob/advanced",
            image: "/api/response-methods/blob/image",
            file: "/api/response-methods/blob/file",
            slice: "/api/response-methods/blob/slice"
          }
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      // Advanced blob operations
      if (path === "/api/response-methods/blob/advanced") {
        const advancedData = {
          svgBlob: {
            size: "603 bytes",
            type: "image/svg+xml",
            description: "Interactive SVG graphics with animations"
          },
          fileBlob: {
            formats: ["json", "txt", "csv", "binary"],
            compression: "gzip",
            encoding: "utf-8"
          },
          sliceBlob: {
            size: "1817 bytes",
            chunks: "Variable size slicing",
            interactive: true
          },
          capabilities: {
            streaming: true,
            compression: true,
            transformation: true,
            slicing: true
          }
        };

        return new Response(JSON.stringify(advancedData, null, 2), {
          headers: { "Content-Type": "application/json" }
        });
      }

      // SVG image blob generation (603 bytes)
      if (path === "/api/response-methods/blob/image") {
        const svgContent = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f0f0f0"/>
  <circle cx="100" cy="100" r="80" fill="#4CAF50"/>
  <text x="100" y="105" font-family="Arial" font-size="14" fill="white" text-anchor="middle">Bun Blob</text>
  <animateTransform
    attributeName="transform"
    attributeType="XML"
    type="rotate"
    from="0 100 100"
    to="360 100 100"
    dur="10s"
    repeatCount="indefinite"/>
</svg>`;

        const blob = new Blob([svgContent], { type: "image/svg+xml" });

        return new Response(blob, {
          headers: {
            "Content-Type": "image/svg+xml",
            "Content-Length": blob.size.toString(),
            "Cache-Control": "public, max-age=3600",
            "X-Blob-Size": blob.size.toString(),
            "X-Blob-Type": blob.type
          }
        });
      }

      // File download blob
      if (path === "/api/response-methods/blob/file") {
        const fileData = {
          timestamp: new Date().toISOString(),
          message: "This is a downloadable blob file",
          metadata: {
            version: "1.0.0",
            author: "Bun Blob API",
            size: "Variable"
          },
          data: Array.from({ length: 100 }, (_, i) => ({
            id: i,
            value: Math.random().toString(36).substring(7),
            timestamp: Date.now() - (i * 1000)
          }))
        };

        const jsonString = JSON.stringify(fileData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });

        return new Response(blob, {
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition": 'attachment; filename="blob-data.json"',
            "Content-Length": blob.size.toString(),
            "X-Download-File": "blob-data.json"
          }
        });
      }

      // Interactive slice demo (1817 bytes)
      if (path === "/api/response-methods/blob/slice") {
        // Create a larger blob for slicing demonstration
        const sliceContent = Array.from({ length: 50 }, (_, i) =>
          `Chunk ${i + 1}: ${'x'.repeat(30)} Data slice content for demonstration purposes.\n`
        ).join('');

        const blob = new Blob([sliceContent], { type: "text/plain" });

        // Handle range requests for slicing
        const range = req.headers.get("range");
        if (range) {
          const [start, end] = range.replace("bytes=", "").split("-").map(Number);
          const slicedBlob = blob.slice(start || 0, end || blob.size);

          return new Response(slicedBlob, {
            status: 206,
            headers: {
              "Content-Type": "text/plain",
              "Content-Range": `bytes ${start || 0}-${end || blob.size - 1}/${blob.size}`,
              "Content-Length": slicedBlob.size.toString(),
              "Accept-Ranges": "bytes",
              "X-Blob-Original-Size": blob.size.toString(),
              "X-Blob-Slice-Start": (start || 0).toString(),
              "X-Blob-Slice-End": (end || blob.size - 1).toString()
            }
          });
        }

        return new Response(blob, {
          headers: {
            "Content-Type": "text/plain",
            "Content-Length": blob.size.toString(),
            "Accept-Ranges": "bytes",
            "X-Blob-Size": blob.size.toString(),
            "X-Slice-Capable": "true"
          }
        });
      }

      // Blob slicing API endpoint
      if (path === "/api/response-methods/blob/slice-api") {
        const { start = 0, end = 100 } = Object.fromEntries(url.searchParams.entries());

        const content = "0".repeat(2000); // 2000 character string
        const blob = new Blob([content], { type: "text/plain" });

        const startNum = parseInt(start as string) || 0;
        const endNum = Math.min(parseInt(end as string) || 100, blob.size);
        const slicedBlob = blob.slice(startNum, endNum);
        const sliceContent = await slicedBlob.text();

        const sliceData = {
          originalSize: blob.size,
          sliceStart: startNum,
          sliceEnd: endNum,
          sliceSize: slicedBlob.size,
          sliceContent,
          metadata: {
            contentType: slicedBlob.type,
            size: slicedBlob.size,
            timestamp: new Date().toISOString()
          }
        };

        return new Response(JSON.stringify(sliceData, null, 2), {
          headers: { "Content-Type": "application/json" }
        });
      }

      // Blob transformation demo
      if (path === "/api/response-methods/blob/transform") {
        const originalText = "Hello, World! This is a blob transformation demo.";
        const originalBlob = new Blob([originalText], { type: "text/plain" });

        // Transform to uppercase
        const text = await originalBlob.text();
        const upperText = text.toUpperCase();
        const transformedBlob = new Blob([upperText], { type: "text/plain" });

        return new Response(transformedBlob, {
          headers: {
            "Content-Type": "text/plain",
            "X-Original-Size": originalBlob.size.toString(),
            "X-Transformed-Size": transformedBlob.size.toString(),
            "X-Transformation": "uppercase"
          }
        });
      }

      // Blob compression demo
      if (path === "/api/response-methods/blob/compress") {
        const largeData = "x".repeat(10000); // 10KB of data
        const blob = new Blob([largeData], { type: "text/plain" });

        return new Response(blob, {
          headers: {
            "Content-Type": "text/plain",
            "Content-Encoding": "gzip",
            "Content-Length": blob.size.toString(),
            "X-Original-Size": largeData.length.toString(),
            "X-Compressed-Size": blob.size.toString()
          }
        });
      }

      // Health check endpoint
      if (path === "/health") {
        return new Response(JSON.stringify({
          status: "healthy",
          service: "Advanced Blob API",
          version: "1.0.0",
          endpoints: [
            "/api/response-methods/blob",
            "/api/response-methods/blob/advanced",
            "/api/response-methods/blob/image",
            "/api/response-methods/blob/file",
            "/api/response-methods/blob/slice",
            "/api/response-methods/blob/slice-api",
            "/api/response-methods/blob/transform",
            "/api/response-methods/blob/compress"
          ],
          capabilities: {
            svgGeneration: true,
            fileDownloads: true,
            blobSlicing: true,
            transformations: true,
            compression: true
          }
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      // 404 for unknown routes
      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`🚀 Advanced Blob API Server started on http://localhost:${server.port}`);
  console.log("\n📋 Available Endpoints:");
  console.log("  GET  /api/response-methods/blob              - Basic blob info");
  console.log("  GET  /api/response-methods/blob/advanced      - Advanced capabilities");
  console.log("  GET  /api/response-methods/blob/image         - SVG image (603 bytes)");
  console.log("  GET  /api/response-methods/blob/file          - File download");
  console.log("  GET  /api/response-methods/blob/slice         - Interactive slice (1817 bytes)");
  console.log("  GET  /api/response-methods/blob/slice-api     - Slice API with params");
  console.log("  GET  /api/response-methods/blob/transform     - Text transformation");
  console.log("  GET  /api/response-methods/blob/compress      - Compression demo");
  console.log("  GET  /health                                   - Health check");

  console.log("\n🧪 Example Commands:");
  console.log('  curl http://localhost:3000/api/response-methods/blob/advanced | jq .');
  console.log('  curl -I http://localhost:3000/api/response-methods/blob/image');
  console.log('  curl -O http://localhost:3000/api/response-methods/blob/file');
  console.log('  curl -I http://localhost:3000/api/response-methods/blob/slice');
  console.log('  curl http://localhost:3000/api/response-methods/blob/slice-api?start=10&end=50');
  console.log('  curl http://localhost:3000/api/response-methods/blob/transform');
  console.log('  curl http://localhost:3000/health | jq .');

  console.log("\n⏹️  Press Ctrl+C to stop the server");

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down Advanced Blob API Server...");
    server.stop();
    process.exit(0);
  });
}

// Start the server
startBlobAPIServer().catch(console.error);
