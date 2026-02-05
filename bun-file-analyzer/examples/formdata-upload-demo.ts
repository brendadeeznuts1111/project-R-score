#!/usr/bin/env bun

/**
 * FormData File Upload Demo
 * Demonstrates file upload patterns using FormData with Bun's HTTP server
 * 
 * Features:
 * - HTML form serving
 * - File upload handling
 * - Multiple file uploads
 * - Progress tracking
 * - Security validation
 * - Error handling
 */

import { createCookieClient } from "../src/api/authenticated-client";
import { log } from "../src/utils/logger";

// Environment configuration
const UPLOAD_DIR = "./uploads";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "application/pdf"];

// Ensure upload directory exists
if (!Bun.exists(UPLOAD_DIR)) {
  Bun.mkdir(UPLOAD_DIR, { recursive: true });
  log.info(`Created upload directory: ${UPLOAD_DIR}`);
}

/**
 * HTML Form Template
 */
const formTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>File Upload Demo</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 600px;
      margin: 50px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 { color: #333; margin-bottom: 20px; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 5px; color: #555; font-weight: 500; }
    input[type="text"], input[type="file"] {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }
    button:hover { background: #2563eb; }
    button:disabled { background: #ccc; cursor: not-allowed; }
    .progress {
      width: 100%;
      height: 4px;
      background: #e5e7eb;
      margin-top: 10px;
      display: none;
    }
    .progress-bar {
      height: 100%;
      background: #3b82f6;
      width: 0%;
      transition: width 0.3s;
    }
    .message {
      margin-top: 15px;
      padding: 10px;
      border-radius: 4px;
      display: none;
    }
    .message.success { background: #dcfce7; color: #166534; }
    .message.error { background: #fee2e2; color: #991b1b; }
    .preview {
      margin-top: 10px;
      max-width: 200px;
      display: none;
    }
    .preview img { max-width: 100%; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📤 File Upload Demo</h1>
    <form id="uploadForm" action="/upload" method="post" enctype="multipart/form-data">
      <div class="form-group">
        <label for="name">Name:</label>
        <input type="text" id="name" name="name" placeholder="Enter your name" required>
      </div>
      <div class="form-group">
        <label for="files">Select Files:</label>
        <input type="file" id="files" name="files" accept="image/*,.pdf" multiple required>
        <div class="preview" id="preview"></div>
      </div>
      <button type="submit" id="submitBtn">Upload Files</button>
      <div class="progress" id="progress">
        <div class="progress-bar" id="progressBar"></div>
      </div>
      <div class="message" id="message"></div>
    </form>
  </div>
  
  <script>
    const form = document.getElementById('uploadForm');
    const fileInput = document.getElementById('files');
    const preview = document.getElementById('preview');
    const progress = document.getElementById('progress');
    const progressBar = document.getElementById('progressBar');
    const message = document.getElementById('message');
    const submitBtn = document.getElementById('submitBtn');
    
    // Preview selected images
    fileInput.addEventListener('change', (e) => {
      preview.innerHTML = '';
      preview.style.display = 'block';
      Array.from(e.target.files).forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            preview.appendChild(img);
          };
          reader.readAsDataURL(file);
        }
      });
    });
    
    // Handle form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      submitBtn.disabled = true;
      progress.style.display = 'block';
      progressBar.style.width = '0%';
      message.style.display = 'none';
      
      try {
        const response = await fetch('/upload', {
          method: 'POST',
          body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
          message.textContent = '✅ ' + result.message;
          message.className = 'message success';
          form.reset();
          preview.innerHTML = '';
        } else {
          throw new Error(result.error || 'Upload failed');
        }
      } catch (error) {
        message.textContent = '❌ ' + error.message;
        message.className = 'message error';
      } finally {
        progressBar.style.width = '100%';
        submitBtn.disabled = false;
        message.style.display = 'block';
      }
    });
  </script>
</body>
</html>
`;

/**
 * HTML Gallery Template
 */
const galleryTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Uploaded Files</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 { color: #333; margin-bottom: 20px; }
    .back-link {
      display: inline-block;
      margin-bottom: 20px;
      color: #3b82f6;
      text-decoration: none;
    }
    .back-link:hover { text-decoration: underline; }
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 20px;
    }
    .card {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .card img, .card object {
      width: 100%;
      height: 150px;
      object-fit: cover;
    }
    .card-body { padding: 10px; }
    .card-title {
      font-size: 12px;
      color: #666;
      word-break: break-all;
    }
    .empty {
      text-align: center;
      padding: 40px;
      color: #888;
    }
  </style>
</head>
<body>
  <a href="/" class="back-link">← Back to Upload</a>
  <h1>📁 Uploaded Files</h1>
  <div class="gallery" id="gallery">
    <div class="empty">No files uploaded yet</div>
  </div>
  
  <script>
    async function loadGallery() {
      try {
        const response = await fetch('/files');
        const files = await response.json();
        
        const gallery = document.getElementById('gallery');
        
        if (files.length === 0) {
          gallery.innerHTML = '<div class="empty">No files uploaded yet</div>';
          return;
        }
        
        gallery.innerHTML = files.map(file => \`
          <div class="card">
            \${file.type.startsWith('image/') 
              ? \`<img src="/uploads/\${file.name}" alt="\${file.name}">\`
              : \`<object data="/uploads/\${file.name}" type="application/pdf">\`
            }
            <div class="card-body">
              <div class="card-title">\${file.name}</div>
            </div>
          </div>
        \`).join('');
      } catch (error) {
        console.error('Failed to load gallery:', error);
      }
    }
    
    loadGallery();
  </script>
</body>
</html>
`;

/**
 * Validate uploaded file
 */
function validateFile(file: Blob, fieldName: string): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `${fieldName} exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }
  
  // Check file type
  if (ALLOWED_TYPES.length > 0 && !ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: `${fieldName} has invalid type: ${file.type}` };
  }
  
  return { valid: true };
}

/**
 * Sanitize filename
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/_{2,}/g, "_")
    .substring(0, 255);
}

/**
 * HTTP Server with FormData handling
 */
const server = Bun.serve({
  port: 4000,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    log.info(`${req.method} ${pathname}`);

    // Serve upload form
    if (pathname === "/" || pathname === "/index.html") {
      return new Response(formTemplate, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Serve gallery
    if (pathname === "/gallery") {
      return new Response(galleryTemplate, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Handle file upload
    if (pathname === "/upload" && req.method === "POST") {
      try {
        const formData = await req.formData();
        const name = formData.get("name");
        const files = formData.getAll("files");

        if (!name) {
          return new Response(JSON.stringify({ error: "Name is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (!files || files.length === 0) {
          return new Response(JSON.stringify({ error: "At least one file is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Process uploaded files
        const uploadedFiles: Array<{ name: string; size: number; type: string }> = [];

        for (const file of files) {
          if (!(file instanceof Blob)) {
            continue;
          }

          // Validate file
          const validation = validateFile(file, "file");
          if (!validation.valid) {
            return new Response(JSON.stringify({ error: validation.error }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Generate safe filename
          const timestamp = Date.now();
          const sanitizedName = sanitizeFilename(file.name || "upload");
          const filename = `${timestamp}-${sanitizedName}`;
          const filepath = `${UPLOAD_DIR}/${filename}`;

          // Write file to disk
          await Bun.write(filepath, file);

          uploadedFiles.push({
            name: filename,
            size: file.size,
            type: file.type,
          });

          log.success(`Uploaded: ${filename} (${file.size} bytes)`);
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
            files: uploadedFiles,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );

      } catch (error) {
        log.error(`Upload error: ${error}`);
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : "Upload failed" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // List uploaded files
    if (pathname === "/files" && req.method === "GET") {
      try {
        const files = await Array.fromAsync(Bun.glob(`${UPLOAD_DIR}/*`));
        
        const fileList = files
          .filter(file => file.isFile)
          .map(file => ({
            name: file.filename,
            size: (await file.stat()).size,
            type: getMimeType(file.filename),
          }));

        return new Response(JSON.stringify(fileList), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(JSON.stringify([]), {
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Serve uploaded files
    if (pathname.startsWith("/uploads/")) {
      const filename = pathname.replace("/uploads/", "");
      const filepath = `${UPLOAD_DIR}/${filename}`;

      if (Bun.exists(filepath)) {
        const file = Bun.file(filepath);
        return new Response(file, {
          headers: { "Content-Type": getMimeType(filename) },
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});

/**
 * Get MIME type from filename
 */
function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    pdf: "application/pdf",
    html: "text/html",
    txt: "text/plain",
    json: "application/json",
  };
  return mimeTypes[ext || ""] || "application/octet-stream";
}

console.log(`
╔════════════════════════════════════════════════════════════╗
║           FormData File Upload Demo                        ║
╠════════════════════════════════════════════════════════════╣
║  🌐 Server running at: http://localhost:${server.port}              ║
║                                                            ║
║  📤 Upload Form:     http://localhost:${server.port}/                ║
║  📁 File Gallery:     http://localhost:${server.port}/gallery          ║
║                                                            ║
║  📋 Features:                                            ║
║     • Multiple file uploads                               ║
║     • File type validation                                ║
║     • Size limits (10MB max)                              ║
║     • Image preview                                       ║
║     • Progress tracking                                   ║
║     • Secure filename handling                            ║
╚════════════════════════════════════════════════════════════╝
`);

// Graceful shutdown
process.on("SIGINT", () => {
  log.info("Shutting down server...");
  server.stop();
  process.exit(0);
});
