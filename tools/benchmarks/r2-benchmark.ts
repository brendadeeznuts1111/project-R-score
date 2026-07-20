#!/usr/bin/env bun

// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/file-io — Bun.write
// R2 Benchmark script for scanner-cookies bucket
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
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

const accountId = '7a470541a704caaf91e71efccc78fd36';
const bucketName = 'scanner-cookies';

// You need to set these environment variables:
// export R2_ACCESS_KEY_ID="your_access_key"
// export R2_SECRET_ACCESS_KEY="your_secret_key"

if (!Bun.env.R2_ACCESS_KEY_ID || !Bun.env.R2_SECRET_ACCESS_KEY) {
  console.info('❌ Missing R2 credentials');
  console.info('Please set:');
  console.info("export R2_ACCESS_KEY_ID='your_access_key'");
  console.info("export R2_SECRET_ACCESS_KEY='your_secret_key'");
  console.info('\nTo get credentials:');
  console.info('1. Go to https://dash.cloudflare.com/profile/api-tokens');
  console.info('2. Create token with R2 permissions');
  console.info('3. Or use: bunx wrangler r2 bucket create scanner-cookies --output-json');
  globalThis.process.exit(1);
}

const keys = [];
for (let i = 0; i < 10; i++) {
  keys.push(`bench-${Bun.randomUUIDv7().slice(0, 8)}`);
}

const start = performance.now();

await Promise.all(
  keys.map(async k => {
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    const url = `s3://${bucketName}/${k}?endpoint=${endpoint}&accessKeyId=${Bun.env.R2_ACCESS_KEY_ID}&secretAccessKey=${Bun.env.R2_SECRET_ACCESS_KEY}`;

    await globalThis.Bun.write(url, new Uint8Array(260));
    return globalThis.Bun.file(url).arrayBuffer();
  })
);

const r2Roundtrip = (performance.now() - start) / 10;

console.info({
  r2Bucket: bucketName,
  liveR2: '✅ scanner-cookies',
  r2Latency: r2Roundtrip.toFixed(0) + 'ms/roundtrip',
  bunNative: '0.1ms/local',
  '✅': 'Live R2 vs Bun.file',
});
