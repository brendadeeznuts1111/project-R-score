# [SEMVER][RULES][GOV][SEMVER-RULES-001][v3.0.0][ACTIVE]

**🚀 SEMVER RULES – GOV ENFORCED *Bun native. All versions. No invalid releases.* **

---

## [REQUIRED][SEMVER-VALID-001][v3.0.0][ACTIVE]

**Trigger:** Tool/EXE version update or deployment

**Action:**
- `Semver.valid(version)` check
- Parse version components
- Validate format compliance
- Log version change

**Example:**
```bash
bun semver validate 3.0.1  # ✅ Valid
bun semver validate 1.2    # ❌ Invalid
```

**Enforcement:** `bun rules:enforce SEMVER-VALID-001`

---

## [REQUIRED][SEMVER-BUMP-001][v3.0.0][ACTIVE]

**Trigger:** Deploy/commit/merge to production

**Action:**
- Mandatory `bun semver inc` before deploy
- Git tag creation (v3.0.1)
- EXE rebuild with new version
- Block merge without version bump

**Example:**
```bash
# Before deploy
bun semver inc patch  # v3.0.0 → v3.0.1 + tag + EXE

# Deploy blocked without version bump
git merge feature/x   # ❌ FAIL: No version bump
```

**Enforcement:** `bun rules:enforce SEMVER-BUMP-001`

---

## [CORE][SEMVER-COMPARE-001][v3.0.0][ACTIVE]

**Trigger:** Dependency updates or version conflicts

**Action:**
- `Semver.compare(v1, v2)` for ordering
- Validate upgrade compatibility
- Alert on breaking changes

**Example:**
```bash
bun semver compare 3.1.0 3.0.9  # 1 (newer)
bun semver compare 2.0.0 3.0.0  # -1 (older)
```

**Enforcement:** Automatic in CI/CD pipeline

---

## [CORE][SEMVER-PRERELEASE-001][v3.0.0][ACTIVE]

**Trigger:** Beta/alpha/rc releases

**Action:**
- Prerelease format validation
- Proper ordering (alpha < beta < rc)
- Automatic cleanup on stable release

**Example:**
```bash
bun semver prerelease beta    # v3.0.0-beta.1
bun semver prerelease rc      # v3.0.0-rc.1
bun semver clean              # v3.0.0 (remove prerelease)
```

**Enforcement:** `bun semver validate <version>`

---

## [OPTIONAL][SEMVER-VAULT-001][v3.0.0][ACTIVE]

**Trigger:** Major version releases

**Action:**
- Vault-wide version bump
- All headers updated [v3.0.0]
- Documentation synchronized

**Example:**
```bash
bun semver vault minor  # All [v2.9.x] → [v3.0.0]
```

**Enforcement:** Manual for major releases

---

## [IMPLEMENTATION][DETAILS][IMPL-001][v3.0.0][STABLE]

**Bun Native API Usage:**
```ts
import { Semver } from "bun";

// Parse
const v = Semver.parse("3.0.1-beta.2");
// → { major: 3, minor: 0, patch: 1, prerelease: ["beta", "2"] }

// Increment
const next = Semver.inc("3.0.0", "minor");
// → "3.1.0"

// Validate
const valid = Semver.valid("1.2.3");
// → true

// Compare
const cmp = Semver.compare("3.1.0", "3.0.9");
// → 1 (greater than)
```

**GOV Integration:**
- Rules validate all version changes
- Blocks invalid versions
- Enforces proper semantic versioning
- Audit trail of version changes

---

## [VALIDATION][EXAMPLES][VAL-001][v3.0.0][STABLE]

**Valid Versions:**
- `1.0.0` - Stable release
- `2.1.3` - Patch release
- `3.0.0-beta.1` - Prerelease
- `1.0.0-alpha.1` - Alpha release
- `2.0.0-rc.1` - Release candidate

**Invalid Versions:**
- `1.2` - Missing patch
- `1.2.3.4` - Too many components
- `v1.2.3` - Leading 'v'
- `1.2.3-beta` - Missing prerelease number

**Validation Command:**
```bash
bun semver validate 1.2.3.4  # ❌ Invalid
bun semver validate 1.2.3    # ✅ Valid
```

---

## [WORKFLOW][INTEGRATION][WF-001][v3.0.0][STABLE]

**Development Workflow:**
```bash
# 1. Develop with version checking
bun semver current  # Check current version

# 2. Test and validate
bun test && bun semver validate $(cat package.json | jq -r .version)

# 3. Version bump on changes
bun semver inc patch  # For bug fixes
bun semver inc minor  # For new features
bun semver inc major  # For breaking changes

# 4. Prerelease for testing
bun semver prerelease beta

# 5. Release
bun release  # Bump + commit + tag + validate
```

**GOV Compliance:**
```bash
# Validate all rules
bun rules:validate

# Audit semver usage
bun rules:audit

# Check specific semver rules
bun rules:enforce SEMVER-VALID-001
bun rules:enforce SEMVER-BUMP-001
```

---

## [AUDIT][TRAIL][AUDIT-001][v3.0.0][ACTIVE]

**Version Change Log:**
- All version changes logged via git tags
- GOV rules track compliance
- Audit reports generated monthly
- Version validation on all builds

**Example Audit:**
```json
{
  "rule": "SEMVER-VALID-001",
  "status": "PASS",
  "version": "3.0.0",
  "timestamp": "2024-01-15T10:30:00Z",
  "message": "Version format valid"
}
```

---

*Semver Rules v3.0.0 • Bun Native • GOV Enforced • Zero Invalid Releases*
