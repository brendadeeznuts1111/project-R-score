# 📡 RSS Feeds CI/CD Integration Guide

## Overview

The Fire22 Dashboard RSS feeds are now fully integrated with our CI/CD pipeline
using Bun and GitHub Actions. This document outlines the complete integration
for the CI team.

## 🚀 Live RSS Feed URLs

- **Feed Index**: https://dashboard-worker.nolarose1968-806.workers.dev/feeds/
- **Error Codes RSS**:
  https://dashboard-worker.nolarose1968-806.workers.dev/feeds/error-codes-rss.xml
- **Error Codes Atom**:
  https://dashboard-worker.nolarose1968-806.workers.dev/feeds/error-codes-atom.xml
- **Team Announcements RSS**:
  https://dashboard-worker.nolarose1968-806.workers.dev/feeds/team-announcements-rss.xml
- **Team Announcements Atom**:
  https://dashboard-worker.nolarose1968-806.workers.dev/feeds/team-announcements-atom.xml
- **Critical Alerts**:
  https://dashboard-worker.nolarose1968-806.workers.dev/feeds/critical-errors-alert.xml

## 🔧 CI/CD Pipeline Integration

### GitHub Actions Workflow

The RSS feeds are built, validated, and deployed as part of our CI pipeline in
`.github/workflows/ci.yml`:

```yaml
rss-feeds:
  name: 📡 RSS Feeds Build & Deploy
  runs-on: ubuntu-latest
  triggers:
    - Changes to src/feeds/**
    - Changes to feed build scripts
    - Root changes (package.json, src/**, scripts/**)
```

### Pipeline Steps

1. **Build RSS Feeds Module** - Embeds feed content for Cloudflare Workers
2. **Build RSS Feeds** - Generates all RSS/Atom XML files
3. **Validate RSS Feeds** - XML validation using xmllint
4. **Test RSS Feed Handler** - Bun tests for feed functionality
5. **Generate Report** - Creates summary of feed generation
6. **Upload Artifacts** - Stores feeds for deployment

## 📦 Bun CI Commands

### Available Scripts

```bash
# Build Commands
bun run feeds:build              # Build all RSS feeds
bun run feeds:validate           # Validate XML structure
bun run feeds:deploy             # Deploy to Cloudflare Workers

# Module Generation
bun run scripts/build-feeds-module.ts  # Generate feeds-content.ts

# Testing
bun test tests/feeds/            # Run all feed tests
bun test src/feeds-handler.ts    # Test feed handler

# CI Integration
bun run ci:build                 # Full CI build with feeds
```

### Bun-Specific Features

- **Direct TypeScript Execution**: No transpilation needed
- **Native Performance**: Sub-second feed generation
- **Built-in Testing**: Bun test runner for feed validation
- **Fast Module Resolution**: Instant feed content embedding

## 🧪 Testing Strategy

### Test Coverage

```bash
# Run feed tests with coverage
bun test tests/feeds/ --coverage

# Test files:
- tests/feeds/rss-feeds.test.ts     # Main feed tests
- src/feeds-handler.test.ts         # Handler tests
- scripts/validate-feeds.test.ts    # Validation tests
```

### Test Categories

1. **Feed Existence**: All required feed files exist
2. **XML Validation**: Proper XML structure and encoding
3. **URL Validation**: Cloudflare Workers URLs (not GitHub Pages)
4. **Content Validation**: Required fields and structure
5. **Handler Tests**: HTTP responses and content types
6. **CI Integration**: Build scripts and deployment

## 🚀 Deployment Process

### Automatic Deployment (CI/CD)

```yaml
# Triggered on:
- Push to main branch
- Pull request merge
- Manual workflow dispatch
```

### Manual Deployment

```bash
# Deploy to production
bun run feeds:deploy

# Deploy with options
bun run feeds:deploy --env=production --verbose

# Dry run (no actual deployment)
bun run feeds:deploy --dry-run
```

### Deployment Verification

The deployment script automatically:

- Validates all feeds before deployment
- Runs tests to ensure functionality
- Verifies deployment with HTTP checks
- Reports feed URLs for verification

## 🔍 Monitoring & Validation

### Feed Validation Script

```bash
# Validate all feeds
bun run scripts/validate-feeds.ts

# Validation checks:
- XML structure validity
- Required RSS/Atom fields
- Cloudflare Workers URLs
- Item/entry count
- Category tags
- Build dates
```

### CI Validation Reports

Each CI run generates:

- Feed file list with sizes
- Module size metrics
- Validation results
- Test coverage reports
- Deployment URLs

## 🛠️ Troubleshooting

### Common Issues

1. **XML Validation Failures**

   ```bash
   # Check XML syntax
   xmllint --noout src/feeds/*.xml
   ```

2. **Build Module Failures**

   ```bash
   # Rebuild feeds module
   bun run scripts/build-feeds-module.ts
   ```

3. **Deployment Failures**

   ```bash
   # Check Cloudflare credentials
   wrangler whoami

   # Verify KV namespaces
   wrangler kv:namespace list
   ```

### Debug Commands

```bash
# Verbose build
bun run feeds:build --verbose

# Test specific feed
bun test tests/feeds/rss-feeds.test.ts -t "Error codes RSS"

# Check feed content
curl -s https://dashboard-worker.nolarose1968-806.workers.dev/feeds/error-codes-rss.xml | head -20
```

## 📊 Performance Metrics

### Build Performance (Bun)

- Feed module generation: ~200ms
- XML generation: ~50ms per feed
- Validation: ~100ms total
- Deployment: ~5 seconds

### Runtime Performance

- Cold start: < 50ms
- Feed response: < 10ms
- Cache TTL: 3600 seconds
- Memory usage: < 50MB

## 🔐 Security Considerations

### Feed Security

- CORS headers enabled (`Access-Control-Allow-Origin: *`)
- Cache headers for CDN optimization
- No sensitive data in feeds
- HTTPS-only deployment

### CI/CD Security

- Secrets stored in GitHub Actions
- Cloudflare API tokens encrypted
- Build artifacts retention: 7 days
- Deployment verification checks

## 📈 Integration Benefits

### For CI Team

- ✅ Automated feed generation on every commit
- ✅ XML validation prevents broken feeds
- ✅ Test coverage ensures functionality
- ✅ Deployment verification confirms availability

### For Development Team

- ✅ No manual feed updates needed
- ✅ Automatic URL updates for deployments
- ✅ Version-controlled feed content
- ✅ Rollback capability through Git

### For Operations Team

- ✅ Real-time error code updates
- ✅ Team announcement distribution
- ✅ Critical alert notifications
- ✅ Standard RSS/Atom compatibility

## 🎯 Next Steps

1. **Set up feed monitoring** - Add uptime checks for feed URLs
2. **Configure alerts** - Notify on validation failures
3. **Add feed analytics** - Track subscription metrics
4. **Implement auto-updates** - Trigger feeds on error code changes

## 📞 Contact

- **CI/CD Team**: ci-team@fire22.ag
- **DevOps**: devops@fire22.ag
- **RSS Feed Support**: tech-team@fire22.ag

---

Last Updated: January 28, 2025 Version: 1.0.0
