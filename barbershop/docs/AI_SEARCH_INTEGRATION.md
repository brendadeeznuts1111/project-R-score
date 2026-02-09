# Cloudflare AI Search Integration

This document explains how AI Search is integrated with Vectorize for the barbershop project.

## Architecture Overview

We use a **hybrid approach** combining both Vectorize and AI Search:

- **Vectorize**: Real-time barber skill matching (custom metadata, dynamic updates)
- **AI Search**: Knowledge base documents (automatic R2 indexing, continuous updates)

## Why Both?

### Vectorize Advantages
- Real-time updates when barbers register
- Custom metadata filtering (status, barber_id, etc.)
- Fine-grained control over embeddings
- Perfect for dynamic, frequently-changing data

### AI Search Advantages
- Automatic indexing from R2 buckets
- Continuous updates without manual reprocessing
- Simpler setup (connect bucket → auto-index)
- Built-in similarity caching
- Perfect for static documentation

## Setup Process

### 1. Upload Knowledge Base to R2

```bash
# Set R2 credentials in .env or Bun secrets
export R2_ACCOUNT_ID="your_account_id"
export R2_ACCESS_KEY_ID="your_access_key"
export R2_SECRET_ACCESS_KEY="your_secret_key"
export R2_ENDPOINT="https://your_account.r2.cloudflarestorage.com"
export R2_KNOWLEDGE_BASE_BUCKET="barbershop-knowledge-base"

# Upload documents
bun run scripts/vectorize/upload-docs-to-r2.ts
```

This uploads all markdown files from `docs/knowledge-base/` to R2 at `knowledge-base/*.md`.

### 2. Create AI Search Instance

The setup includes **path filtering** to only index files in `/knowledge-base/**`, excluding other files in the R2 bucket.

**Option A: Using Setup Script**
```bash
export CLOUDFLARE_ACCOUNT_ID="your_account_id"
export AI_SEARCH_API_TOKEN="your_ai_search_token"
export R2_KNOWLEDGE_BASE_BUCKET="barbershop-knowledge-base"

bun run scripts/vectorize/setup-ai-search.sh
```

**Option B: Via Dashboard**
1. Go to Cloudflare Dashboard → AI Search
2. Create new instance
3. Select R2 bucket: `barbershop-knowledge-base`
4. Set instance ID: `barbershop-knowledge-base`
5. Configure path filter:
   - **Include**: `/knowledge-base/**` (only index knowledge base files)
   - **Exclude**: (optional) Add patterns like `**/*.tmp` to skip temp files

**Option C: Via API**

The API format uses `source_params` to configure path filtering:

```bash
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/ai-search/instances" \
  -H "Authorization: Bearer $AI_SEARCH_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "id": "barbershop-knowledge-base",
    "type": "r2",
    "source": "barbershop-knowledge-base",
    "source_params": {
      "include_items": ["/knowledge-base/**"]
    }
  }'
```

**Advanced Path Filtering Examples**:

```json
{
  "source_params": {
    "include_items": ["/knowledge-base/**"],
    "exclude_items": ["**/*.tmp", "**/*.bak", "/knowledge-base/drafts/**"]
  }
}
```

This configuration:
- ✅ **Includes**: All files in `/knowledge-base/**` directory
- ❌ **Excludes**: Temporary files (`*.tmp`, `*.bak`) and draft files in `/knowledge-base/drafts/`

**Path Filtering Parameters**:
- `include_items` (array, max 10 patterns): Only index items matching at least one pattern
- `exclude_items` (array, max 10 patterns): Skip items matching any pattern (checked first)

See [Path Filtering API Format](https://developers.cloudflare.com/ai-search/configuration/path-filtering/#api-format) for complete documentation.

### 3. Configure Worker

The worker automatically uses AI Search when:
- Querying `index: 'docs'`
- AI Search instance is available via `env.AI.autorag('barbershop-knowledge-base')`

No additional wrangler configuration needed - AI Search is accessed through the AI binding.

### 4. Wait for Indexing

After creating the instance, AI Search will automatically:
1. Scan the R2 bucket
2. Process markdown files
3. Generate embeddings
4. Build search index

Monitor progress in the Cloudflare Dashboard → AI Search → Your Instance → Overview.

## How It Works

### Request Flow

```
Client Request (RAG Support)
    ↓
POST /api/support/ask
    ↓
vectorizeClient.queryDocuments()
    ↓
HTTP → Vectorize Worker
    ↓
Worker checks: index === 'docs' && AI Search available?
    ↓
YES → AI Search: env.AI.autorag('barbershop-knowledge-base').search()
    NO → Fallback to Vectorize: DOCS_INDEX.query()
    ↓
Return results (same format)
```

### Automatic Fallback

The system gracefully falls back:
1. **AI Search available** → Use AI Search (automatic indexing)
2. **AI Search unavailable** → Use Vectorize (manual indexing)
3. **Both unavailable** → Return fallback message

## Path Filtering

The AI Search instance is configured with **path filtering** to only index files in `/knowledge-base/**`. This ensures:

- ✅ **Selective indexing**: Only knowledge base markdown files are indexed
- ✅ **Bucket safety**: Other files in the R2 bucket are ignored
- ✅ **Performance**: Faster indexing by skipping irrelevant files

### Pattern Matching

The pattern `/knowledge-base/**` matches:
- ✅ `/knowledge-base/services.md`
- ✅ `/knowledge-base/pricing.md`
- ✅ `/knowledge-base/booking.md`
- ✅ Any file in `/knowledge-base/` subdirectories (e.g., `/knowledge-base/guides/advanced.md`)

**Wildcard Syntax** (based on [micromatch](https://github.com/micromatch/micromatch)):
- `*` - Matches any characters except path separators (`/`)
- `**` - Matches any characters including path separators (`/`)

### API Format

Path filtering is configured via `source_params` in the API request:

```json
{
  "source_params": {
    "include_items": ["<PATTERN_1>", "<PATTERN_2>"],
    "exclude_items": ["<PATTERN_1>", "<PATTERN_2>"]
  }
}
```

**Parameters**:
- `include_items` (string[], max 10): Only index items matching at least one pattern
- `exclude_items` (string[], max 10): Skip items matching any pattern (checked first)

**Filtering Order**:
1. Exclude check: If item matches any exclude pattern → skip
2. Include check: If include patterns exist and item doesn't match → skip
3. Index: Item proceeds to indexing

### Important Notes

⚠️ **Case Sensitivity**: Pattern matching is case-sensitive. `/Blog/*` does not match `/blog/post.html`. Use lowercase patterns for consistency.

⚠️ **Full Path Matching**: Patterns match the entire path. Use `**` at the beginning for partial matching:
- `docs/*` matches `docs/file.pdf` but **not** `site/docs/file.pdf`
- `**/docs/*` matches both `docs/file.pdf` and `site/docs/file.pdf`

⚠️ **Single `*` vs `**`**: Single `*` does not cross directories:
- `docs/*` matches `docs/file.pdf` but **not** `docs/sub/file.pdf`
- `docs/**` matches both `docs/file.pdf` and `docs/sub/file.pdf`

⚠️ **Trailing Slashes**: URLs are matched as-is without normalization. `/blog/` does **not** match `/blog`.

**Our Pattern**: `/knowledge-base/**` correctly matches:
- ✅ `knowledge-base/services.md` (R2 object key)
- ✅ `knowledge-base/guides/advanced.md` (subdirectories)
- ❌ `Knowledge-Base/services.md` (case-sensitive, won't match)
- ❌ `/other/knowledge-base/file.md` (would need `**/knowledge-base/**`)

**Path Format**: R2 object keys are uploaded as `knowledge-base/file.md` (no leading slash), but the pattern `/knowledge-base/**` matches them correctly. AI Search normalizes paths for matching.

See [Path Filtering Important Notes](https://developers.cloudflare.com/ai-search/configuration/path-filtering/#important-notes) and [Full Documentation](https://developers.cloudflare.com/ai-search/configuration/path-filtering/) for complete details.

## Reranking

**Reranking** is enabled by default to improve search result quality. It reorders retrieved documents based on semantic relevance using a secondary model (`@cf/baai/bge-reranker-base`).

### How It Works

1. AI Search retrieves initial results based on vector similarity
2. Reranking model evaluates semantic relevance to the query
3. Results are reordered by relevance score
4. Top results are returned

### Configuration

Reranking is **enabled by default** in our implementation. You can:

**Disable per request** (if needed):
```typescript
// In vectorize-client.ts
await vectorizeClient.queryDocuments(query, 5, false); // disable reranking
```

**Change reranking model** (in worker):
```typescript
// In vectorize-worker.ts
reranking: {
  enabled: true,
  model: '@cf/baai/bge-reranker-base' // or other supported model
}
```

**Configure in Dashboard**:
1. Go to AI Search → Your Instance → Settings
2. Under **Reranking**, toggle on/off
3. Select reranking model

See [Reranking Configuration](https://developers.cloudflare.com/ai-search/configuration/reranking/) for details.

## Benefits

### For Knowledge Base
- ✅ **Zero maintenance**: Upload once, auto-index forever
- ✅ **Continuous updates**: New files in R2 automatically indexed
- ✅ **Better accuracy**: AI Search uses advanced reranking (enabled by default)
- ✅ **Built-in caching**: Similarity caching reduces latency
- ✅ **Path filtering**: Only relevant files indexed, improving performance

### For Barber Matching
- ✅ **Real-time**: Instant updates when barbers register
- ✅ **Custom metadata**: Filter by status, barber_id, etc.
- ✅ **Fine control**: Custom embedding strategies

## Environment Variables

Add to `.env`:

```bash
# Vectorize (for barbers)
VECTORIZE_WORKER_URL=https://your-worker.workers.dev
VECTORIZE_ENABLED=true

# AI Search (for knowledge base)
AI_SEARCH_INSTANCE_ID=barbershop-knowledge-base
R2_KNOWLEDGE_BASE_BUCKET=barbershop-knowledge-base

# R2 Credentials (for uploading docs)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_ENDPOINT=https://your_account.r2.cloudflarestorage.com
```

## Testing

### Test AI Search Integration

```bash
# 1. Upload docs to R2
bun run scripts/vectorize/upload-docs-to-r2.ts

# 2. Verify uploads
# Check R2 bucket in dashboard

# 3. Create AI Search instance
bun run scripts/vectorize/setup-ai-search.sh

# 4. Wait for indexing (check dashboard)

# 5. Test RAG endpoint
curl -X POST http://localhost:3000/api/support/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "How much does a haircut cost?"}'
```

## Troubleshooting

### AI Search Not Working

1. **Check instance exists**: Dashboard → AI Search → Instances
2. **Verify indexing complete**: Overview tab shows indexed files
3. **Check path filter**: Should include `/knowledge-base/**`
4. **Verify worker binding**: `env.AI.autorag('barbershop-knowledge-base')` should work

### Fallback to Vectorize

If AI Search fails, the system automatically uses Vectorize. To use Vectorize exclusively:

1. Don't create AI Search instance, OR
2. Set `AI_SEARCH_ENABLED=false` in worker

### R2 Upload Fails

1. Check R2 credentials in `.env` or Bun secrets
2. Verify bucket exists: `barbershop-knowledge-base`
3. Check bucket permissions
4. Verify R2 subscription is active

## Migration Path

### From Vectorize-Only to Hybrid

1. ✅ Keep Vectorize for barbers (already working)
2. Upload docs to R2: `bun run scripts/vectorize/upload-docs-to-r2.ts`
3. Create AI Search instance
4. Worker automatically uses AI Search for docs queries
5. Vectorize docs index becomes fallback

### From Hybrid to AI Search-Only

Not recommended - Vectorize is better for dynamic barber data. But if needed:

1. Remove Vectorize DOCS_INDEX
2. Update worker to always use AI Search for docs
3. Remove `index-documents.ts` script

## References

- [AI Search Docs](https://developers.cloudflare.com/ai-search/)
- [AI Search R2 Data Source](https://developers.cloudflare.com/ai-search/configuration/data-source/r2/)
- [AI Search Workers Binding](https://developers.cloudflare.com/ai-search/usage/workers-binding/)
- [Vectorize Docs](https://developers.cloudflare.com/vectorize/)
