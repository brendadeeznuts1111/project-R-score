# API Documentation

## Core Endpoints

### Main Portal
- **Base URL**: `http://localhost:3000`
- **Documentation**: [Main Portal Docs](http://localhost:3000/docs)
- **Health Check**: [Health Status](http://localhost:3000/health)

### Content-Type Server  
- **Base URL**: `http://localhost:3001`
- **Examples**: [Content-Type Demo](http://localhost:3001/api/examples)
- **Auto-detect**: [Auto Detection](http://localhost:3001/api/auto-detect)

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
curl http://localhost:3000/api/typedarray/urls

# Test content-type handling
curl -X POST http://localhost:3001/api/content-type/blob \
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
