#!/usr/bin/env bun

/**
 * Simple FormData File Upload Demo
 * Based on Bun documentation pattern
 * 
 * Pattern:
 * 1. Use req.formData() to parse form data
 * 2. Use formdata.get() to extract fields
 * 3. Use Bun.write() to save files to disk
 */

// HTML Form
const indexHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Form Upload Demo</title>
    <style>
      body { font-family: system-ui; max-width: 500px; margin: 50px auto; padding: 20px; }
      .form-group { margin-bottom: 15px; }
      label { display: block; margin-bottom: 5px; font-weight: bold; }
      input[type="text"], input[type="file"] { width: 100%; padding: 8px; }
      button { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
      button:hover { background: #2563eb; }
      .message { margin-top: 15px; padding: 10px; border-radius: 4px; }
      .success { background: #dcfce7; color: #166534; }
      .error { background: #fee2e2; color: #991b1b; }
    </style>
  </head>
  <body>
    <h1>📤 File Upload Demo</h1>
    <form action="/action" method="post" enctype="multipart/form-data">
      <div class="form-group">
        <label for="name">Name:</label>
        <input type="text" id="name" name="name" placeholder="Enter your name" required />
      </div>
      <div class="form-group">
        <label for="profilePicture">Profile Picture:</label>
        <input type="file" id="profilePicture" name="profilePicture" accept="image/*" required />
      </div>
      <button type="submit">Upload</button>
    </form>
  </body>
</html>
`;

// HTTP Server
const server = Bun.serve({
  port: 4000,
  async fetch(req) {
    const url = new URL(req.url);

    // Return index.html for root path
    if (url.pathname === "/") {
      return new Response(indexHtml, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Parse formdata at /action
    if (url.pathname === "/action") {
      try {
        const formdata = await req.formData();
        const name = formdata.get("name");
        const profilePicture = formdata.get("profilePicture");

        if (!profilePicture) {
          return new Response("Must upload a profile picture.", { status: 400 });
        }

        // profilePicture is a Blob
        // Write profilePicture to disk
        await Bun.write("profilePicture.png", profilePicture);

        console.log(`✅ Uploaded: ${name}'s profile picture (${(profilePicture as Blob).size} bytes)`);

        return new Response(`✅ Success! Uploaded ${name}'s profile picture.`, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      } catch (error) {
        console.error(`❌ Upload error: ${error}`);
        return new Response(`❌ Error: ${error}`, { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`
╔════════════════════════════════════════════╗
║  FormData File Upload Demo                 ║
╠════════════════════════════════════════════╣
║  🌐 Server: http://localhost:${server.port}          ║
║  📤 Visit: http://localhost:${server.port}/            ║
║                                            ║
║  Steps:                                     ║
║  1. Enter your name                         ║
║  2. Select an image file                   ║
║  3. Click Upload                           ║
║  4. File saved as profilePicture.png       ║
╚════════════════════════════════════════════╝
`);
