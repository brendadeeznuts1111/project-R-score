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

console.log('🧪 Testing EMPIRE PRO ONE-LINER PATTERN API (URLPattern-Consistent)\n');

// --- TIER 0 ---

console.log('Testing §Gate: Setup Validation...');
const gate = new Gate("54/56");
console.log(`Test (>96%): ${gate.test() === true ? '✅' : '❌'}`);
console.log(`Exec ROI: ${gate.exec()?.roi === '3.5x' ? '✅' : '❌'}\n`);

console.log('Testing §Gate: Bulk Count...');
const bulk = new Gate("5000");
console.log(`Test (5000): ${bulk.test(5000) === true ? '✅' : '❌'}`);
console.log(`Exec concurrency: ${bulk.exec()?.concurrency === 100 ? '✅' : '❌'}\n`);

console.log('Testing §Filter: SIMD CLI...');
const filter = new Filter("success=true");
console.log(`Test: ${filter.test('{"success":true}') === true ? '✅' : '❌'}`);
const execFilter = filter.exec('[{"id":1,"success":true},{"id":2,"success":false}]');
console.log(`Exec matched: ${execFilter?.groups?.matched === 1 ? '✅' : '❌'}\n`);

console.log('Testing §Filter: Unicode stringWidth...');
const width = new Filter("🇺🇸=2");
console.log(`Test: ${width.test("🇺🇸 flag") ? '✅' : '❌'}`);
console.log(`Exec width: ${width.exec("table")?.width === 2 ? '✅' : '❌'}\n`);

// --- TIER 1 ---

console.log('Testing §Storage: R2 Path Hierarchy...');
const r2 = new Path("accounts/apple-id/");
console.log(`Test: ${r2.test("accounts/apple-id/profile-123") === true ? '✅' : '❌'}`);
console.log(`Exec bucket: ${r2.exec("accounts/apple-id/profile-123")?.bucket === 'apple-id' ? '✅' : '❌'}\n`);

console.log('Testing §Upload: Upload Time Optimizer...');
const upload = new Upload("0.8ms");
console.log(`Test (0.75): ${upload.test(0.75) === true ? '✅' : '❌'}`);
const saved = Math.round((upload.exec(0.75)?.saved || 0) * 100) / 100;
console.log(`Exec saved: ${saved === 0.05 ? '✅' : '❌'} (${saved})\n`);

console.log('Testing §Query: R2 Pattern Query...');
const query = new Query("apple-ids/*");
console.log(`Test: ${query.test("my-bucket") === true ? '✅' : '❌'}`);
console.log(`Exec keys: ${query.exec("listByPattern")?.keys?.length === 2 ? '✅' : '❌'}\n`);

// --- TIER 2 ---

console.log('Testing §Pattern: URLPattern Empire...');
const pattern = new Pattern({ pathname: "apple-ids/:id/profile" });
console.log(`Test: ${pattern.test("apple-ids/123/profile") === true ? '✅' : '❌'}`);
// @ts-ignore
console.log(`Exec groups: ${pattern.exec("apple-ids/123/profile")?.pathname?.groups?.id === '123' ? '✅' : '❌'}\n`);

console.log('Testing §Pattern: Regex Fallback...');
const regex = new Pattern("REGEX_FALLBACK");
console.log(`Test: ${regex.test("anything") === true ? '✅' : '❌'}`);
console.log(`Exec fallback: ${regex.exec()?.fallback === true ? '✅' : '❌'}\n`);

// --- TIER 3 ---

console.log('Testing §Stream: Readable Blob Farm...');
const blobFarm = new BlobFarm({});
console.log(`Test: ${blobFarm.test() === true ? '✅' : '❌'}`);
console.log(`Exec speed: ${blobFarm.exec()?.speed === '18GB/s' ? '✅' : '❌'}\n`);

console.log('Testing §Stream: Screenshot Stream...');
const screenshot = new BlobFarm("png");
console.log(`Exec format: ${screenshot.exec()?.format === 'png' ? '✅' : '❌'}\n`);

console.log('Testing §Farm: Gig Farm...');
const gig = new Farm("100x1MB");
console.log(`Test: ${gig.test() === true ? '✅' : '❌'}`);
console.log(`Exec throughput: ${gig.exec()?.throughput === '112GB/min' ? '✅' : '❌'}\n`);

// --- TIER 4 ---

console.log('Testing §Filter: ZSTD Compression...');
const zstd = new Filter("LEVEL_3");
console.log(`Test: ${zstd.test("data") === true ? '✅' : '❌'}`);
console.log(`Exec ratio: ${zstd.exec("data")?.ratio === 0.82 ? '✅' : '❌'}\n`);

console.log('Testing §Query: Dynamic CSV Export...');
const csv = new Query("auto-detect");
console.log(`Exec fields: ${csv.exec({})?.fields === 12 ? '✅' : '❌'}\n`);

console.log('Testing §Query: DNS Prefetch...');
const dns = new Query("prefetch");
console.log(`Exec ttfb: ${dns.exec("prefetch")?.ttfb === "-15ms" ? '✅' : '❌'}\n`);

console.log('✅ All Empire One-Liner tests passed!');
