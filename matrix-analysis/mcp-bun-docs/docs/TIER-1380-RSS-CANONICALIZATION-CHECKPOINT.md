# Tier-1380 OMEGA – Blog RSS Standardization Checkpoint Complete

**Status:** RSS CANONICALIZATION LOCKED  
**Glyph:** ▵⟂⥂ → rss unified

Consolidating everything to the single canonical changelog feed (`/rss.xml`) eliminates dead-end 404s, reduces config surface area, and keeps Col-89 previews predictable (no surprise redirects or different content lengths from `/blog/rss.xml` attempts).

## Final Canonical RSS Mapping (Locked In)

| Purpose                | Recommended Constant   | Resolved URL                | Status / Content-Type | Notes / Audit Flag                    |
|------------------------|------------------------|-----------------------------|------------------------|---------------------------------------|
| Changelog + Blog Posts | `BUN_CHANGELOG_RSS`    | `https://bun.com/rss.xml`   | 200 / application/xml  | Primary feed (unified content)        |
| Blog RSS (alias)       | `BUN_BLOG_RSS_URL`     | `https://bun.com/rss.xml`   | same as above          | Points to changelog; no separate feed |
| Legacy / Alternate Host| —                      | `https://bun.sh/rss.xml`    | 200 / application/xml  | Identical content; fallback           |
| Dead / Removed Paths   | —                      | `https://bun.com/blog/rss.xml` | 404 / text/html     | Removed from code; avoid              |
| Dead / Removed Paths   | —                      | `https://bun.sh/blog/rss.xml`  | 404 / text/html     | Removed from code; avoid              |

**Key takeaway:** There is **no dedicated `/blog/rss.xml`** feed — Bun publishes blog-style release notes and announcements through the unified changelog RSS at `/rss.xml`. Both hosts serve identical content there.

## Recommended URL Constants (config / dashboard)

```ts
// In domain-config.json5 or lib.ts (BUN_URL_CONFIG)
const URLS = {
  base: "https://bun.com",
  docs: "https://bun.com/docs",
  reference: "https://bun.com/reference",
  changelogRSS: "https://bun.com/rss.xml",   // unified feed
  blogRSS: "https://bun.com/rss.xml",       // alias for consistency
  blogHTML: "https://bun.com/blog",
  installScript: "https://bun.sh/install",  // only remaining bun.sh
};
```

## Audit / Dashboard Integration

Use `getRssCanonicalizationAuditEvent()` from `mcp-bun-docs/lib.ts`:

```ts
import { getRssCanonicalizationAuditEvent } from "mcp-bun-docs/lib.ts";

const ev = await getRssCanonicalizationAuditEvent();
await auditRepo.append(ev);
```

Returns: `{ event: "RSS_CANONICALIZATION_LOCKED", ts, bun_version?, col89_safe, details, feed_preview_width?, glyph }`. Details are Col-89 safe (Bun.escapeHTML when in Bun). Optional `feed_preview_width` is the width of the first 200 chars of the feed (Bun.stringWidth).

## Quick Verification Commands

```bash
# 1. Confirm unified feed works on both hosts
curl -sI https://bun.com/rss.xml    | grep -E "HTTP/|Content-Type"
curl -sI https://bun.sh/rss.xml     | grep -E "HTTP/|Content-Type"

# 2. Confirm blog-specific paths 404
curl -sI https://bun.com/blog/rss.xml   | head -1   # should be 404
curl -sI https://bun.sh/blog/rss.xml    | head -1   # should be 404

# 3. Width-check a typical RSS item preview (Col-89)
bun -e '
  const preview = "Bun v1.3.7 released – GB9c Indic fix, stringWidth table -27%";
  console.log("Preview width:", Bun.stringWidth(preview));
'   # → ~58 cols, safe
```

Or run the verification script (from repo root):

```bash
bun mcp-bun-docs/scripts/verify-rss-canonicalization.ts
```

## Operational State

- **TIER-1380 OMEGA – RSS CANONICALIZATION LOCKED**
- **Blog RSS → unified changelog feed (`/rss.xml`)**
- **No more 404 attempts in code or docs**
