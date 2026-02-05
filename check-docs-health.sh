#!/usr/bin/env bash

# 🏥 Quick Documentation Health Check
# One-liner style validation of critical docs

echo "🏥 Quick Documentation Health Check"
echo "==================================="

# Core documentation URLs that should always work
bun -e '
const urls = [
  "https://bun.sh/docs",
  "https://bun.sh/docs/api",
  "https://bun.sh/docs/runtime",
  "https://bun.sh/docs/api/utils",
  "https://bun.sh/docs/api/fetch",
  "https://bun.sh/blog",
  "https://github.com/oven-sh/bun"
];

console.log("Checking", urls.length, "critical URLs...\n");

const results = await Promise.all(
  urls.map(async url => {
    try {
      const res = await fetch(url, { method: "HEAD", timeout: 5000 });
      return { url, status: res.status, ok: res.ok };
    } catch (e) {
      return { url, status: "TIMEOUT", ok: false };
    }
  })
);

const working = results.filter(r => r.ok);
const broken = results.filter(r => !r.ok);

results.forEach(({ url, status, ok }) => {
  const icon = ok ? "✅" : "❌";
  console.log(`${icon} ${status} - ${url.replace("https://", "")}`);
});

console.log(`\n📊 ${working.length}/${urls.length} URLs healthy`);
if (broken.length > 0) {
  console.log(`⚠️  ${broken.length} URLs need attention`);
}
'