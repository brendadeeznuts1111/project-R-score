/**
 * Sync Audit Report and Telemetry Artifacts to R2.
 */
import { ProductionR2Manager } from "../src/core/storage/production-r2-manager";
import { S3Client } from 'bun';

async function syncToBucket() {
  console.log("☁️  Starting R2 Artifact Sync...");
  
  const bucket = process.env.R2_BUCKET || 'duoplus-storage';
  const client = new S3Client({
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucket: bucket,
    endpoint: process.env.R2_ENDPOINT || '',
    region: 'auto',
  });

  const artifacts = [
    { local: "reports/audit-v2.2.md", remote: "audits/audit-v2.2.md", type: "text/markdown" },
    { local: "bench/telemetry-overhead-bench.ts", remote: "bench/telemetry-overhead-bench.ts", type: "text/plain" }
  ];

  for (const artifact of artifacts) {
    const file = Bun.file(artifact.local);
    if (!(await file.exists())) {
        console.error(`❌ Local file not found: ${artifact.local}`);
        continue;
    }

    const content = await file.text();
    const r2File = client.file(artifact.remote);
    
    await r2File.write(content, {
      type: artifact.type,
      contentDisposition: "inline"
    });
    
    console.log(`✅ Synced: ${artifact.local} -> r2://${bucket}/${artifact.remote}`);
  }

  console.log("\n🎊 R2 Synchronization Complete.");
}

syncToBucket();
