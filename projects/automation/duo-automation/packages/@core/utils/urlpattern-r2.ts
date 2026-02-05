// utils/urlpattern-r2.ts - Enhanced URLPattern + R2 SUPERCHARGED

import { BunR2AppleManager } from '../src/storage/r2-apple-manager';

// Enhanced URLPattern patterns with extension support
// @ts-ignore
declare var URLPattern: any;

export const R2_PATTERNS = [
  new URLPattern({ pathname: 'accounts/apple-id/:nested*/:userId.:ext' }), // support accounts/apple-id/nested/user.json
  new URLPattern({ pathname: 'apple-ids/:nested*/:userId.:ext' }), // legacy support
  new URLPattern({ pathname: 'reports/:type/:date.:ext' }), 
  new URLPattern({ pathname: 'cache/:category/:key.:ext' }), 
  new URLPattern({ pathname: 'multi-region/:region/:id.:ext' }),
  new URLPattern({ pathname: 'successes/:userId.:ext' }),
  new URLPattern({ pathname: 'failures/:userId.:ext' })
] as const;

// Enhanced Mock Apple data generator
export function mockAppleData(index: number) {
  const domains = ['icloud.com', 'me.com', 'mac.com', 'gmail.com', 'outlook.com'];
  const countries = [
    { code: 'US', cities: ['New York', 'Los Angeles', 'Chicago', 'Houston'] },
    { code: 'GB', cities: ['London', 'Manchester', 'Birmingham', 'Glasgow'] },
    { code: 'DE', cities: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt'] },
    { code: 'AU', cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth'] },
    { code: 'CA', cities: ['Toronto', 'Vancouver', 'Montreal', 'Ottawa'] }
  ];
  
  const country = countries[Math.floor(Math.random() * countries.length)];
  const city = country.cities[Math.floor(Math.random() * country.cities.length)];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  
  const timestamp = Date.now() - Math.floor(Math.random() * 86400000);
  
  return {
    email: `user${index}@${domain}`,
    deviceId: `device-${Bun.randomUUIDv7().slice(0, 8)}-${index}`,
    timestamp,
    isoDate: new Date(timestamp).toISOString(),
    status: Math.random() > 0.1 ? 'active' : 'flagged',
    success: Math.random() > 0.2,
    country: country.code,
    city,
    metadata: {
      source: 'bulk-bench',
      version: '2.0',
      attempt: Math.floor(Math.random() * 3) + 1
    },
    index
  };
}

// Ultra-fast path classification (<100μs)
export function classifyPath(path: string): { pattern: string; metadata: Record<string, string>; description: string; name: string } | null {
  const PATTERN_NAMES = [
    'Apple ID Storage',
    'Legacy Apple ID',
    'Performance Reports',
    'Session Cache',
    'Multi-Region Assets',
    'Success Logs',
    'Failure Logs'
  ];

  for (const [i, pattern] of R2_PATTERNS.entries()) {
    const match = pattern.exec({ pathname: path });
    if (match?.pathname?.groups) {
      const metadata = match.pathname.groups as Record<string, string>;
      const name = PATTERN_NAMES[i] || `PATTERN_${i + 1}`;
      
      let description = `${name} entry`;
      if (metadata.userId) description += ` for user ${metadata.userId}`;
      if (metadata.type) description += ` (${metadata.type})`;
      if (metadata.region) description += ` in ${metadata.region}`;

      return {
        pattern: `PATTERN_${i + 1}`,
        name,
        description,
        metadata
      };
    }
  }
  return null;
}

// Bulk Classify + Upload (Gen paths → classify → R2)
export async function bulkClassifyUpload(manager: BunR2AppleManager, scale: number = 500) {
  console.log(`🚀 **Bulk Classify + Upload: ${scale} paths**`);
  
  const paths: string[] = [];
  for (let i = 0; i < scale; i++) {
    paths.push(`accounts/apple-id/user${i + 1}.json`);
  }

  const classifyStart = Bun.nanoseconds();
  const classified = paths.map(path => {
    const result = classifyPath(path);
    return result ? { path, ...result } : null;
  }).filter(Boolean) as Array<{ path: string; pattern: string; metadata: Record<string, string> }>;
  const classifyTime = (Bun.nanoseconds() - classifyStart) / 1e6;

  console.log(`🔍 Classified ${scale} paths in ${classifyTime.toFixed(2)}ms (${(scale / classifyTime * 1000).toFixed(0)} paths/s)`);

  console.log(`📤 Uploading ${classified.length} classified files...`);
  const uploadStart = Bun.nanoseconds();
  
  const uploads = classified.map(({ path, pattern, metadata }, i) => {
    const data = { 
      ...mockAppleData(i), 
      patternMeta: { pattern, ...metadata },
      classifiedAt: Date.now()
    };
    const filename = path.split('/').pop()?.replace('.json', '') || `user${i}`;
    return manager.uploadAppleID(data, filename);
  });

  const results = await Promise.all(uploads);
  const uploadTime = (Bun.nanoseconds() - uploadStart) / 1e6;
  
  const successful = results.filter(r => r.success).length;
  console.log(`✅ Uploaded ${successful}/${results.length} files in ${uploadTime.toFixed(2)}ms`);
  
  return {
    classified: classified.length,
    uploaded: successful,
    classifyTime,
    uploadTime,
    throughput: scale / classifyTime * 1000
  };
}

// Nanosecond benchmark for 50k paths
export async function benchmarkURLPattern() {
  console.log(`⚡ **URLPattern Benchmark: 50k paths**`);
  
  const paths = Array(50000).fill(0).map((_, i) => `accounts/apple-id/user${i}.json`);
  
  const start = Bun.nanoseconds();
  const matches = paths.map(classifyPath).filter(Boolean);
  const time = (Bun.nanoseconds() - start) / 1000; // microseconds
  
  console.log(`🎯 Results:`);
  console.log(`  Total paths: ${paths.length}`);
  console.log(`  Matches: ${matches.length}`);
  console.log(`  Time: ${time.toFixed(0)}μs`);
  console.log(`  Throughput: ${(paths.length / time * 1000000).toFixed(0)} paths/s`);
  console.log(`  Avg per path: ${(time / paths.length).toFixed(2)}μs`);
  
  return { paths: paths.length, matches: matches.length, time, throughput: paths.length / time * 1000000 };
}

// CLI interface
if (import.meta.main) {
  const { config } = await import('dotenv');
  config({ path: './.env' });
  
  const manager = new BunR2AppleManager({}, process.env.R2_BUCKET || 'factory-wager-packages');
  const scale = parseInt(process.argv[2]) || 500;
  
  console.log(`🎯 **URLPattern + R2 SUPERCHARGED** 🎯`);
  const bulkResult = await bulkClassifyUpload(manager, scale);
  await benchmarkURLPattern();
  console.log(`\n🎉 **SUPERCHARGED Complete!**`);
}
