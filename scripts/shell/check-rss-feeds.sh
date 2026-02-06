#!/usr/bin/env bash

# 📡 RSS Feed Health Check
# Validates Bun's RSS feeds are accessible and contain content

echo "📡 Checking RSS Feed Health..."
echo "=============================="

# Check main RSS feed (corrected URL)
echo "🔍 Testing RSS feeds..."
bun -e '
const feeds = [
  { name: "Main RSS", url: "https://bun.sh/rss.xml" },
  { name: "Blog RSS", url: "https://bun.sh/blog/rss.xml" },
  { name: "Feed.xml", url: "https://bun.sh/feed.xml" }
];

const results = await Promise.all(
  feeds.map(async ({ name, url }) => {
    try {
      const res = await fetch(url, { method: "HEAD", timeout: 5000 });
      return { name, url, status: res.status, ok: res.ok };
    } catch (error) {
      return { name, url, status: "ERROR", ok: false };
    }
  })
);

results.forEach(({ name, url, status, ok }) => {
  const icon = ok ? "✅" : "❌";
  console.log(`${icon} ${name}: ${status} - ${url}`);
});
'

echo ""
echo "📄 RSS Content Preview (first 300 chars):"
bun -e '
try {
  const response = await fetch("https://bun.sh/rss.xml");
  const content = await response.text();
  console.log(content.slice(0, 300) + "...");
} catch (error) {
  console.log("❌ Failed to fetch RSS content:", error.message);
}
'

echo ""
echo "📰 Latest Blog Post (if available):"
bun -e '
try {
  const response = await fetch("https://bun.sh/rss.xml");
  const content = await response.text();

  // Simple XML parsing - find first <item>
  const itemMatch = content.match(/<item>([\s\S]*?)<\/item>/);
  if (itemMatch) {
    const titleMatch = itemMatch[1].match(/<title>(.*?)<\/title>/);
    const dateMatch = itemMatch[1].match(/<pubDate>(.*?)<\/pubDate>/);

    if (titleMatch) console.log("📝 Title:", titleMatch[1]);
    if (dateMatch) console.log("📅 Date:", dateMatch[1]);
  } else {
    console.log("ℹ️  No blog posts found in RSS");
  }
} catch (error) {
  console.log("❌ Failed to parse RSS:", error.message);
}
'