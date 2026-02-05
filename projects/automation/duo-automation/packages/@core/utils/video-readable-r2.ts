#!/usr/bin/env bun
// utils/video-readable-r2.ts
import { spawn } from "child_process";
import { S3R2NativeManager } from "../src/storage/s3-r2-native";

/**
 * Capture video from a source (e.g., screen or device) and stream it directly to R2.
 * Uses FFmpeg -> Node Readable -> Blob -> S3 Inline.
 */
export async function streamVideoToR2(outputPath: string) {
  // Load config for S3NativeManager
  const config = JSON.parse(await Bun.file("./config/config.json").text());
  const r2Config = {
    endpoint: config.reporting.cloudflareR2.endpoint,
    bucket: config.reporting.cloudflareR2.bucketName,
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "",
  };
  
  const s3 = new S3R2NativeManager(r2Config);
  
  console.log(`🎬 Initializing video capture for: ${outputPath}`);

  // Example FFmpeg command: Screen capture (macOS)
  const ffmpeg = spawn("ffmpeg", [
    "-f", "avfoundation", 
    "-i", "1:0",          
    "-t", "5",            
    "-vcodec", "libx264",
    "-pix_fmt", "yuv420p",
    "-f", "mp4",
    "-movflags", "frag_keyframe+empty_moov", 
    "pipe:1"              
  ]);

  const stream = ffmpeg.stdout;
  
  // Convert Node Readable to Blob for zero-copy upload
  const blob = await new Response(stream as any).blob();

  console.log(`🚀 Uploading video blob (${(blob.size / 1024).toFixed(1)}KB) to R2...`);

  const result = await s3.uploadPublicFile(
    outputPath,
    blob,
    "video/mp4"
  );

  if (result.success) {
    console.log(`✅ Video proof stored: ${result.url}`);
  }

  return result;
}

// Integration demo
if (import.meta.main) {
  if (process.env.PRODUCTION_SIM === "1") {
    console.log("🛠️ Simulation Mode: Skipping real FFmpeg capture.");
    const mockBlob = new Blob(["mock-video-content"], { type: "video/mp4" });
    
    // Mock config for sim
    const s3 = new S3R2NativeManager({
      endpoint: "https://sim.r2.cloudflarestorage.com",
      bucket: "sim-bucket",
      accessKeyId: "sim",
      secretAccessKey: "sim"
    });
    
    const res = await s3.uploadPublicFile("proofs/sim-video.mp4", mockBlob, "video/mp4");
    console.log(`✅ Sim video URL: ${res.url}`);
  } else {
    await streamVideoToR2(`proofs/reg-proof-${Date.now()}.mp4`);
  }
}
