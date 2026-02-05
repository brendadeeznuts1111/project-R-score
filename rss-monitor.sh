#!/usr/bin/env bash

# 📊 RSS Feed Monitor
# Quick status check for Bun RSS feeds

echo "📊 RSS Feed Status"

# One-liner style checks
echo "Main feed: $(bun -e 'console.log((await fetch("https://bun.sh/rss.xml",{method:"HEAD"})).status === 200 ? "✅ OK" : "❌ FAIL")')"

echo "Blog feed: $(bun -e 'console.log((await fetch("https://bun.sh/blog/rss.xml",{method:"HEAD"})).status === 200 ? "✅ OK" : "❌ FAIL")')"

# Get latest post info
echo ""
echo "📝 Latest Post:"
bun -e '
const res = await fetch("https://bun.sh/rss.xml");
const xml = await res.text();
const titleMatch = xml.match(/<title>(.*?)<\/title>/);
const dateMatch = xml.match(/<pubDate>(.*?)<\/pubDate>/);

if (titleMatch && titleMatch[2]) {
  console.log("Title:", titleMatch[2]);
}
if (dateMatch && dateMatch[1]) {
  console.log("Date:", dateMatch[1]);
}
' 2>/dev/null || echo "❌ Failed to parse RSS"