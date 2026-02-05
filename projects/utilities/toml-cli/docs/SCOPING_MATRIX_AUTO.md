# DuoPlus Multi-Tenant Scoping & Platform Matrix (v3.7+ Enhanced)

**Auto-generated:** 2026-01-15T06:53:31.451Z  
**Source:** [`data/scopingMatrixEnhanced.ts`](../../data/scopingMatrixEnhanced.ts)  
**⚠️ DO NOT EDIT DIRECTLY** — Update source TypeScript file instead

---

## Master Scoping Matrix

Unified view of all tenant contexts, platforms, and configurations.


| Serving Domain / Context | Detected Scope | Platform | Storage Path | Secrets Backend | Service Name Format | Secrets Flag | Bun Runtime TZ | Bun Test TZ | Feature Flag(s) | API / Strategy Used | Benefit |
|--------------------------|----------------|----------|--------------|-----------------|---------------------|--------------|----------------|------------|-----------------|---------------------|---------|
| `apple.factory-wager.com` | **ENTERPRISE** | Windows | `enterprise/` | Windows Credential Manager | `duoplus-ENTERPRISE-apple` | `CRED_PERSIST_ENTERPRISE` | System local | UTC | `APPLE_FACTORY_WAGER_COM_TENANT`, `R2_STORAGE`, `PREMIUM_SECRETS` | Bun.env.HOST, Bun.s3.write(), feature() | Dead-code elimination; S3 exports with contentDisposition; secure credential storage |
| `apple.factory-wager.com` | **ENTERPRISE** | macOS | `enterprise/` | macOS Keychain | `duoplus-ENTERPRISE-apple` | `CRED_PERSIST_ENTERPRISE` | System local | UTC | `APPLE_FACTORY_WAGER_COM_TENANT`, `PREMIUM_SECRETS` | Security.framework (native addon), Bun.s3.write() | Hardware-backed secrets; full native macOS compatibility; atomic writes prevent corruption |
| `apple.factory-wager.com` | **ENTERPRISE** | Linux | `enterprise/` | Secret Service (libsecret) | `duoplus-ENTERPRISE-apple` | `CRED_PERSIST_ENTERPRISE` | System local | UTC | `APPLE_FACTORY_WAGER_COM_TENANT`, `R2_STORAGE` | libsecret via FFI, Bun.file() for atomic updates | Secure enterprise Linux secret storage; idempotent file operations |
| `dev.apple.factory-wager.com` | **DEVELOPMENT** | Windows | `development/` | Windows Credential Manager | `duoplus-DEVELOPMENT-apple` | `CRED_PERSIST_ENTERPRISE` | System local | UTC | `DEV_APPLE_FACTORY_WAGER_COM_TENANT`, `DEBUG`, `MOCK_API` | Bun.env, Bun.file().write(), Bun.inspect.custom | Safe dev logging; local mirror under data/development/; rich object inspection |
| `dev.apple.factory-wager.com` | **DEVELOPMENT** | macOS | `development/` | macOS Keychain | `duoplus-DEVELOPMENT-apple` | `CRED_PERSIST_ENTERPRISE` | System local | UTC | `DEV_APPLE_FACTORY_WAGER_COM_TENANT`, `DEBUG` | Bun.inspect.custom, Bun.serve() for debug dashboard | Live debug at /debug; rich object inspection; fast scope resolution |
| `dev.apple.factory-wager.com` | **DEVELOPMENT** | Linux | `development/` | Secret Service | `duoplus-DEVELOPMENT-apple` | `CRED_PERSIST_ENTERPRISE` | System local | UTC | `DEV_APPLE_FACTORY_WAGER_COM_TENANT`, `DEBUG`, `MOCK_API` | process.platform, Bun.match() for pattern matching | No regex overhead; normalized feature names from domains |
| `localhost` | **LOCAL-SANDBOX** | Windows | `local-sandbox/` | Encrypted local storage (fallback) | `duoplus-LOCAL-SANDBOX-default` | `CRED_PERSIST_ENTERPRISE` | System local | UTC | `LOCAL_SANDBOX`, `DEBUG`, `MOCK_API` | Bun.file("data/local-sandbox/..."), atomic writes | Idempotent file updates; no partial writes; safe for rapid iteration |
| `localhost` | **LOCAL-SANDBOX** | macOS | `local-sandbox/` | macOS Keychain (user-scoped) | `duoplus-LOCAL-SANDBOX-default` | `CRED_PERSIST_ENTERPRISE` | System local | UTC | `LOCAL_SANDBOX`, `DEBUG` | Bun.spawn(), DASHBOARD_SCOPE env isolation | Isolated dashboard per scope; no cross-scope contamination |
| `localhost` | **LOCAL-SANDBOX** | Linux | `local-sandbox/` | Secret Service (user-scoped) | `duoplus-LOCAL-SANDBOX-default` | `CRED_PERSIST_ENTERPRISE` | System local | UTC | `LOCAL_SANDBOX`, `DEBUG`, `MOCK_API` | Bun.gc(), TTL-cached validators | Stable memory during long-running dev server |
| `*.local` | **global** | Windows | `global/` | Encrypted local storage | `duoplus-GLOBAL-default` | `CRED_PERSIST_ENTERPRISE` | System local | UTC | — | Bun.env.HOST ?? "localhost", fallback logic | Graceful degradation; no crash on misconfiguration |
| `unsupported-os` | **LOCAL-SANDBOX** | Other | `local-sandbox/` | Encrypted local storage (fallback) | `duoplus-LOCAL-SANDBOX-default` | `CRED_PERSIST_ENTERPRISE` | System local | UTC | `LOCAL_SANDBOX` | domainToFeature() normalization, graceful fallback | Clean feature names: unsupported-os → LOCAL_SANDBOX |


---

## Key Bun-Native Patterns

| Pattern | Where Used | Why It Matters |
|---------|-----------|----------------|
| **Atomic writes** | Local mirror file updates | Prevents corrupted state during crashes (`Bun.write(temp) → rename`) |
| **Idempotent generation** | `generate-env-dts.ts` | Avoids Git noise; safe in CI loops |
| **Normalized domain names** | `domainToFeature()` | Ensures valid JS identifiers: `dev.apple...` → `DEV_APPLE..._TENANT` |
| **Feature-based code elimination** | `feature()` from `bun:bundle` | Dead code removed at compile-time (0 runtime overhead) |
| **Scope validation** | `validateMetricScope()` | Prevents cross-scope data leakage |
| **Exit codes** | All scripts | `Bun.exit(1)` on error → CI fails fast |

---

## By Platform


## Windows


### apple.factory-wager.com (ENTERPRISE)

- **Storage Path:** `enterprise/`
- **Secrets Backend:** Windows Credential Manager
- **Service Name:** `duoplus-ENTERPRISE-apple`
- **Feature Flags:** `APPLE_FACTORY_WAGER_COM_TENANT`, `R2_STORAGE`, `PREMIUM_SECRETS`
- **API Strategy:** Bun.env.HOST, Bun.s3.write(), feature()
- **Benefit:** Dead-code elimination; S3 exports with contentDisposition; secure credential storage


### dev.apple.factory-wager.com (DEVELOPMENT)

- **Storage Path:** `development/`
- **Secrets Backend:** Windows Credential Manager
- **Service Name:** `duoplus-DEVELOPMENT-apple`
- **Feature Flags:** `DEV_APPLE_FACTORY_WAGER_COM_TENANT`, `DEBUG`, `MOCK_API`
- **API Strategy:** Bun.env, Bun.file().write(), Bun.inspect.custom
- **Benefit:** Safe dev logging; local mirror under data/development/; rich object inspection


### localhost (LOCAL-SANDBOX)

- **Storage Path:** `local-sandbox/`
- **Secrets Backend:** Encrypted local storage (fallback)
- **Service Name:** `duoplus-LOCAL-SANDBOX-default`
- **Feature Flags:** `LOCAL_SANDBOX`, `DEBUG`, `MOCK_API`
- **API Strategy:** Bun.file("data/local-sandbox/..."), atomic writes
- **Benefit:** Idempotent file updates; no partial writes; safe for rapid iteration


### *.local (global)

- **Storage Path:** `global/`
- **Secrets Backend:** Encrypted local storage
- **Service Name:** `duoplus-GLOBAL-default`
- **Feature Flags:** None
- **API Strategy:** Bun.env.HOST ?? "localhost", fallback logic
- **Benefit:** Graceful degradation; no crash on misconfiguration



## macOS


### apple.factory-wager.com (ENTERPRISE)

- **Storage Path:** `enterprise/`
- **Secrets Backend:** macOS Keychain
- **Service Name:** `duoplus-ENTERPRISE-apple`
- **Feature Flags:** `APPLE_FACTORY_WAGER_COM_TENANT`, `PREMIUM_SECRETS`
- **API Strategy:** Security.framework (native addon), Bun.s3.write()
- **Benefit:** Hardware-backed secrets; full native macOS compatibility; atomic writes prevent corruption


### dev.apple.factory-wager.com (DEVELOPMENT)

- **Storage Path:** `development/`
- **Secrets Backend:** macOS Keychain
- **Service Name:** `duoplus-DEVELOPMENT-apple`
- **Feature Flags:** `DEV_APPLE_FACTORY_WAGER_COM_TENANT`, `DEBUG`
- **API Strategy:** Bun.inspect.custom, Bun.serve() for debug dashboard
- **Benefit:** Live debug at /debug; rich object inspection; fast scope resolution


### localhost (LOCAL-SANDBOX)

- **Storage Path:** `local-sandbox/`
- **Secrets Backend:** macOS Keychain (user-scoped)
- **Service Name:** `duoplus-LOCAL-SANDBOX-default`
- **Feature Flags:** `LOCAL_SANDBOX`, `DEBUG`
- **API Strategy:** Bun.spawn(), DASHBOARD_SCOPE env isolation
- **Benefit:** Isolated dashboard per scope; no cross-scope contamination



## Linux


### apple.factory-wager.com (ENTERPRISE)

- **Storage Path:** `enterprise/`
- **Secrets Backend:** Secret Service (libsecret)
- **Service Name:** `duoplus-ENTERPRISE-apple`
- **Feature Flags:** `APPLE_FACTORY_WAGER_COM_TENANT`, `R2_STORAGE`
- **API Strategy:** libsecret via FFI, Bun.file() for atomic updates
- **Benefit:** Secure enterprise Linux secret storage; idempotent file operations


### dev.apple.factory-wager.com (DEVELOPMENT)

- **Storage Path:** `development/`
- **Secrets Backend:** Secret Service
- **Service Name:** `duoplus-DEVELOPMENT-apple`
- **Feature Flags:** `DEV_APPLE_FACTORY_WAGER_COM_TENANT`, `DEBUG`, `MOCK_API`
- **API Strategy:** process.platform, Bun.match() for pattern matching
- **Benefit:** No regex overhead; normalized feature names from domains


### localhost (LOCAL-SANDBOX)

- **Storage Path:** `local-sandbox/`
- **Secrets Backend:** Secret Service (user-scoped)
- **Service Name:** `duoplus-LOCAL-SANDBOX-default`
- **Feature Flags:** `LOCAL_SANDBOX`, `DEBUG`, `MOCK_API`
- **API Strategy:** Bun.gc(), TTL-cached validators
- **Benefit:** Stable memory during long-running dev server



## Other


### unsupported-os (LOCAL-SANDBOX)

- **Storage Path:** `local-sandbox/`
- **Secrets Backend:** Encrypted local storage (fallback)
- **Service Name:** `duoplus-LOCAL-SANDBOX-default`
- **Feature Flags:** `LOCAL_SANDBOX`
- **API Strategy:** domainToFeature() normalization, graceful fallback
- **Benefit:** Clean feature names: unsupported-os → LOCAL_SANDBOX



---

## By Scope


## Scope: ENTERPRISE


### apple.factory-wager.com on Windows

| Property | Value |
|----------|-------|
| Storage Path | `enterprise/` |
| Secrets Backend | Windows Credential Manager |
| Service Name | `duoplus-ENTERPRISE-apple` |
| API Strategy | Bun.env.HOST, Bun.s3.write(), feature() |
| Feature Flags | `APPLE_FACTORY_WAGER_COM_TENANT`, `R2_STORAGE`, `PREMIUM_SECRETS` |
| Operational Benefit | Dead-code elimination; S3 exports with contentDisposition; secure credential storage |


### apple.factory-wager.com on macOS

| Property | Value |
|----------|-------|
| Storage Path | `enterprise/` |
| Secrets Backend | macOS Keychain |
| Service Name | `duoplus-ENTERPRISE-apple` |
| API Strategy | Security.framework (native addon), Bun.s3.write() |
| Feature Flags | `APPLE_FACTORY_WAGER_COM_TENANT`, `PREMIUM_SECRETS` |
| Operational Benefit | Hardware-backed secrets; full native macOS compatibility; atomic writes prevent corruption |


### apple.factory-wager.com on Linux

| Property | Value |
|----------|-------|
| Storage Path | `enterprise/` |
| Secrets Backend | Secret Service (libsecret) |
| Service Name | `duoplus-ENTERPRISE-apple` |
| API Strategy | libsecret via FFI, Bun.file() for atomic updates |
| Feature Flags | `APPLE_FACTORY_WAGER_COM_TENANT`, `R2_STORAGE` |
| Operational Benefit | Secure enterprise Linux secret storage; idempotent file operations |



## Scope: DEVELOPMENT


### dev.apple.factory-wager.com on Windows

| Property | Value |
|----------|-------|
| Storage Path | `development/` |
| Secrets Backend | Windows Credential Manager |
| Service Name | `duoplus-DEVELOPMENT-apple` |
| API Strategy | Bun.env, Bun.file().write(), Bun.inspect.custom |
| Feature Flags | `DEV_APPLE_FACTORY_WAGER_COM_TENANT`, `DEBUG`, `MOCK_API` |
| Operational Benefit | Safe dev logging; local mirror under data/development/; rich object inspection |


### dev.apple.factory-wager.com on macOS

| Property | Value |
|----------|-------|
| Storage Path | `development/` |
| Secrets Backend | macOS Keychain |
| Service Name | `duoplus-DEVELOPMENT-apple` |
| API Strategy | Bun.inspect.custom, Bun.serve() for debug dashboard |
| Feature Flags | `DEV_APPLE_FACTORY_WAGER_COM_TENANT`, `DEBUG` |
| Operational Benefit | Live debug at /debug; rich object inspection; fast scope resolution |


### dev.apple.factory-wager.com on Linux

| Property | Value |
|----------|-------|
| Storage Path | `development/` |
| Secrets Backend | Secret Service |
| Service Name | `duoplus-DEVELOPMENT-apple` |
| API Strategy | process.platform, Bun.match() for pattern matching |
| Feature Flags | `DEV_APPLE_FACTORY_WAGER_COM_TENANT`, `DEBUG`, `MOCK_API` |
| Operational Benefit | No regex overhead; normalized feature names from domains |



## Scope: LOCAL-SANDBOX


### localhost on Windows

| Property | Value |
|----------|-------|
| Storage Path | `local-sandbox/` |
| Secrets Backend | Encrypted local storage (fallback) |
| Service Name | `duoplus-LOCAL-SANDBOX-default` |
| API Strategy | Bun.file("data/local-sandbox/..."), atomic writes |
| Feature Flags | `LOCAL_SANDBOX`, `DEBUG`, `MOCK_API` |
| Operational Benefit | Idempotent file updates; no partial writes; safe for rapid iteration |


### localhost on macOS

| Property | Value |
|----------|-------|
| Storage Path | `local-sandbox/` |
| Secrets Backend | macOS Keychain (user-scoped) |
| Service Name | `duoplus-LOCAL-SANDBOX-default` |
| API Strategy | Bun.spawn(), DASHBOARD_SCOPE env isolation |
| Feature Flags | `LOCAL_SANDBOX`, `DEBUG` |
| Operational Benefit | Isolated dashboard per scope; no cross-scope contamination |


### localhost on Linux

| Property | Value |
|----------|-------|
| Storage Path | `local-sandbox/` |
| Secrets Backend | Secret Service (user-scoped) |
| Service Name | `duoplus-LOCAL-SANDBOX-default` |
| API Strategy | Bun.gc(), TTL-cached validators |
| Feature Flags | `LOCAL_SANDBOX`, `DEBUG`, `MOCK_API` |
| Operational Benefit | Stable memory during long-running dev server |


### unsupported-os on Other

| Property | Value |
|----------|-------|
| Storage Path | `local-sandbox/` |
| Secrets Backend | Encrypted local storage (fallback) |
| Service Name | `duoplus-LOCAL-SANDBOX-default` |
| API Strategy | domainToFeature() normalization, graceful fallback |
| Feature Flags | `LOCAL_SANDBOX` |
| Operational Benefit | Clean feature names: unsupported-os → LOCAL_SANDBOX |



## Scope: global


### *.local on Windows

| Property | Value |
|----------|-------|
| Storage Path | `global/` |
| Secrets Backend | Encrypted local storage |
| Service Name | `duoplus-GLOBAL-default` |
| API Strategy | Bun.env.HOST ?? "localhost", fallback logic |
| Feature Flags | None |
| Operational Benefit | Graceful degradation; no crash on misconfiguration |



---

## Integration Patterns

### With Private Registry

```typescript
import { feature } from "bun:bundle";
import { getScopedFeatureFlags } from "../data/scopingMatrixEnhanced";

// For apple.factory-wager.com (ENTERPRISE)
const servingDomain = Bun.env.HOST ?? "localhost";
const flags = getScopedFeatureFlags(servingDomain);

if (flags.has("APPLE_FACTORY_WAGER_COM_TENANT")) {
  const response = await fetch("https://npm.pkg.github.com/duoplus/@duoplus/core", {
    headers: {
      Authorization: `Bearer ${Bun.env.DUOPLUS_NPM_TOKEN}`,
      "Content-Disposition": "inline",
    },
  });
}
```

### With Dashboard Scope

```typescript
import { detectScope } from "../data/scopingMatrixEnhanced";

// Spawn isolated dashboard per scope
const scope = detectScope(Bun.env.HOST);
Bun.env.DASHBOARD_SCOPE = scope;

// Only send scope-matching metrics
const metrics = allMetrics.filter(m => m.scope === scope);
```

### With Metrics Validation

```typescript
import { validateMetricScope } from "../data/scopingMatrixEnhanced";

// Prevent cross-scope leakage
if (!validateMetricScope(metric.scope)) {
  throw new Error(`Metric scope mismatch: ${metric.scope} != ${Bun.env.DASHBOARD_SCOPE}`);
}
```

---

## Feature Flag Mapping

All rows automatically generate compile-time feature flags:

```bash
# Build for ENTERPRISE scope
bun build \
  --feature=APPLE_FACTORY_WAGER_COM_TENANT \
  --feature=R2_STORAGE \
  --feature=PREMIUM_SECRETS \
  --minify src/index.ts

# Build for DEVELOPMENT scope
bun build \
  --feature=DEV_APPLE_FACTORY_WAGER_COM_TENANT \
  --feature=DEBUG \
  --feature=MOCK_API \
  --minify src/index.ts

# Build for LOCAL-SANDBOX (safe dev)
bun build \
  --feature=LOCAL_SANDBOX \
  --feature=DEBUG \
  --feature=MOCK_API \
  --minify src/index.ts
```

---

## Runtime Scope Detection

The matrix enables automatic scope detection:

```typescript
import { detectScope, getMatrixRow } from "../data/scopingMatrixEnhanced";

const servingDomain = Bun.env.HOST || "localhost";
const scope = detectScope(servingDomain);
const row = getMatrixRow(servingDomain);

console.log(`Scope: ${scope}`);
console.log(`Storage: ${row?.storagePath}`);
console.log(`Secrets: ${row?.secretsBackend}`);
```

**Examples:**

| Domain | Detected Scope | Storage | Secrets |
|--------|----------------|---------|---------|
| apple.factory-wager.com | ENTERPRISE | enterprise/ | Windows Credential Manager |
| dev.apple.factory-wager.com | DEVELOPMENT | development/ | macOS Keychain |
| localhost | LOCAL-SANDBOX | local-sandbox/ | Encrypted local |
| *(unknown)* | global | global/ | Encrypted local (fallback) |

---

## Validation Tests

```typescript
// tests/scoping-matrix.test.ts
import { detectScope, getScopedFeatureFlags, validateMetricScope } from "../data/scopingMatrixEnhanced";

test("apple domain → ENTERPRISE scope", () => {
  expect(detectScope("apple.factory-wager.com")).toBe("ENTERPRISE");
});

test("dev domain → DEVELOPMENT scope", () => {
  expect(detectScope("dev.apple.factory-wager.com")).toBe("DEVELOPMENT");
});

test("localhost → LOCAL-SANDBOX scope", () => {
  expect(detectScope("localhost")).toBe("LOCAL-SANDBOX");
});

test("ENTERPRISE gets R2_STORAGE flag", () => {
  const flags = getScopedFeatureFlags("apple.factory-wager.com");
  expect(flags.has("R2_STORAGE")).toBe(true);
});

test("metric scope validation prevents leakage", () => {
  Bun.env.DASHBOARD_SCOPE = "ENTERPRISE";
  expect(validateMetricScope("ENTERPRISE")).toBe(true);
  expect(validateMetricScope("DEVELOPMENT")).toBe(false);
});
```

---

## How to Update This Document

1. **Edit source:** Modify `data/scopingMatrixEnhanced.ts`
2. **Regenerate:** Run `bun scripts/generate-scoping-docs.ts`
3. **Commit:** Git will show the updated markdown
4. **Deploy:** CI automatically picks up new configurations

This keeps the **living spec** in perfect sync with implementation code.

---

## Next Steps

- [ ] Add time-series storage with scoped partitioning (`enterprise/2026/01/15/...`)
- [ ] Implement anomaly detection per scope
- [ ] Create alerting rules per scope tier
- [ ] Setup SLA dashboards by scope

---

**Status:** ✅ **Generated at 2026-01-15T06:53:31.451Z** | Always in sync with code | Single source of truth
