# Quick Table Format Reference

**Standard Master Table Format** used across all DuoPlus documentation.

## Core Column Structure

Every table must include these columns (when applicable to the context):

```
| Name | Type | Category | Scope | Domain | Tier | Status | Notes |
|------|------|----------|-------|--------|------|--------|-------|
```

---

## 1. Feature Flags Table Format

**Use when documenting:** Compile-time flags, runtime toggles, feature matrix

```markdown
| Feature | Type | Category | Domain | Scope | Tier | Size | Release | Status |
|---------|------|----------|--------|-------|------|------|---------|--------|
| `DEBUG` | Utility | Observability | all | Development | basic | +30B | v1.3.5 | ✅ Stable |
```

**Required columns:**
- `Feature`: Flag name (code formatted)
- `Type`: Utility|Feature|Scope
- `Category`: Observability|Testing|Environment|Security|Infrastructure|Compliance|Protection
- `Domain`: Target registry/environment (e.g., api.duoplus.io, dev.duoplus.io, github.com)
- `Scope`: Deployment context (Development|Enterprise|Internal|GitHub|GitLab)
- `Tier`: Feature availability (basic|standard|premium)
- `Size`: Bundle size impact
- `Release`: First version where available
- `Status`: ✅ Stable | ⚠️ Experimental | ⏳ Pending | ❌ Deprecated

---

## 2. Build Variant Table Format

**Use when documenting:** Build configuration, deployment matrix, environment setup

```markdown
| Variant | Domain | Features | Size | Build Time | Scope | Tier | Use Case | Status |
|---------|--------|----------|------|-----------|-------|------|----------|--------|
| Production | all | None | 1.46 KB | 3ms | global | basic | Default | ✅ Approved |
```

**Required columns:**
- `Variant`: Named build type (Production|Development|Enterprise)
- `Domain`: Target environment
- `Features`: Enabled compile-time flags
- `Size`: Final bundle size
- `Build Time`: Compilation duration
- `Scope`: Deployment context
- `Tier`: Availability level
- `Use Case`: Primary purpose
- `Status`: ✅ Approved | ⏳ Testing | ⚠️ Beta | ❌ Discontinued

---

## 3. Scope/Security Table Format

**Use when documenting:** Scope isolation, security requirements, validation rules

```markdown
| Component | Property | Scope | Tier | Domain | Validation | Risk | Status |
|-----------|----------|-------|------|--------|-----------|------|--------|
| Metrics | scope | Enterprise | premium | api.duoplus.io | MUST match env scope | Critical | ✅ Enforced |
```

**Required columns:**
- `Component`: System component (Metrics|WebSocket|Export|API)
- `Property`: Specific field being validated
- `Scope`: Deployment context where enforced
- `Tier`: Feature tier this applies to
- `Domain`: Registry/environment domain
- `Validation`: What must be checked
- `Risk`: Critical|High|Medium|Low
- `Status`: ✅ Enforced | ⏳ Pending | ⚠️ Review | ❌ Waived

---

## 4. Performance/Optimization Table Format

**Use when documenting:** Feature performance, optimization candidates, dead code elimination

```markdown
| Feature | Type | Scope | Size | Build Flag | Compile-Time | Runtime | Dead Code | Candidates |
|---------|------|-------|------|-----------|--------------|---------|-----------|------------|
| PERF_TRACKING | Optional | Development | +60B | --feature=PERF_TRACKING | Eliminated in prod | 0ms | ✅ Yes | r2-apple-manager |
```

**Required columns:**
- `Feature`: Optimization name
- `Type`: Required|Optional|Conditional
- `Scope`: Deployment context
- `Size`: Code/bundle impact
- `Build Flag`: CLI flag to enable
- `Compile-Time`: How long compile takes
- `Runtime`: Runtime overhead (should be 0ms)
- `Dead Code`: ✅ Eliminated | ❌ Always included
- `Candidates`: Modules affected

---

## 5. Implementation Status Table Format

**Use when documenting:** Project roadmap, feature matrix, completion tracking

```markdown
| Requirement | Component | Implementation | Domain | Scope | Tier | Status | Deadline |
|-------------|-----------|-----------------|--------|-------|------|--------|----------|
| Scope isolation | Metrics | validateMetricScope() | all | Enterprise | premium | ✅ Done | 2026-01-15 |
```

**Required columns:**
- `Requirement`: What needs to be done
- `Component`: Which system component
- `Implementation`: Code/method name
- `Domain`: Target environment
- `Scope`: Deployment context
- `Tier`: Feature tier required
- `Status`: ✅ Done | ⏳ Todo | ⚠️ Review | ❌ Blocked
- `Deadline`: Target completion date

---

## 6. Validation Matrix Format

**Use when documenting:** Input validation, sanitization rules, security checks

```markdown
| Input | Validation | Sanitization | Scope | Risk | Pattern |
|-------|-----------|--------------|-------|------|---------|
| Key names | [^\w.-] | Replace with _ | all | Medium | operation → operation |
```

**Required columns:**
- `Input`: What's being validated
- `Validation`: What check to perform
- `Sanitization`: How to clean the data
- `Scope`: Where this applies
- `Risk`: Critical|High|Medium|Low
- `Pattern`: Before → After example

---

## Master Column Legend

| Column | Usage | Valid Values | Example |
|--------|-------|--------------|---------|
| **Type** | What kind of thing | Utility, Feature, Scope, Optional, Required, Conditional | `Utility` |
| **Category** | What domain it serves | Observability, Testing, Environment, Security, Infrastructure, Compliance, Protection | `Observability` |
| **Scope** | Where it's deployed | Development, Enterprise, Internal, GitHub, GitLab, all, global | `Enterprise` |
| **Domain** | Which environment | all, api.duoplus.io, dev.duoplus.io, internal.duoplus.io, github.com, gitlab.com | `api.duoplus.io` |
| **Tier** | Feature availability | basic, standard, premium | `premium` |
| **Status** | Current state | ✅ Stable, ✅ Done, ⏳ Pending, ⏳ Todo, ⚠️ Experimental, ⚠️ Review, ❌ Deprecated, ❌ Blocked | `✅ Stable` |
| **Risk** | Security/impact level | Critical, High, Medium, Low | `Critical` |
| **Validation** | Security check | MUST, SHOULD, CANNOT, Enum validation, Format check | `MUST match scope` |

---

## Template: Copy-Paste Table Structures

### Template 1: Feature Documentation
```markdown
| Feature | Type | Category | Domain | Scope | Tier | Size | Release | Status |
|---------|------|----------|--------|-------|------|------|---------|--------|
| `NAME` | Utility|Feature|Scope | Observability|Testing|Environment|Security|Infrastructure | all|specific.domain | Development|Enterprise|Internal | basic|standard|premium | +XXB | vX.X.X | ✅|⏳|⚠️|❌ |
```

### Template 2: Build/Deployment Matrix
```markdown
| Variant | Domain | Features | Size | Build Time | Scope | Tier | Use Case | Status |
|---------|--------|----------|------|-----------|-------|------|----------|--------|
| Name | all|domain | Feature list | XXX KB | Xms | Environment | Tier | Purpose | ✅|⏳|⚠️ |
```

### Template 3: Security/Validation Matrix
```markdown
| Component | Property | Scope | Tier | Domain | Validation | Risk | Status |
|-----------|----------|-------|------|--------|-----------|------|--------|
| System | Field | Environment | Tier | Domain | Rule | Critical|High|Medium|Low | ✅|⏳|⚠️ |
```

### Template 4: Implementation Roadmap
```markdown
| Requirement | Component | Implementation | Domain | Scope | Tier | Status | Deadline |
|-------------|-----------|-----------------|--------|-------|------|--------|----------|
| Task | Module | Code | Domain | Environment | Tier | ✅|⏳|⚠️|❌ | YYYY-MM-DD |
```

---

## Best Practices

✅ **DO:**
- Always include `Scope`, `Domain`, `Tier` columns
- Use consistent emoji indicators (✅, ⏳, ⚠️, ❌)
- Sort by `Status` then `Scope` for readability
- Include `Deadline` for action items
- Link to implementation files in `Implementation` column
- Use backticks for code (`feature-name`)

❌ **DON'T:**
- Leave `Scope` or `Tier` blank
- Mix different status emoji formats
- Omit `Domain` unless it's "all"
- Use vague `Status` values
- Create tables without a clear purpose
- Skip the legend/explanation

---

## Examples in Action

**Good table** (includes all required columns):
```markdown
| Feature | Type | Category | Domain | Scope | Tier | Size | Status |
|---------|------|----------|--------|-------|------|------|--------|
| `DEBUG` | Utility | Observability | all | Development | basic | +30B | ✅ Stable |
| `ENTERPRISE` | Scope | Environment | api.duoplus.io | Enterprise | premium | +40B | ✅ Stable |
```

**Bad table** (missing critical columns):
```markdown
| Feature | Usage | Size |
|---------|-------|------|
| DEBUG | Logging | +30B |
| ENTERPRISE | Features | +40B |
```
← Missing: Type, Category, Domain, Scope, Tier, Status

---

**Status**: ✅ **Approved** | Use this format across all documentation | Ensure tables include all required columns
