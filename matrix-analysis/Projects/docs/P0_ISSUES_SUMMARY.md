# P0 Issues Summary

## 🚨 Production Blockers (This Week)

### Issue #1: [SECURITY] Remove `event-stream` dependency
- **File**: `package.json:11`
- **Assignee**: @security-team
- **Estimate**: 2 hours
- **Labels**: `security`, `cve`, `p0`, `dependencies`

### Issue #2: [DEPS] Remove unused dependencies
- **Dependencies**: `express`, `axios`, `chalk`
- **Assignee**: @dev-team
- **Estimate**: 1 hour
- **Labels**: `tech-debt`, `p0`, `dependencies`

### Issue #3: [SECURITY] Restrict CORS to known origins
- **File**: `feedback-server.ts:27-31`
- **Assignee**: @backend-team
- **Estimate**: 3 hours
- **Labels**: `security`, `cors`, `p0`, `api`

### Issue #4: [SECURITY] Add authentication to feedback endpoints
- **File**: `feedback-server.ts:77-127`
- **Assignee**: @backend-team
- **Estimate**: 4 hours
- **Labels**: `security`, `auth`, `p0`, `api`

### Issue #5: [COMPLIANCE] Hash escalation tokens in audit logs
- **File**: `pm.ts:581-590`
- **Assignee**: @dev-team
- **Estimate**: 2 hours
- **Labels**: `compliance`, `security`, `p0`, `logging`

### Issue #6: [ARCH] Create EnterpriseScanner module or remove integration
- **File**: `bookmark-integrations.ts:7`
- **Assignee**: @arch-team (decision required)
- **Estimate**: 2 hours
- **Labels**: `architecture`, `p0`, `bug`

## 📊 Sprint Planning

**Total Estimated Time**: 14 hours (2-3 days with parallel work)

**Blocking**: All P1 work until #1, #3, #4 are merged (security baseline)

**Parallel Work Possible**:
- #1 and #2 can be done in parallel
- #3 and #4 should be sequential (CORS first, then auth)
- #5 can be done independently
- #6 requires product decision first

## 🔗 GitHub Issue Templates

Issue templates created in `.github/ISSUE_TEMPLATE/`:
- `p0-security-event-stream.md`
- `p0-deps-remove-unused.md`
- `p0-security-cors.md`
- `p0-security-auth.md`
- `p0-compliance-token-hashing.md`
- `p0-arch-missing-module.md`

## 📝 Pull Request Templates

PR templates created:
- `.github/pull_request_template.md` (general)
- `.github/pull_request_template_p0.md` (P0 specific)

## 🔄 CI/CD Integration

Workflow created: `.github/workflows/p0-security-check.yml`
- Automatically checks P0 security requirements
- Runs on PRs with `p0` or `security` labels
- Validates fixes before merge

## 🚀 Next Steps

1. Create issues using templates: `gh issue create --template .github/ISSUE_TEMPLATE/p0-security-event-stream.md`
2. Assign to teams
3. Set up sprint board
4. Begin parallel work on #1 and #2
5. Get product decision on #6
