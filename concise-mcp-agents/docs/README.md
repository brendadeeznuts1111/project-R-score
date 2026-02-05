# API Documentation Pipeline

## 🟢 Operational Guidelines

### 1. Secret Leakage Protection
- **Never document real cookie/session values** in the markdown
- Use `{"$ref": "#/components/securitySchemes/pliveSession"}` and `security: [pliveSession: []]`
- Redocly shows a lock-icon reminding consumers to supply their own credentials

### 2. Breaking-Change Gate
- CI automatically validates OpenAPI spec with `@apidevtools/swagger-cli`
- Build fails on invalid OAS before GitHub Pages deployment
- Optional: Add `openapi-diff` for PR comments showing field removals

### 3. Version Management
- Update the `Version: `2.0.2`` field in `docs/plive-api.md`
- Version is automatically extracted and used in the generated YAML
- Same commit becomes the release snapshot when tagging

### 4. Client Refresh Process
```bash
# After merging new endpoints:
bun docs:generate                    # Update YAML
bun docs:client                      # Regenerate types
# Commit the updated src/types/plive.d.ts
```

## 🚀 Workflow

1. **Edit `docs/plive-api.md`** - Add endpoints with YAML front-matter blocks
2. **Push to main** - CI auto-generates YAML and publishes docs
3. **Share GitHub Pages URL** - `https://your-org.github.io/your-repo/`
4. **Regenerate client types** after merges

## 📋 Scripts

- `bun docs:generate` - Generate OpenAPI YAML from markdown
- `bun docs:serve` - Serve docs locally (port 8000)
- `bun docs:preview` - Generate + serve in one command
- `bun docs:client` - Regenerate TypeScript types

## 🔒 Security

All endpoints require authentication via the `pliveSession` security scheme (x-gs-session header).
