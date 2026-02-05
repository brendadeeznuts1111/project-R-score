# 🚀 Scoping Matrix Quick Reference

**TL;DR** — Multi-tenant configuration system using compile-time feature elimination + runtime scope detection.

## Your Role

### 👨‍💻 **Developer**

**Read First:** [`docs/SCOPING_MATRIX_AUTO.md`](docs/SCOPING_MATRIX_AUTO.md) → **Runtime Scope Detection** section

**Check your scope:**
```typescript
import { detectScope } from '../data/scopingMatrixEnhanced';
const scope = detectScope(Bun.env.HOST);
console.log(`You're running ${scope}`);
```

**Get your features:**
```typescript
import { getScopedFeatureFlags } from '../data/scopingMatrixEnhanced';
const flags = getScopedFeatureFlags(Bun.env.HOST);
console.log(`Available flags: ${Array.from(flags).join(', ')}`);
```

**Gated code:**
```typescript
import { feature } from "bun:bundle";
if (feature("DEBUG")) {
  console.log("Debug mode enabled!");
  // This code is removed at compile time if DEBUG=false
}
```

**Validate metrics:**
```typescript
import { validateMetricScope } from '../data/scopingMatrixEnhanced';
if (!validateMetricScope(metric.scope)) {
  throw new Error("Cross-scope data leak detected!");
}
```

---

### 🔧 **DevOps / SRE**

**Read First:** [`docs/SCOPING_MATRIX_AUTO.md`](docs/SCOPING_MATRIX_AUTO.md) → **Master Scoping Matrix** table

**Build for scope:**
```bash
# ENTERPRISE
bun build \
  --feature=APPLE_FACTORY_WAGER_COM_TENANT \
  --feature=R2_STORAGE \
  --feature=PREMIUM_SECRETS \
  --minify src/index.ts

# DEVELOPMENT
bun build \
  --feature=DEV_APPLE_FACTORY_WAGER_COM_TENANT \
  --feature=DEBUG \
  --feature=MOCK_API \
  --minify src/index.ts

# LOCAL-SANDBOX
bun build \
  --feature=LOCAL_SANDBOX \
  --feature=DEBUG \
  --feature=MOCK_API \
  --minify src/index.ts
```

**Validate before deploy:**
```bash
bun scripts/validate-scoping-matrix.ts
# All 37 tests must pass ✅
```

**Check what's in a scope:**
```bash
grep "ENTERPRISE\|DEVELOPMENT\|LOCAL-SANDBOX" docs/SCOPING_MATRIX_AUTO.md | head -20
```

---

### 🔒 **Security**

**Read First:** [`docs/MASTER_PERF_MATRIX.md`](docs/MASTER_PERF_MATRIX.md) → **Scope Isolation Requirements** + **Security Validation Checklist**

**Key guardrails:**
- Each scope has isolated storage path (`enterprise/`, `development/`, `local-sandbox/`, `global/`)
- Secrets backend matches platform (Windows Credential Manager, macOS Keychain, libsecret)
- Metrics validated before processing to prevent cross-scope data leakage
- Feature flags enable/disable security-critical features at compile time

**Scope detection is O(1):**
```
apple.factory-wager.com → ENTERPRISE
dev.apple.factory-wager.com → DEVELOPMENT
localhost → LOCAL-SANDBOX
*.local or unknown → global (fallback)
```

**No cross-scope data flow:**
```typescript
// Throws error if metric from DEVELOPMENT arrives on ENTERPRISE dashboard
validateMetricScope(metric.scope) || throw new Error("Scope violation");
```

---

### 📚 **Documentation Author**

**Read First:** [`docs/TABLE_FORMAT_STANDARD.md`](docs/TABLE_FORMAT_STANDARD.md)

**Master table columns (use all):**
1. **Name/Feature** - What is it?
2. **Type** - Utility | Feature | Scope | Test
3. **Category** - Observability | Security | Testing | Performance
4. **Domain** - apple.factory-wager.com | dev... | localhost | * (global)
5. **Scope** - ENTERPRISE | DEVELOPMENT | LOCAL-SANDBOX | global
6. **Tier** - Critical | High | Medium | Low
7. **Status** - Implemented | Testing | Planned | Deprecated
8. **Risk** - High | Medium | Low | None
9. **Validation** - How to verify?

**Table template:**
```markdown
| Name | Type | Category | Domain | Scope | Tier | Status | Risk | Validation |
|------|------|----------|--------|-------|------|--------|------|------------|
| Feature A | Feature | Security | apple.factory-wager.com | ENTERPRISE | Critical | Implemented | Medium | Run security audit |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |
```

**Never edit these files directly:**
- ❌ `docs/SCOPING_MATRIX_AUTO.md` — Auto-generated from `data/scopingMatrixEnhanced.ts`

**Update files instead:**
- ✅ `data/scopingMatrixEnhanced.ts` — Source of truth
- ✅ Then run: `bun scripts/generate-scoping-docs.ts`

---

## Core Concepts

### Scope = Tenant Context

| Scope | Domain | Storage | Secrets | Use Case |
|-------|--------|---------|---------|----------|
| **ENTERPRISE** | apple.factory-wager.com | `enterprise/` | Credential Manager / Keychain | Production multi-user |
| **DEVELOPMENT** | dev.apple.factory-wager.com | `development/` | Credential Manager / Keychain | Team development |
| **LOCAL-SANDBOX** | localhost | `local-sandbox/` | Encrypted local | Safe experimentation |
| **global** | *.local or unknown | `global/` | Encrypted local | Fallback graceful failure |

### Feature Flags = Compile-Time Deletion

```typescript
// This flag:
--feature=R2_STORAGE

// Enables this code:
if (feature("R2_STORAGE")) {
  // Uploaded to Cloudflare R2
}

// Disables this code:
if (!feature("R2_STORAGE")) {
  // Falls back to local storage
}

// Result: Dead code is removed by Bun bundler
// No runtime if/else, zero overhead!
```

### Storage Isolation = Data Safety

```
project/
  ├─ enterprise/           # ENTERPRISE scope
  │  └─ metrics-2026-01-15.json
  ├─ development/          # DEVELOPMENT scope
  │  └─ metrics-2026-01-15.json
  ├─ local-sandbox/        # LOCAL-SANDBOX scope
  │  └─ metrics-2026-01-15.json
  └─ global/               # Fallback (if scope can't be detected)
     └─ metrics-2026-01-15.json
```

Scopes cannot read each other's data.

---

## Common Tasks

### "I want to add a new tenant"

1. Edit `data/scopingMatrixEnhanced.ts`
2. Add 3 new rows (Windows, macOS, Linux):
   ```typescript
   {
     servingDomain: 'your-domain.com',
     detectedScope: 'CUSTOM_TENANT',
     platform: 'Windows',  // etc
     // ... fill all 12 columns
   }
   ```
3. Run validator: `bun scripts/validate-scoping-matrix.ts`
4. Run generator: `bun scripts/generate-scoping-docs.ts`
5. Commit both files

### "I want to add a new feature flag"

1. Add to `data/scopingMatrixEnhanced.ts` in the `featureFlags[]` array for the appropriate row(s)
2. Run: `bun scripts/generate-env-dts.ts` to auto-generate TypeScript types
3. Use in code with `if (feature("FLAG_NAME")) { ... }`
4. Run validator and generator as above

### "I need to know what's enabled in ENTERPRISE"

```bash
grep "ENTERPRISE" docs/SCOPING_MATRIX_AUTO.md
# Look at the Feature Flag(s) column
```

Or in code:
```typescript
const flags = getScopedFeatureFlags('apple.factory-wager.com');
console.log(Array.from(flags));
// Output: [ 'APPLE_FACTORY_WAGER_COM_TENANT', 'R2_STORAGE', 'PREMIUM_SECRETS' ]
```

### "I'm deploying to production, what should I build?"

```bash
# Validate first
bun scripts/validate-scoping-matrix.ts

# Check SCOPING_MATRIX_AUTO.md for which features to enable
# Then build:
bun build \
  --feature=APPLE_FACTORY_WAGER_COM_TENANT \
  --feature=R2_STORAGE \
  --feature=PREMIUM_SECRETS \
  --minify src/index.ts
```

---

## Validation Checklist

- [ ] All 37 validation tests pass: `bun scripts/validate-scoping-matrix.ts`
- [ ] Docs are regenerated: `bun scripts/generate-scoping-docs.ts`
- [ ] Both files committed:
  ```bash
  git add data/scopingMatrixEnhanced.ts docs/SCOPING_MATRIX_AUTO.md
  ```
- [ ] Build succeeds with correct features for your scope
- [ ] Scope detection works: `detectScope(Bun.env.HOST) === 'YOUR_SCOPE'`
- [ ] Metrics validation prevents cross-scope leakage

---

## Files You Need

| File | Purpose | Edit? | Role |
|------|---------|-------|------|
| `data/scopingMatrixEnhanced.ts` | Source of truth | ✅ YES | All |
| `scripts/generate-scoping-docs.ts` | Auto-docs generator | ❌ NO | DevOps |
| `scripts/validate-scoping-matrix.ts` | Validation tests | ❌ NO | CI/CD |
| `docs/SCOPING_MATRIX_AUTO.md` | Generated docs | ❌ NO (auto-gen) | Read only |
| `docs/TABLE_FORMAT_STANDARD.md` | Table format rules | ❌ NO | Reference |
| `docs/MASTER_PERF_MATRIX.md` | Security framework | ❌ NO | Reference |

---

## Emergency Contacts

- **Scoping issues?** Check `docs/SCOPING_MATRIX_AUTO.md` → Runtime Scope Detection
- **Build failures?** Run `bun scripts/validate-scoping-matrix.ts` to find validation errors
- **Scope isolation?** Read `docs/MASTER_PERF_MATRIX.md` → Scope Isolation Requirements
- **Feature flags?** Check `data/scopingMatrixEnhanced.ts` → `featureFlags[]` column
- **Docs out of sync?** Run `bun scripts/generate-scoping-docs.ts` and commit

---

**Status:** ✅ **READY FOR PRODUCTION**

Last updated: 2026-01-15 | Next review: After Phase 2 Security Implementation
