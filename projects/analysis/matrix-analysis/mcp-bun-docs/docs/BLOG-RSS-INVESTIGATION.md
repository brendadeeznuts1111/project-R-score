# Blog RSS investigation

**Date:** 2025-01-31  
**Outcome:** There is no separate blog RSS at `/blog/rss.xml`. Use `BUN_CHANGELOG_RSS` (bun.com/rss.xml or bun.sh/rss.xml) for the official feed.

## Checks performed

| URL | Status | Content-Type | Notes |
|-----|--------|--------------|-------|
| https://bun.com/blog | 200 | text/html | Blog page works |
| https://bun.com/blog/rss.xml | **404** | text/html | No path |
| https://bun.sh/blog | 200 | text/html | Blog page works |
| https://bun.sh/blog/rss.xml | **404** | text/html | No path |
| https://bun.com/rss.xml | 200 | application/xml | Changelog feed (XML) |
| https://bun.sh/rss.xml | 200 | application/xml | Same feed |

- Blog HTML on `bun.com/blog` links only to `https://bun.com/rss.xml` (no `/blog/rss.xml`).
- GitHub discussion [oven-sh/bun#1663](https://github.com/oven-sh/bun/discussions/1663): official answer is the feed at **https://bun.sh/rss.xml** (changelog, not a separate blog feed).

## Lib changes

- `BUN_BLOG_RSS_URL` is set to `BUN_CHANGELOG_RSS` so "blog RSS" and "changelog RSS" both resolve to the same working URL.
- `BUN_REFERENCE_LINKS.blogRss` points to the same feed.
- Removed `BUN_BLOG_RSS_LIVE_URL` (bun.sh/blog/rss.xml also 404s).

## Usage

For RSS (changelog + blog posts): use **`BUN_CHANGELOG_RSS`** or **`BUN_BLOG_RSS_URL`** (same value). Both `bun.com/rss.xml` and `bun.sh/rss.xml` return 200 and the same XML.
