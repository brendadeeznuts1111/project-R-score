# RFC-0000: [Package Name] - [Brief Title]

**Author:** Your Name <your.email@yourcompany.com>  
**Team:** [Team Name]  
**Package:** [@graph/layerX | @bench/layerX]  
**Date:** YYYY-MM-DD  
**Status:** Draft | Review | Approved | Rejected | Implemented  
**Telegram Topic:** [Auto-linked to package topic]

---

## 📋 Summary

[One paragraph summary of the proposed change]

---

## 🎯 Motivation

**Why is this change needed?**

- [Problem 1]
- [Problem 2]
- [Expected benefit]

**Current behavior vs Desired behavior**

---

## 🔧 Technical Details

### Changes Proposed

```typescript
// Before
currentImplementation() {
  // existing code
}

// After
proposedImplementation() {
  // new code
}
```

### Properties Affected

| Property | Current Value | Proposed Value | Benchmark Impact |
|----------|---------------|----------------|------------------|
| threshold | 0.75 | 0.80 | TBD (run @bench) |
| zScoreThreshold | 2.0 | 2.25 | TBD (run @bench) |

### Benchmark Plan

```bash
# Run before implementation
bun run @bench/layer4 --property=threshold --values=0.75

# Run after implementation  
bun run @bench/layer4 --property=threshold --values=0.80

# Compare results
bun run bench:compare before after
```

---

## 📊 Expected Performance Impact

- **Detection time:** ±X%
- **Anomaly count:** ±X%
- **Memory usage:** ±X MB
- **Benchmark target:** <50ms p99

---

## 🧪 Test Plan

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Benchmark regression < 5%
- [ ] Stress test passes (10K events)

---

## ✅ Acceptance Criteria

- [ ] Team lead approval: [Team Lead Name]
- [ ] Benchmark results meet targets
- [ ] All tests pass (repeats=20)
- [ ] Documentation updated
- [ ] Telegram topic notified

---

## 💬 Discussion

**Questions for reviewers:**

1. 
2. 

**Alternative approaches considered:**

- [Alternative 1]: [Why not chosen]
- [Alternative 2]: [Why not chosen]

---

## 🚀 Rollout Plan

1. **Development:** Implement changes locally
2. **Benchmarking:** Run full benchmark suite
3. **Review:** Team lead approval + RFC discussion in Telegram
4. **Alpha:** Publish to `alpha` tag
5. **Beta:** Publish to `beta` tag after 24h alpha testing
6. **Release:** Publish to `latest` after team approval

---

## 🔙 Rollback Plan

**If benchmark regression > 5% or anomaly count increases > 10%:**

1. Revert changes in git
2. Publish patch version with revert
3. Notify Telegram topic: `@graph/layerX` rollback due to [reason]

---

## 📚 References

- [Related RFCs]: 
- [Benchmark results]:
- [GitHub Issue]: 
- [Telegram Discussion]: [Link to topic message]
