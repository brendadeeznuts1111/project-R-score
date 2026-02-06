# Known Issues and Formal Tokens

This document tracks known issues, their formal identification tokens, and their current status. All issues follow a standardized token format for tracking and reference.

## 🏷️ Token Format

All issues use the following formal token format:

```text
[TYPE]-[CATEGORY]-[ID]-[SEVERITY]
```

### Token Components

- **TYPE**: Issue type (BUG, FEAT, PERF, SEC, DOC)
- **CATEGORY**: Component or area (API, UI, BUILD, TEST, CONFIG)
- **ID**: Sequential identifier (001, 002, 003...)
- **SEVERITY**: Impact level (CRIT, HIGH, MED, LOW)

### Example Tokens

- `BUG-API-001-CRIT` - Critical API bug
- `FEAT-UI-002-MED` - Medium priority UI feature
- `PERF-BUILD-003-HIGH` - High priority build performance issue

## 📋 Known Issues

### 🔴 Critical Issues

#### BUG-API-001-CRIT: IPFoxy API Authentication Timeout

**Description**: IPFoxy API requests timeout after 30 seconds during high load
**Impact**: Complete loss of proxy management functionality
**Status**: 🔄 In Progress
**Assigned**: @security-team
**Target Fix**: v1.0.1
**Workaround**: Use cached proxy data temporarily

```typescript
// Affected code
const response = await fetch("https://apis.ipfoxy.com/ip/open-api/proxy-list", {
  timeout: 30000 // Timeout causing issues
});
```

#### BUG-UI-002-CRIT: React 18 Concurrent Rendering Memory Leak

**Description**: Memory leak in React 18 concurrent rendering with feature flags
**Impact**: Browser crashes after extended use
**Status**: 🔄 In Progress
**Assigned**: @frontend-team
**Target Fix**: v1.0.1
**Workaround**: Disable concurrent features in bunfig.toml

### 🟠 High Priority Issues

#### PERF-BUILD-003-HIGH: Bun Build Performance Degradation

**Description**: Build times increased from 30s to 2+ minutes with enhanced templates
**Impact**: Slow development workflow
**Status**: 📋 Open
**Assigned**: @build-team
**Target Fix**: v1.1.0
**Workaround**: Use `bun run build:basic` for faster builds

```bash
# Current build time
$ bun run build:prod
# Takes 2+ minutes

# Workaround
$ bun run build:basic
# Takes 30 seconds
```

#### BUG-CONFIG-004-HIGH: Feature Flag Configuration Not Persisting

**Description**: Feature flag changes in development environment not persisting across restarts
**Impact**: Inconsistent development experience
**Status**: 📋 Open
**Assigned**: @config-team
**Target Fix**: v1.0.1
**Workaround**: Manually set flags in .env.development

#### BUG-API-005-HIGH: DuoPlus Phone Status Sync Issues

**Description**: Phone status updates not syncing correctly with unified profiles
**Impact**: Stale phone status in UI
**Status**: 📋 Open
**Assigned**: @api-team
**Target Fix**: v1.1.0
**Workaround**: Refresh page manually to get latest status

### 🟡 Medium Priority Issues

#### FEAT-UI-006-MED: Enhanced Template Mobile Responsiveness

**Description**: Template selection component not fully responsive on mobile devices
**Impact**: Poor mobile user experience
**Status**: 📋 Open
**Assigned**: @ui-team
**Target Fix**: v1.2.0
**Workaround**: Use desktop for template management

#### DOC-007-MED: API Documentation Outdated

**Description**: API documentation doesn't reflect latest endpoint changes
**Impact**: Developer confusion and integration issues
**Status**: 📋 Open
**Assigned**: @docs-team
**Target Fix**: v1.1.0
**Workaround**: Refer to source code for latest API

#### BUG-TEST-008-MED: Test Environment DOM Setup Issues

**Description**: 21/46 tests failing due to DOM environment preparation
**Impact**: Reduced test coverage and confidence
**Status**: 📋 Open
**Assigned**: @test-team
**Target Fix**: v1.1.0
**Workaround**: Run tests in browser environment

### 🟢 Low Priority Issues

#### FEAT-CONFIG-009-LOW: Additional Environment Configuration Options

**Description**: Need more granular environment configuration for staging
**Impact**: Limited deployment flexibility
**Status**: 📋 Open
**Assigned**: @config-team
**Target Fix**: v2.0.0
**Workaround**: Use existing production/staging configs

#### DOC-010-LOW: Enhanced Examples and Tutorials

**Description**: Need more comprehensive examples for advanced features
**Impact**: Steeper learning curve for new users
**Status**: 📋 Open
**Assigned**: @docs-team
**Target Fix**: v2.0.0
**Workaround**: Refer to existing documentation

## 🔍 Issue Categories

### API Issues (API)

- Authentication and authorization
- Endpoint functionality
- Data synchronization
- Third-party integrations

### UI Issues (UI)

- Component rendering
- User experience
- Responsive design
- Accessibility

### Build Issues (BUILD)

- Compilation errors
- Performance optimization
- Bundle size
- Dependency management

### Configuration Issues (CONFIG)

- Environment setup
- Feature flags
- Deployment settings
- Development workflow

### Test Issues (TEST)

- Test failures
- Coverage gaps
- Test environment setup
- Mock configuration

### Documentation Issues (DOC)

- Outdated content
- Missing examples
- API reference
- User guides

### Performance Issues (PERF)

- Load times
- Memory usage
- Network optimization
- Resource efficiency

### Security Issues (SEC)

- Vulnerabilities
- Data protection
- Access control
- Encryption

## 📊 Issue Statistics

### By Severity

- 🔴 Critical: 2 issues
- 🟠 High: 3 issues
- 🟡 Medium: 3 issues
- 🟢 Low: 2 issues

### By Category

- API: 2 issues
- UI: 2 issues
- BUILD: 1 issue
- CONFIG: 2 issues
- TEST: 1 issue
- DOC: 2 issues
- PERF: 1 issue
- SEC: 0 issues

### By Status

- 🔄 In Progress: 2 issues
- 📋 Open: 8 issues
- ✅ Resolved: 0 issues

## 🚀 Resolution Timeline

### v1.0.1 (Target: Next Week)

- BUG-API-001-CRIT: IPFoxy API Authentication Timeout
- BUG-UI-002-CRIT: React 18 Concurrent Rendering Memory Leak
- BUG-CONFIG-004-HIGH: Feature Flag Configuration Not Persisting

### v1.1.0 (Target: Next Month)

- PERF-BUILD-003-HIGH: Bun Build Performance Degradation
- BUG-API-005-HIGH: DuoPlus Phone Status Sync Issues
- FEAT-UI-006-MED: Enhanced Template Mobile Responsiveness
- DOC-007-MED: API Documentation Outdated
- BUG-TEST-008-MED: Test Environment DOM Setup Issues

### v2.0.0 (Target: Next Quarter)

- FEAT-CONFIG-009-LOW: Additional Environment Configuration Options
- DOC-010-LOW: Enhanced Examples and Tutorials

## 🏷️ Issue Creation Guidelines

### When creating new issues:

1. **Use formal tokens** in issue titles
2. **Assign appropriate severity** based on impact
3. **Include reproduction steps** for bugs
4. **Provide environment details** for all issues
5. **Link related issues** using tokens
6. **Set target version** for planned fixes

### Token Assignment Process:

1. **Determine TYPE**: BUG, FEAT, PERF, SEC, DOC
2. **Identify CATEGORY**: API, UI, BUILD, TEST, CONFIG
3. **Get next ID**: Check latest ID in category
4. **Assess SEVERITY**: CRIT, HIGH, MED, LOW
5. **Create token**: Combine all components

### Example Token Creation:

```text
Issue: Mobile template selection crashes
Type: BUG
Category: UI
Next ID: 011
Severity: HIGH
Token: BUG-UI-011-HIGH
```

## 📞 Reporting Issues

### For Security Issues

- Email: security@foxyproxy.com
- Do NOT use public issues for security vulnerabilities

### For Critical Issues

- Create issue with CRIT severity
- @mention maintainers
- Include reproduction steps
- Provide impact assessment

### For General Issues

- Use appropriate issue template
- Include environment details
- Follow token guidelines
- Provide sufficient context

## 🔄 Issue Lifecycle

1. **Created**: Issue opened with formal token
2. **Triaged**: Severity and priority assessed
3. **Assigned**: Team member assigned
4. **In Progress**: Work being done
5. **Testing**: Fix being tested
6. **Resolved**: Issue marked as resolved
7. **Closed**: Issue closed after verification

---

This document is updated regularly to reflect the current state of known issues. For the most up-to-date information, check the GitHub Issues page.
