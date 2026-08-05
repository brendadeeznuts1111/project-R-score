---
name: "[P0][SECURITY] Remove event-stream dependency (CVE-2018-16489)"
about: Critical security vulnerability in dependencies
title: "[P0][SECURITY] Remove event-stream dependency (CVE-2018-16489)"
labels: security, cve, p0, dependencies
assignees: security-team
---

## Routing (optional — human queue)

| Field | Value |
|-------|-------|
| **Domain** | `partner` · `control` · `trading` · `identity` · `knowledge` · `platform` · or n/a |
| **Tracker** | tenant open-issue id · or n/a |
| **Concept** | vocabulary id only if chrome/wire changes · or n/a |

See [ISSUE-ROUTING.md](../../docs/harness/ISSUE-ROUTING.md).

## 🚨 Description
Dependency `event-stream@4.0.1` has known vulnerability CVE-2018-16489 (malicious code injection). 

**File**: `package.json:11`

## 📋 Acceptance Criteria
- [ ] Remove `event-stream` from package.json
- [ ] Run `bun install` to update lockfile
- [ ] Verify no transitive dependencies remain (`bun pm ls event-stream`)
- [ ] Add `bun audit` to CI pipeline to prevent future CVEs
- [ ] Update security documentation

## 🔍 Verification Steps
```bash
# Check if still present
bun pm ls event-stream

# Should return: "No packages found"
```

## ⚠️ Risk
**Critical** - Known malicious package in dependency tree.

## 📚 References
- CVE-2018-16489: https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2018-16489
- NPM Advisory: https://www.npmjs.com/advisories/726

## 🔗 Related
- Blocks: All P1 work until resolved
- Related to: Security audit compliance
