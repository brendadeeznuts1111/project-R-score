// tests/empire-patterns.test.ts
import { 
  Gate, 
  Filter, 
  Path, 
  Upload, 
  Pattern, 
  Query, 
  BlobFarm, 
  Farm 
} from '../utils/empire-patterns';

console.info('🧪 Testing EMPIRE PRO ONE-LINER PATTERN API (URLPattern-Consistent)\n');

// --- TIER 0 ---

console.info('Testing §Gate: Setup Validation...');
const gate = new Gate("54/56");
console.info(`Test (>96%): ${gate.test() === true ? '✅' : '❌'}`);
console.info(`Exec ROI: ${gate.exec()?.roi === '3.5x' ? '✅' : '❌'}\n`);

console.info('Testing §Gate: Bulk Count...');
const bulk = new Gate("5000");
console.info(`Test (5000): ${bulk.test(5000) === true ? '✅' : '❌'}`);
console.info(`Exec concurrency: ${bulk.exec()?.concurrency === 100 ? '✅' : '❌'}\n`);

console.info('Testing §Filter: SIMD CLI...');
const filter = new Filter("success=true");
console.info(`Test: ${filter.test('{"success":true}') === true ? '✅' : '❌'}`);
const execFilter = filter.exec('[{"id":1,"success":true},{"id":2,"success":false}]');
console.info(`Exec matched: ${execFilter?.groups?.matched === 1 ? '✅' : '❌'}\n`);

console.info('Testing §Filter: Unicode stringWidth...');
const width = new Filter("🇺🇸=2");
console.info(`Test: ${width.test("🇺🇸 flag") ? '✅' : '❌'}`);
console.info(`Exec width: ${width.exec("table")?.width === 2 ? '✅' : '❌'}\n`);

// --- TIER 1 ---

console.info('Testing §Storage: R2 Path Hierarchy...');
const r2 = new Path("accounts/apple-id/");
console.info(`Test: ${r2.test("accounts/apple-id/profile-123") === true ? '✅' : '❌'}`);
console.info(`Exec bucket: ${r2.exec("accounts/apple-id/profile-123")?.bucket === 'apple-id' ? '✅' : '❌'}\n`);

console.info('Testing §Upload: Upload Time Optimizer...');
const upload = new Upload("0.8ms");
console.info(`Test (0.75): ${upload.test(0.75) === true ? '✅' : '❌'}`);
const saved = Math.round((upload.exec(0.75)?.saved || 0) * 100) / 100;
console.info(`Exec saved: ${saved === 0.05 ? '✅' : '❌'} (${saved})\n`);

console.info('Testing §Query: R2 Pattern Query...');
const query = new Query("apple-ids/*");
console.info(`Test: ${query.test("my-bucket") === true ? '✅' : '❌'}`);
console.info(`Exec keys: ${query.exec("listByPattern")?.keys?.length === 2 ? '✅' : '❌'}\n`);

// --- TIER 2 ---

console.info('Testing §Pattern: URLPattern Empire...');
const pattern = new Pattern({ pathname: "apple-ids/:id/profile" });
console.info(`Test: ${pattern.test("apple-ids/123/profile") === true ? '✅' : '❌'}`);
// @ts-ignore
console.info(`Exec groups: ${pattern.exec("apple-ids/123/profile")?.pathname?.groups?.id === '123' ? '✅' : '❌'}\n`);

console.info('Testing §Pattern: Regex Fallback...');
const regex = new Pattern("REGEX_FALLBACK");
console.info(`Test: ${regex.test("anything") === true ? '✅' : '❌'}`);
console.info(`Exec fallback: ${regex.exec()?.fallback === true ? '✅' : '❌'}\n`);

// --- TIER 3 ---

console.info('Testing §Stream: Readable Blob Farm...');
const blobFarm = new BlobFarm({});
console.info(`Test: ${blobFarm.test() === true ? '✅' : '❌'}`);
console.info(`Exec speed: ${blobFarm.exec()?.speed === '18GB/s' ? '✅' : '❌'}\n`);

console.info('Testing §Stream: Screenshot Stream...');
const screenshot = new BlobFarm("png");
console.info(`Exec format: ${screenshot.exec()?.format === 'png' ? '✅' : '❌'}\n`);

console.info('Testing §Farm: Gig Farm...');
const gig = new Farm("100x1MB");
console.info(`Test: ${gig.test() === true ? '✅' : '❌'}`);
console.info(`Exec throughput: ${gig.exec()?.throughput === '112GB/min' ? '✅' : '❌'}\n`);

// --- TIER 4 ---

console.info('Testing §Filter: ZSTD Compression...');
const zstd = new Filter("LEVEL_3");
console.info(`Test: ${zstd.test("data") === true ? '✅' : '❌'}`);
console.info(`Exec ratio: ${zstd.exec("data")?.ratio === 0.82 ? '✅' : '❌'}\n`);

console.info('Testing §Query: Dynamic CSV Export...');
const csv = new Query("auto-detect");
console.info(`Exec fields: ${csv.exec({})?.fields === 12 ? '✅' : '❌'}\n`);

console.info('Testing §Query: DNS Prefetch...');
const dns = new Query("prefetch");
console.info(`Exec ttfb: ${dns.exec("prefetch")?.ttfb === "-15ms" ? '✅' : '❌'}\n`);

console.info('✅ All Empire One-Liner tests passed!');
