/**
 * Cookie Security v3.26 Benchmarks
 * Performance testing for Tier-1380 cookie security implementation
 */

import { Tier1380CookieSecurity, SecureVariantManager } from '../lib/cookie-security-v3.26';

const security = new Tier1380CookieSecurity();
const variants = new SecureVariantManager();

const secureCookie = 'session=abc123; Secure; HttpOnly; SameSite=Strict; Path=/';

console.log('🍪 Cookie Security v3.26 Benchmarks');
console.log('=====================================\n');

// Benchmark helper
async function benchmark(name: string, fn: () => void | Promise<void>, iterations = 10000) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await fn();
  }
  const elapsed = performance.now() - start;
  const opsPerSecond = Math.round((iterations / elapsed) * 1000);
  const avgMs = (elapsed / iterations).toFixed(3);
  
  console.log(`${name.padEnd(35)} ${opsPerSecond.toString().padStart(8)} ops/s  (${avgMs} ms/op)`);
  return opsPerSecond;
}

const results: Record<string, number> = {};

// Parse benchmarks
results.parseSecure = await benchmark('Cookie.parse (secure)', () => {
  security.parseAndValidate(secureCookie);
}, 50000);

results.parseInsecure = await benchmark('Cookie.parse (insecure)', () => {
  security.parseAndValidate('session=abc; SameSite=Lax');
}, 50000);

results.parseHost = await benchmark('Cookie.parse (__Host-)', () => {
  security.parseAndValidate('__Host-session=abc; Secure; HttpOnly; SameSite=Strict; Path=/');
}, 50000);

// Create benchmarks
results.createSession = await benchmark('createSecure (session)', () => {
  security.createSecure('sid', { user: 123 }, 'session');
}, 50000);

results.createAuth = await benchmark('createSecure (auth)', () => {
  security.createSecure('auth', 'token', 'auth');
}, 50000);

results.createPrefs = await benchmark('createSecure (preferences)', () => {
  security.createSecure('prefs', { theme: 'dark' }, 'preferences');
}, 50000);

// Audit benchmark
const testCookie = security.parseAndValidate(secureCookie).cookie!;
results.audit = await benchmark('audit (secure)', () => {
  security.audit(testCookie);
}, 50000);

// CSRF benchmarks
let csrfId = 0;
results.csrfGenerate = await benchmark('generateCSRF', async () => {
  await security.generateCSRF(`s${++csrfId}`);
}, 5000);

// Pre-generate for validation
const csrfData: { sid: string; token: string }[] = [];
for (let i = 0; i < 100; i++) {
  const sid = `cs${i}`;
  const { token } = await security.generateCSRF(sid);
  csrfData.push({ sid, token });
}

let csrfIdx = 0;
results.csrfValidate = await benchmark('validateCSRF (valid)', () => {
  const { sid, token } = csrfData[csrfIdx++ % csrfData.length];
  security.validateCSRF(sid, token);
}, 50000);

results.csrfInvalid = await benchmark('validateCSRF (invalid)', () => {
  security.validateCSRF('unknown', 'bad');
}, 50000);

// Variant benchmarks
let varId = 0;
results.variantCreate = await benchmark('createVariantCookie', () => {
  variants.createVariantCookie(`u${++varId}`, 'A');
}, 50000);

// Pre-create for validation
const varData: { uid: string; val: string }[] = [];
for (let i = 0; i < 100; i++) {
  const uid = `vu${i}`;
  const { cookie } = variants.createVariantCookie(uid, 'B');
  varData.push({ uid, val: cookie.value });
}

let varIdx = 0;
results.variantValidate = await benchmark('validateVariant (valid)', () => {
  const { uid, val } = varData[varIdx++ % varData.length];
  variants.validateVariant(val, uid);
}, 50000);

results.variantInvalid = await benchmark('validateVariant (invalid)', () => {
  variants.validateVariant('bad', 'user');
}, 50000);

// Summary
console.log('\n📊 Summary');
console.log('==========');
const ops = Object.values(results);
const avg = Math.round(ops.reduce((a, b) => a + b, 0) / ops.length);
const total = ops.reduce((a, b) => a + b, 0);

console.log(`Total operations: ${total.toLocaleString()} ops/s`);
console.log(`Average:          ${avg.toLocaleString()} ops/s`);
console.log(`Target:           285,000 ops/s`);
console.log(`Status:           ${avg >= 285000 ? '✅ EXCEEDED' : avg >= 200000 ? '✅ GOOD' : '⚠️ BELOW TARGET'}`);

// Per-operation breakdown
console.log('\n📝 Per-Operation Performance:');
console.log(`Cookie.parse:      ~${results.parseSecure.toLocaleString()} ops/s`);
console.log(`Cookie.from:       ~${results.createSession.toLocaleString()} ops/s`);
console.log(`Full audit:        ~${results.audit.toLocaleString()} ops/s`);
console.log(`CSRF generate:     ~${results.csrfGenerate.toLocaleString()} ops/s`);
console.log(`CSRF validate:     ~${results.csrfValidate.toLocaleString()} ops/s`);

console.log('\n🚀 Benchmark complete!');
