
import { BunR2AppleManager } from '../../src/storage/r2-apple-manager.js';
import { S3R2NativeManager } from '../../src/storage/s3-r2-native.js';
import { loadScopedSecrets } from '../../utils/secrets-loader.js';
import { alignedTable } from '../../utils/super-table.js';

async function main() {
  console.log('🚀 **Bench S3 Native vs Presign (1k Uploads)**');
  
  const secrets = await loadScopedSecrets();
  const bucket = secrets.r2Bucket || 'factory-wager-packages';
  
  const s3Config = {
    endpoint: Bun.env.S3_ENDPOINT || '',
    bucket: bucket,
    accessKeyId: Bun.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: Bun.env.S3_SECRET_ACCESS_KEY || ''
  };

  const s3R2 = new S3R2NativeManager(s3Config);
  const r2Manager = new BunR2AppleManager({}, bucket);
  await r2Manager.initialize();

  const count = 1000;
  const bulkApples = Array(count).fill(0).map((_, i) => ({
    email: `bench-${i}@example.com`,
    success: true,
    filename: `bench-s3-native-${i}.json`,
    batchID: 'bench-123'
  }));

  console.log(`\n⏳ Benchmarking ${count} uploads...`);

  // Presign Bench (Old)
  const startPresign = Bun.nanoseconds();
  const presignPromises = bulkApples.map(id => 
    r2Manager.uploadAppleID(id, id.filename).catch(() => ({ success: false }))
  );
  await Promise.all(presignPromises);
  const presignMs = (Bun.nanoseconds() - startPresign) / 1e6;

  // S3 Native Bench (New)
  const s3Res = await s3R2.bulkUpload(bulkApples);
  const s3Ms = s3Res.totalMs;

  const results = [
    {
      Method: 'S3 Native',
      Time: `${s3Ms.toFixed(0)}ms`,
      Throughput: `${(count / (s3Ms / 1000)).toFixed(0)} IDs/s`,
      Status: '🟢'
    },
    {
      Method: 'Presign',
      Time: `${presignMs.toFixed(0)}ms`,
      Throughput: `${(count / (presignMs / 1000)).toFixed(0)} IDs/s`,
      Status: '🟡'
    }
  ];

  console.log('\n✅ **Live Comparison Results**');
  alignedTable(results, ['Method', 'Time', 'Throughput', 'Status']);

  const speedup = presignMs / s3Ms;
  console.log(`\n🏆 **S3 Native is ${speedup.toFixed(2)}x faster than Presign!** 🚀`);
}

main().catch(console.error);
