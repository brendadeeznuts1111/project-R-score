<!-- Prefetch Optimizations -->
  <link rel="preconnect" href="https://bun.sh">
  <link rel="dns-prefetch" href="https://bun.sh">
  <link rel="preload" href="https://bun.sh/logo.svg" importance="high" crossorigin="anonymous">
  <link rel="preconnect" href="https://example.com">
  <link rel="dns-prefetch" href="https://example.com">
  <link rel="preconnect" href="https://cdn.jsdelivr.net">
  <link rel="dns-prefetch" href="https://cdn.jsdelivr.net">
  <link rel="preconnect" href="https://github.com">
  <link rel="dns-prefetch" href="https://github.com">
  <link rel="preconnect" href="https://developer.mozilla.org">
  <link rel="dns-prefetch" href="https://developer.mozilla.org">
<!-- End Prefetch Optimizations -->

# API Documentation

## Core Endpoints

### Main Portal
- **Base URL**: `http://example.com`
- **Documentation**: [Main Portal Docs 🌐](http://example.com/docs)
- **Health Check**: [Health Status 🌐](http://example.com/health)

### Content-Type Server  
- **Base URL**: `http://example.com`
- **Examples**: [Content-Type Demo 🌐](http://example.com/api/examples)
- **Auto-detect**: [Auto Detection 🌐](http://example.com/api/auto-detect)

## External Resources

### Bun Documentation
- **Official Docs**: https://bun.sh/docs
- **TypedArray Guide**: https://bun.sh/docs/runtime/binary-data#typedarray
- **Fetch API**: https://bun.sh/docs/api/fetch
- **Runtime Reference**: https://bun.sh/docs/runtime

### Tools & Libraries
- **GitHub Repository**: https://github.com/oven-sh/bun
- **Discord Community**: https://discord.gg/bun
- **Twitter Updates**: https://twitter.com/bunjavascript

## Internal Links

### Configuration Files
- [Content Types Config](../config/content-types.ts)
- [URL Configuration](../config/urls.ts)
- [Server Configuration](../server/server-enhanced.ts)

### Test Suites
- [UI Quality Tests](../tests/test-ui-quality.ts)
- [Content-Type Tests](../tests/test-content-types.ts)
- [Accessibility Tests](../tests/test-accessibility.ts)

## API Examples

```bash
# Get all typed array URLs
curl http://example.com/api/typedarray/urls

# Test content-type handling
curl -X POST http://example.com/api/content-type/blob \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello World"}'

# Run comprehensive tests
bun run test:all
```

## Related Resources

See also:
- [Performance Metrics](../metrics/performance.md)
- [Deployment Guide](../docs/deployment.md)
- [Troubleshooting](../docs/troubleshooting.md)

---

*Last updated: 2026-02-04*
