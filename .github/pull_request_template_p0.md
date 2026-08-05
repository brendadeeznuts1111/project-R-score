# [P0] Pull Request Template

For non-P0 work use the default template:
[`.github/pull_request_template.md`](./pull_request_template.md)
(includes **Claim → evidence** — required by `bun scripts/check-pr-claim.ts`).

## Priority: P0 (Production Blocker)

## Issue reference
Fixes #<!-- issue number -->

## Claim → evidence (required)

| Claim (one sentence) | Kind (`unit` / `boundary` / `journey` / `deployed`) | Evidence |
|----------------------|-----------------------------------------------------|----------|
| | | |

## Routing (optional)

| Field | Value |
|-------|-------|
| Domain | `partner` · `control` · `platform` · … · or n/a |
| Tracker | tenant open-issue id (e.g. `BM-1`) · or n/a |
| Concept | vocabulary id only if chrome/wire changes · or n/a |

## 🔒 Security Impact
<!-- For security fixes -->
- [ ] Vulnerability addressed
- [ ] Security team notified
- [ ] CVE reference added (if applicable)
- [ ] Audit log updated

## ✅ Acceptance Criteria Met
<!-- Copy from issue -->
- [ ] <!-- Criteria 1 -->
- [ ] <!-- Criteria 2 -->
- [ ] <!-- Criteria 3 -->

## 🧪 Testing Performed
```bash
# Commands run
bun test
bun audit
bun pm ls <package>
```

## 🔍 Verification Steps
<!-- Steps for reviewer to verify fix -->

## 📊 Impact Assessment
- **Risk Level**: <!-- Critical / High / Medium / Low -->
- **Affected Systems**: <!-- List systems -->
- **Rollback Plan**: <!-- How to rollback if needed -->

## 🔗 Related PRs
<!-- Link related pull requests -->

## ⚠️ Deployment Notes
<!-- Special deployment instructions -->

## 📝 Reviewer Checklist
- [ ] Code review completed
- [ ] Security review completed (if security fix)
- [ ] Tests verified
- [ ] Documentation updated
- [ ] Ready for merge
