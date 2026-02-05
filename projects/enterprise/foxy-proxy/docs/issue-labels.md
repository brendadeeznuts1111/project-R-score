# GitHub Issue Labels Configuration

This document defines the formal labeling system for GitHub issues, ensuring consistent categorization and tracking.

## 🏷️ Label Categories

### Type Labels

- `bug` - Software bugs and errors
- `enhancement` - Feature requests and improvements
- `performance` - Performance-related issues
- `security` - Security vulnerabilities and concerns
- `documentation` - Documentation issues and improvements
- `question` - Questions and help requests
- `maintenance` - Maintenance and cleanup tasks

### Priority Labels

- `critical` - Critical issues requiring immediate attention
- `high` - High priority issues
- `medium` - Medium priority issues
- `low` - Low priority issues

### Status Labels

- `needs-triage` - Issues needing initial assessment
- `in-progress` - Issues currently being worked on
- `blocked` - Issues blocked by dependencies
- `ready-for-review` - Issues ready for review
- `testing` - Issues in testing phase
- `resolved` - Issues resolved but not closed
- `wontfix` - Issues that will not be fixed

### Component Labels

- `api` - API-related issues
- `ui` - User interface issues
- `build` - Build system issues
- `config` - Configuration issues
- `test` - Testing issues
- `deps` - Dependency issues
- `infra` - Infrastructure issues

### Feature Labels

- `feature-flags` - Feature flag system
- `enhanced-templates` - Enhanced template system
- `unified-profiles` - Unified profile management
- `duoplus` - DuoPlus integration
- `ipfoxy` - IPFoxy integration
- `monitoring` - Performance monitoring
- `ci-cd` - CI/CD pipeline

## 🎯 Label Usage Guidelines

### Required Labels

All issues must have:

1. **Type label** (bug, enhancement, etc.)
2. **Priority label** (critical, high, medium, low)
3. **Component label** (api, ui, build, etc.)

### Optional Labels

- **Status labels** for workflow tracking
- **Feature labels** for specific features
- **Team labels** for assignment

### Label Combinations

Examples of proper label combinations:

```
bug + critical + api + needs-triage
enhancement + medium + ui + feature-flags
performance + high + build + in-progress
security + critical + infra + blocked
documentation + low + enhanced-templates
question + medium + config + needs-triage
```

## 📊 Label Definitions

### Type Labels

#### `bug`

**Description**: Software bugs, errors, unexpected behavior
**Color**: Red (d73a4a)
**Usage**: Use for any unintended behavior or errors

#### `enhancement`

**Description**: Feature requests, improvements, new functionality
**Color**: Green (a2eeef)
**Usage**: Use for new features or significant improvements

#### `performance`

**Description**: Performance issues, optimization opportunities
**Color**: Orange (fbca04)
**Usage**: Use for slow performance, memory issues, optimization

#### `security`

**Description**: Security vulnerabilities, security improvements
**Color**: Red (d73a4a)
**Usage**: Use for security concerns and vulnerabilities

#### `documentation`

**Description**: Documentation issues, improvements, missing docs
**Color**: Blue (0075ca)
**Usage**: Use for documentation-related issues

#### `question`

**Description**: Questions, help requests, clarifications
**Color**: Gray (6f42c1)
**Usage**: Use for user questions and help requests

#### `maintenance`

**Description**: Maintenance tasks, cleanup, refactoring
**Color**: Purple (5319e7)
**Usage**: Use for maintenance and cleanup tasks

### Priority Labels

#### `critical`

**Description**: Critical issues, blockers, security issues
**Color**: Red (b60205)
**Usage**: Use for issues blocking development or production

#### `high`

**Description**: High priority issues, significant impact
**Color**: Red (d93f0b)
**Usage**: Use for important issues affecting user experience

#### `medium`

**Description**: Medium priority issues, normal impact
**Color**: Orange (fbca04)
**Usage**: Use for standard issues and improvements

#### `low`

**Description**: Low priority issues, minor impact
**Color**: Gray (6f42c1)
**Usage**: Use for minor issues and nice-to-have features

### Status Labels

#### `needs-triage`

**Description**: Issues needing initial assessment
**Color**: Gray (6f42c1)
**Usage**: Default status for new issues

#### `in-progress`

**Description**: Issues currently being worked on
**Color**: Orange (fbca04)
**Usage**: Use when actively working on an issue

#### `blocked`

**Description**: Issues blocked by dependencies
**Color**: Red (d73a4a)
**Usage**: Use when waiting for dependencies

#### `ready-for-review`

**Description**: Issues ready for code review
**Color**: Blue (0075ca)
**Usage**: Use when PR is ready for review

#### `testing`

**Description**: Issues in testing phase
**Color**: Purple (5319e7)
**Usage**: Use when testing fixes or features

#### `resolved`

**Description**: Issues resolved but not closed
**Color**: Green (a2eeef)
**Usage**: Use when fix is implemented but not merged

#### `wontfix`

**Description**: Issues that will not be fixed
**Color**: Gray (6f42c1)
**Usage**: Use when declining to fix an issue

### Component Labels

#### `api`

**Description**: API endpoints, integration, data flow
**Color**: Blue (0075ca)
**Usage**: Use for API-related issues

#### `ui`

**Description**: User interface, components, UX
**Color**: Green (a2eeef)
**Usage**: Use for frontend and UI issues

#### `build`

**Description**: Build system, compilation, bundling
**Color**: Orange (fbca04)
**Usage**: Use for build and compilation issues

#### `config`

**Description**: Configuration, environment, settings
**Color**: Purple (5319e7)
**Usage**: Use for configuration-related issues

#### `test`

**Description**: Testing, test coverage, test framework
**Color**: Red (d73a4a)
**Usage**: Use for testing-related issues

#### `deps`

**Description**: Dependencies, packages, libraries
**Color**: Gray (6f42c1)
**Usage**: Use for dependency issues

#### `infra`

**Description**: Infrastructure, deployment, CI/CD
**Color**: Blue (0075ca)
**Usage**: Use for infrastructure issues

## 🔄 Label Workflow

### New Issue Creation

1. Issue created with `needs-triage` label
2. Maintainer assesses and adds appropriate labels
3. Priority and component labels assigned
4. Issue moves to appropriate workflow

### Issue Progression

1. `needs-triage` → `in-progress` (when work starts)
2. `in-progress` → `ready-for-review` (when PR created)
3. `ready-for-review` → `testing` (when review approved)
4. `testing` → `resolved` (when testing passes)
5. `resolved` → issue closed (when merged)

### Blocked Issues

- Add `blocked` label when waiting for dependencies
- Remove `blocked` label when dependencies are resolved
- Add comment explaining what is blocking the issue

## 📈 Label Metrics

### Label Usage Tracking

- Track label usage patterns
- Monitor issue resolution times by priority
- Analyze component issue distribution
- Measure team workload by label

### Quality Metrics

- Time to triage new issues
- Time to resolve by priority
- Issue recurrence by type
- Label accuracy and consistency

## 🛠️ Automation Rules

### Automatic Labeling

- New issues get `needs-triage` label
- PRs get `ready-for-review` when marked as draft
- Security issues get `security` and `critical` labels
- Performance issues get `performance` label

### Label Validation

- Ensure all issues have required labels
- Validate label combinations
- Prevent invalid label usage
- Enforce consistent labeling

## 📞 Label Management

### Label Creation

- Create new labels through GitHub UI
- Follow color scheme guidelines
- Use consistent naming conventions
- Document new labels here

### Label Maintenance

- Review label usage quarterly
- Remove unused labels
- Update label descriptions
- Maintain label consistency

---

This labeling system ensures consistent issue tracking and efficient workflow management. All team members should follow these guidelines for proper issue categorization.
