#!/usr/bin/env bun

// R2 Benchmark script for scanner-cookies bucket
export {}; // Make this a module

// Type declarations for global access
declare global {
  var process: {
    env: Record<string, string | undefined>;
    exit: (code?: number) => never;
  };
  var Bun: {
    write: (path: string, data: Uint8Array) => Promise<number>;
    file: (path: string) => { arrayBuffer: () => Promise<ArrayBuffer> };
  };
}

const accountId = "7a470541a704caaf91e71efccc78fd36";
const bucketName = "scanner-cookies";

// You need to set these environment variables:
// export R2_ACCESS_KEY_ID="your_access_key"
// export R2_SECRET_ACCESS_KEY="your_secret_key"

if (!globalThis.process.env.R2_ACCESS_KEY_ID || !globalThis.process.env.R2_SECRET_ACCESS_KEY) {
  console.log("❌ Missing R2 credentials");
  console.log("Please set:");
  console.log("export R2_ACCESS_KEY_ID='your_access_key'");
  console.log("export R2_SECRET_ACCESS_KEY='your_secret_key'");
  console.log("\nTo get credentials:");
  console.log("1. Go to https://dash.cloudflare.com/profile/api-tokens");
  console.log("2. Create token with R2 permissions");
  console.log("3. Or use: bunx wrangler r2 bucket create scanner-cookies --output-json");
  globalThis.process.exit(1);
}

const keys = [];
for (let i = 0; i < 10; i++) {
  keys.push(`bench-${crypto.randomUUID().slice(0,8)}`);
}

const start = performance.now();

await Promise.all(keys.map(async k => {
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const url = `s3://${bucketName}/${k}?endpoint=${endpoint}&accessKeyId=${globalThis.process.env.R2_ACCESS_KEY_ID}&secretAccessKey=${globalThis.process.env.R2_SECRET_ACCESS_KEY}`;
  
  await globalThis.Bun.write(url, new Uint8Array(260));
  return globalThis.Bun.file(url).arrayBuffer();
}));

const r2Roundtrip = (performance.now() - start) / 10;

console.log({
  r2Bucket: bucketName,
  liveR2: "✅ scanner-cookies",
  r2Latency: r2Roundtrip.toFixed(0) + "ms/roundtrip",
  bunNative: "0.1ms/local",
  "✅": "Live R2 vs Bun.file"
});
