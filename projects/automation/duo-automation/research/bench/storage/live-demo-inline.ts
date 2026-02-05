import { S3R2NativeManager } from "../../src/storage/s3-r2-native";
import { alignedTable } from "../../utils/super-table.js";

/**
 * Live Demo for Inline Browser Previews
 * This script uploads a sample screenshot with environment metadata and 
 * starts a small server to demo the inline "disposition" logic.
 */

async function runLiveDemo() {
    console.log("🚀 Starting Native S3 Inline Browser Demo...");

    const PUBLIC_URL_BASE = "https://pub-dc0e1ef5dd2245be81d6670a9b7b1550.r2.dev";

    // 1. Load Environment Variables (Native Bun Loaders)
    const manager = new S3R2NativeManager({
        endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || "https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com",
        accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID || "69765dd738766bca38be63e7d0192cf8",
        secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY || "1d9326ffb0c59ebecb612f401a87f71942574984375fb283fc4359630d7d929a",
        bucket: process.env.CLOUDFLARE_R2_BUCKET || "factory-wager-packages",
    });

    // 2. Create Sample Data (1x1 Blue Pixel PNG as placeholder or more complex)
    // For demo, let's create a 100x100 solid blue PNG (simplified)
    const pngData = new Uint8Array([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0x60, 0x60, 0x60, 0xF8,
        0x0F, 0x00, 0x01, 0x05, 0x01, 0x02, 0xF2, 0x1F, 0xB5, 0x79, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
        0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);

    const demoKey = `demos/inline-test-${Date.now()}.png`;
    const envMetadata = {
        environment: "production-sim",
        node_version: process.version,
        bun_version: Bun.version,
        region: "us-east-1",
        captured_by: "Cline-Native-S3"
    };

    console.log(`📤 Uploading demo screenshot to: ${demoKey}`);
    const uploadResult = await manager.uploadScreenshot(pngData, demoKey, envMetadata);

    if (!uploadResult.success) {
        console.error("❌ Upload failed:", uploadResult);
        return;
    }

    console.log("✅ Upload Successful!");
    const publicUrl = `${PUBLIC_URL_BASE}/${demoKey}`;
    console.log(`🔗 Public URL: ${publicUrl}`);

    // 3. Start Demo Server
    const port = 3344;
    console.log(`\n🌐 Starting Demo Server on http://localhost:${port}...`);
    
    const server = Bun.serve({
        port,
        async fetch(req) {
            const url = new URL(req.url);
            
            if (url.pathname === "/") {
                return new Response(`
                    <html>
                        <head>
                            <title>DuoPlus Native S3 Inline Demo</title>
                            <style>
                                body { font-family: sans-serif; padding: 40px; background: #3b82f6; }
                                .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 600px; margin: auto; }
                                img { width: 100%; border: 1px solid #ddd; border-radius: 4px; }
                                pre { background: #eee; padding: 10px; border-radius: 4px; overflow-x: auto; }
                                .status { color: green; font-weight: bold; }
                            </style>
                        </head>
                        <body>
                            <div class="card">
                                <h1>Native S3 Inline Preview</h1>
                                <p class="status">✅ Bun ${Bun.version} Native S3 active</p>
                                <p>This image is served directly from R2 with <code>Content-Disposition: inline</code>.</p>
                                <div style="text-align: center; margin: 20px 0;">
                                    <img src="${publicUrl}" alt="Inline Screenshot" style="width: 200px; height: 200px; image-rendering: pixelated;">
                                </div>
                                <h3>Inlined Metadata</h3>
                                <pre>${JSON.stringify(envMetadata, null, 2)}</pre>
                                <p><small>Check network tabs: The response headers from R2 should show <code>content-disposition: inline</code></small></p>
                            </div>
                        </body>
                    </html>
                `, {
                    headers: { "Content-Type": "text/html" }
                });
            }
            
            return new Response("Not Found", { status: 404 });
        }
    });

    console.log(`🚀 Demo is live! Close the script to stop.`);
    
    // Log a nice table summary
    console.log("\n--- Demo Summary ---");
    alignedTable([
        { Metric: "Manager", Value: "S3R2NativeManager (bun:s3)" },
        { Metric: "Object Key", Value: demoKey },
        { Metric: "Disposition", Value: "inline" },
        { Metric: "Metadata Fields", Value: Object.keys(envMetadata).length.toString() },
        { Metric: "Public URL", Value: publicUrl }
    ], ["Metric", "Value"]);

    // Keep alive for a bit or until user kills it
    // In automated context, we might just exit, but here we want to let the user see it.
    // We'll keep it running for 10 minutes to allow browser interaction.
    console.log("Waiting for interaction (Press Ctrl+C to stop)...");
}

runLiveDemo().catch(console.error);
