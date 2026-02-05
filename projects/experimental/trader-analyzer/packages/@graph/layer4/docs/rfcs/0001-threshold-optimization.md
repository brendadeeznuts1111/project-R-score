# RFC-0001: @graph/layer4 - Increase Threshold from 0.75 to 0.80

**Author:** Jordan Lee <jordan.lee@yourcompany.com>  
**Team:** Sports Correlation  
**Package:** @graph/layer4  
**Date:** 2024-01-15  
**Status:** Review  
**Telegram Topic:** 🏀 @graph/layer4 Cross-Sport (Topic #1)

---

## 📋 Summary

Propose increasing the `threshold` property in `@graph/layer4` from 0.75 to 0.80 to reduce false positives in cross-sport anomaly detection.

---

## 🎯 Motivation

**Current behavior:** 12% false positive rate in chess-football correlation detection.  
**Desired behavior:** < 8% false positive rate.

---

## 🔧 Technical Details

### Changes Proposed

```typescript
// Before (src/config.ts)
export const LAYER4_CONFIG = {
  threshold: 0.75,
  zScoreThreshold: 2.0,
  patternThreshold: 0.65
};

// After
export const LAYER4_CONFIG = {
  threshold: 0.80,  // ← Change here
  zScoreThreshold: 2.0,
  patternThreshold: 0.65
};
```

### Properties Affected

| Property | Current | Proposed | Benchmark Impact |
|----------|---------|----------|------------------|
| threshold | 0.75 | 0.80 | TBD |

### Benchmark Plan

```bash
# Before
bun run @bench/layer4 --property=threshold --values=0.75

# After
bun run @bench/layer4 --property=threshold --values=0.80
```

---

## 📊 Expected Performance Impact

- **False positive rate:** 12% → 7% (-42%)
- **Detection time:** 42ms → 45ms (+7% acceptable)
- **Anomaly count:** 8.2 → 6.1 (-26%)

---

## 🧪 Test Plan

- [x] Unit tests pass
- [ ] Integration tests pass (run after approval)
- [ ] Benchmark regression < 5%
- [ ] Stress test passes

---

## ✅ Acceptance Criteria

- [ ] Team lead approval: Alex Chen
- [ ] Benchmark false positive rate < 8%
- [ ] Detection time < 50ms p99
- [ ] All tests pass (repeats=20)

---

## 💬 Discussion

**Question:** Will this affect detection of legitimate anomalies?  
**Answer:** Benchmark will measure both false positives and true positive rate.

---

## 🚀 Rollout Plan

1. **Development:** Implement change (1 hour)
2. **Benchmarking:** Run full suite (2 hours)
3. **Review:** RFC discussion in Telegram topic #1
4. **Alpha:** Publish to `alpha` tag
5. **Beta:** Publish to `beta` after 24h
6. **Release:** Publish to `latest`

---

## 🔙 Rollback Plan

If detection time > 50ms or true positive rate drops > 5%:

1. Revert config change
2. Publish patch v1.4.0-beta.5
3. Notify Telegram topic #1

---

## 📚 References

- [GitHub Issue #123]: False positive tracking
- [Telegram Discussion]: https://t.me/c/1234567890/1/45678
