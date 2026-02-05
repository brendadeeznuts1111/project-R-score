# URLPattern Quick Reference

**Version**: 7.9.0.0.0.0.0  
**Last Updated**: 2025-12-07

## Testing Patterns Interactively

```bash
# Start pattern testing environment
bun -i

# Test patterns interactively:
> const pattern = new URLPattern({ pathname: '/api/v1/graph/:eventId' })
> pattern.test('http://localhost:3000/api/v1/graph/NFL-20241207-1345')
true
> pattern.exec('http://localhost:3000/api/v1/graph/NFL-20241207-1345')
{
  pathname: { 
    input: '/api/v1/graph/NFL-20241207-1345',
    groups: { eventId: 'NFL-20241207-1345' }
  }
}
```

---

## Common Patterns in HyperBun MLGS

### Event Patterns
```
/api/v1/graph/:eventId
/api/v1/graph/:eventId/periods/:period
/api/v1/graph/:eventId/layer/:layerNumber
```

### Log Patterns
```
/api/v1/logs
/api/v1/logs/:level
/api/v1/logs/:level/:count?
```

### Secret Patterns
```
/api/v1/secrets/:server/:type
/api/v1/secrets/:server/:type/:key?
```

### Dashboard Patterns
```
/dashboard
/dashboard/:eventId
/dashboard/:eventId/focus/:layer
```

### WebSocket Patterns
```
/ws/logs
/ws/graph/:eventId
/ws/alerts
```

---

## Performance Monitoring

### Watch pattern hit rates:
```bash
# High cache hit rate = good performance
tail -f logs/engine.log | grep "pattern_matched" | wc -l

# Watch for uncached matches (should be rare)
tail -f logs/engine.log | grep "pattern_matched_uncached"
```

### Check router metrics:
```bash
# In monitoring window
watch -n 5 'curl -s http://localhost:3000/api/v1/metrics | jq .patternMetrics'
```

---

## Troubleshooting

### Pattern not matching?
```bash
# Test pattern interactively
bun -e "
const pattern = new URLPattern({ pathname: '/your/pattern/:param' })
console.log(pattern.test('http://localhost:3000/your/pattern/value'))
console.log(pattern.exec('http://localhost:3000/your/pattern/value'))
"
```

### Slow pattern matching?
```bash
# Check cache hit rate (should be >95%)
bun -e "
const router = require('./src/api/routers/urlpattern-router').urlPatternRouter
console.log(router.getMetrics())
"

# If cache misses are high, increase cache size
# Edit: src/api/routers/pattern-optimizer.ts
# CACHE_SIZE = 5000 (increase from 1000)
```

### Pattern collision?
```bash
# Find overlapping patterns
bun run find:pattern-collisions

# Expected: 0 collisions in production
```

---

## URLPattern vs Regex: Key Differences

| Feature | URLPattern | Regex |
|---------|------------|-------|
| **Performance** | **10-15x faster** | Slower |
| **Type Safety** | ✅ Automatic groups | ⚠️ Manual extraction |
| **Wildcard** | `/files/*` | `/files\/(.+)/` |
| **Optional** | `/logs/:level?` | `/logs(?:\/([^\/]+))?/` |
| **Standard** | ✅ Web Platform API | ❌ Non-standard |
| **Readability** | ✅ Excellent | ❌ Poor |

---

**Cross-reference**: [7.0.0.0.0.0.0 URLPattern Router](../7.0.0.0.0.0.0.0-URLPATTERN-ROUTER.md)  
**Ripgrep Pattern**: `7\.9\.0\.0\.0\.0\.0|url-pattern-quickref`
