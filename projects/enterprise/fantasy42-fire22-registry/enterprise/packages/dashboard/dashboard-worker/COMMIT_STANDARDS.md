# 📝 Commit Standards - Fire22 Dashboard Worker

High-quality commit messages are essential for maintaining a clean project
history, enabling effective collaboration, and facilitating automated tooling.
This guide outlines our commit message standards and quality practices.

## 🎯 Commit Message Format

We follow the **Conventional Commits** specification with Fire22-specific
enhancements:

```text
<type>(<scope>): <subject>

<body>

<footer>
```

### Required Elements

#### Type (Required)

Describes the kind of change being made:

| Type        | Description                                 | Example                                          |
| ----------- | ------------------------------------------- | ------------------------------------------------ |
| `feat`      | New feature for the user                    | `feat(api): add user authentication endpoint`    |
| `fix`       | Bug fix for the user                        | `fix(dashboard): resolve memory leak in updates` |
| `docs`      | Documentation changes                       | `docs(onboarding): update setup guide`           |
| `style`     | Code style changes (formatting, semicolons) | `style(api): fix indentation in user service`    |
| `refactor`  | Code refactoring (no new features/bugs)     | `refactor(patterns): extract common utilities`   |
| `perf`      | Performance improvements                    | `perf(dashboard): optimize rendering pipeline`   |
| `test`      | Adding or updating tests                    | `test(api): add integration tests for auth`      |
| `chore`     | Maintenance tasks, dependency updates       | `chore(deps): update bun to 1.2.21`              |
| `build`     | Build system changes                        | `build(webpack): add source map support`         |
| `ci`        | CI/CD pipeline changes                      | `ci(github): add security scanning workflow`     |
| `revert`    | Reverting a previous commit                 | `revert: undo breaking auth changes`             |
| `security`  | Security fixes and improvements             | `security(auth): fix JWT token validation`       |
| `dept`      | Department-specific changes                 | `dept(marketing): update campaign templates`     |
| `workspace` | Multi-workspace orchestration               | `workspace(core): add split/reunify logic`       |
| `registry`  | Package registry operations                 | `registry(auth): implement token rotation`       |
| `dns`       | DNS optimization and caching                | `dns(performance): add proactive prefetching`    |

#### Scope (Optional but Recommended)

Indicates the area of the codebase affected:

**Workspace Scopes:**

- `core` - @fire22-core-dashboard
- `pattern` - @fire22-pattern-system
- `api` - @fire22-api-client
- `betting` - @fire22-sports-betting
- `telegram` - @fire22-telegram-integration
- `build` - @fire22-build-system

**Department Scopes:**

- `communications` - Communications Department (Sarah Martinez)
- `technology` - Technology Department (Mike Hunt)
- `marketing` - Marketing Department
- `security` - Security Department
- `finance` - Finance Department
- `operations` - Operations Department
- `legal` - Legal/Compliance Department
- `customer-support` - Customer Support Department
- `management` - Management Department
- `team-contributors` - Team Contributors Department
- `sportsbook-ops` - Sportsbook Operations Department

**Component Scopes:**

- `dashboard` - Dashboard UI components
- `worker` - Cloudflare Worker logic
- `db` - Database schemas and migrations
- `auth` - Authentication & authorization
- `cache` - Caching logic
- `queue` - Queue system
- `p2p` - P2P functionality
- `dns` - DNS optimization and caching
- `registry` - Package registry management
- `secrets` - Bun.secrets integration
- `workspace` - Multi-workspace orchestration

**Infrastructure Scopes:**

- `cf` - Cloudflare specific
- `monitoring` - Monitoring & observability
- `logging` - Logging system
- `config` - Configuration files
- `ci` - CI/CD pipeline
- `deployment` - Deployment automation

#### Subject (Required)

A brief description of the change:

- Use imperative mood: "add" not "added" or "adds"
- First letter lowercase (unless proper noun)
- No period at the end
- Maximum 50 characters
- Be specific and descriptive

## 📋 Commit Quality Standards

### ✅ Good Commit Examples

```bash
# Feature addition
feat(api): add real-time sports data integration

Implement WebSocket connection to Fire22 sports feed for live
odds and game updates. Includes error handling and reconnection
logic for network interruptions.

Closes #234

# Bug fix with context
fix(dashboard): resolve race condition in user sessions

Session cleanup was occurring before async operations completed,
causing intermittent authentication failures. Added proper
cleanup ordering and additional logging.

Fixes #456

# Performance improvement
perf(patterns): reduce pattern compilation time by 40%

Optimize pattern weaver initialization through:
- Lazy loading of pattern modules
- Caching of compiled pattern metadata
- Parallel compilation for independent patterns

Benchmark: startup time reduced from 500ms to 300ms

# Documentation update
docs(security): add Bun.secrets integration guide

Comprehensive guide for migrating from environment variables
to secure credential storage using Bun's native secrets API.
Includes platform-specific setup instructions.

# Breaking change
feat(auth)!: implement JWT refresh token rotation

BREAKING CHANGE: Auth tokens now expire after 15 minutes and
require refresh token rotation. Client applications must be
updated to handle token refresh flow.

Migration guide: docs/auth-migration-v3.md
Closes #789
```

### ❌ Poor Commit Examples

```bash
# Too vague
fix: stuff

# Not descriptive enough
feat: update

# Wrong tense
fixed: added new feature

# Too long subject
feat(api): add comprehensive real-time sports data integration with WebSocket connections, error handling, and advanced retry logic

# No context for breaking change
refactor: change API format

# Mixing multiple changes
feat: add auth and fix bugs and update docs
```

## 🔧 Commit Quality Tools

### Git Commit Template

Use our commit message template for consistent formatting:

```bash
# Set up the template
git config commit.template .gitmessage

# Now git commit opens the template
git commit
```

### Commitlint Validation

Automated commit message validation runs on every commit:

```bash
# Install commitlint (done automatically)
npm install -g @commitlint/cli @commitlint/config-conventional

# Manual validation
echo "feat(api): add new endpoint" | commitlint

# Integration with git hooks via lefthook
# Configured in lefthook.yml
```

### Interactive Commit Tool

For guided commit creation:

```bash
# Install commitizen globally
npm install -g commitizen

# Use interactive commit
git cz
# or
npm run commit
```

## 📊 Commit Quality Metrics

### Frequency Guidelines

- **Small, frequent commits** over large, infrequent ones
- **Atomic commits**: each commit should represent a single logical change
- **Complete commits**: don't commit broken code

### Message Quality Indicators

- **Clarity**: Someone unfamiliar with the change should understand it
- **Context**: Explain why the change was needed
- **Impact**: Describe what the change affects
- **References**: Link to issues, PRs, or documentation

### Automated Quality Checks

Our pre-commit hooks verify:

- [ ] Commit message follows conventional format
- [ ] Subject line under 50 characters
- [ ] Body lines under 72 characters
- [ ] No trailing whitespace in message
- [ ] References to issues are properly formatted
- [ ] Breaking changes are clearly marked

## 🚨 Security Considerations

### Never Include in Commits

- API keys, tokens, or passwords
- Database connection strings
- Private keys or certificates
- Internal system details
- Personal information

### Security-Related Commits

Use the `security` type for:

- Vulnerability fixes
- Security feature additions
- Dependency security updates
- Access control changes

```bash
# Security fix example
security(auth): fix JWT token validation bypass

Prevent token validation bypass in edge cases where malformed
tokens could be accepted as valid. Added comprehensive token
format validation and proper error handling.

CVE-2024-XXXX
Fixes #security-001
```

## 🔄 Advanced Commit Practices

### Squashing Commits

Before merging, squash related commits:

```bash
# Interactive rebase to squash
git rebase -i HEAD~3

# Squash with descriptive message
git commit --amend -m "feat(api): complete user authentication system

Implements JWT-based authentication with:
- Login/logout endpoints
- Token refresh mechanism
- Password reset flow
- Rate limiting protection

Includes comprehensive tests and documentation."
```

### Reverting Commits

When reverting, provide context:

```bash
# Good revert message
revert: "feat(api): add real-time updates"

This reverts commit abc123def456 due to performance issues
in production. Real-time updates caused 200% increase in
database load during peak hours.

Issue tracking: #999
Performance report: docs/perf-analysis-2024-12.md
```

### Co-authored Commits

For pair programming:

```bash
feat(patterns): implement advanced caching strategy

Developed new caching layer for pattern compilation results,
reducing repeated computation overhead by 85%.

Co-authored-by: Head of Engineering <engineering@fire22.com>
Co-authored-by: Backend Team Lead <backend@fire22.com>
```

## 🎯 Team Practices

### Commit Review Process

1. **Self-review**: Check your commit message before pushing
2. **Peer review**: Team members can flag poor commit messages
3. **Automated feedback**: Commitlint provides instant feedback
4. **Learning**: Use reviews as opportunities to improve

### Commit Message Standards in PRs

- **PR title** should follow commit message format
- **PR description** should elaborate on the commit body
- **Squash merge** should result in a well-formatted commit
- **Department attribution** should include relevant department heads
- **Co-author attribution** should include collaborators with company emails

### Branch Naming Conventions

Align branch names with commit types and departments:

```bash
# Feature branches
feat/user-authentication
feat/dept-marketing-campaigns
feat/workspace-orchestration

# Fix branches
fix/memory-leak-dashboard
fix/dns-caching-performance
fix/registry-auth-tokens

# Documentation branches
docs/security-integration-guide
docs/department-structure-update

# Refactoring branches
refactor/pattern-system-optimization
refactor/multi-workspace-build

# Department-specific branches
dept/communications-hub-update
dept/technology-dns-optimization
dept/security-scanner-enhancement
```

## 📚 Resources and Training

### Required Reading

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [How to Write a Git Commit Message](https://chris.beams.io/posts/git-commit/)
- [Fire22 Commit Template](.gitmessage)
- [Fire22 Department Structure](src/departments/data/departments.json)
- [Workspace Orchestration Guide](CLAUDE.md#workspace-orchestration)

### Tools and Extensions

- **VS Code**: GitLens extension for commit history visualization
- **Command Line**: git aliases for common commit operations
- **Browser**: GitHub/GitLab integrations for commit context

### Git Configuration

```bash
# Set up useful aliases
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.visual '!gitk'

# Set commit template
git config commit.template .gitmessage

# Set default editor
git config core.editor "code --wait"

# Enable GPG signing (required for Fire22)
git config --global commit.gpgsign true
git config --global user.signingkey [YOUR_GPG_KEY_ID]
git config --global gpg.program gpg

# Set up co-author trailers for collaboration
git config --global trailer.co-authored-by.key "Co-authored-by"
```

## 🏆 Quality Goals

### Team Metrics (Monthly Review)

- [ ] 95%+ commits follow conventional format
- [ ] Average commit message quality score > 8/10
- [ ] Zero commits containing sensitive information
- [ ] 80%+ commits include proper context/reasoning

### Individual Goals

- [ ] Write clear, descriptive commit messages
- [ ] Include context for non-obvious changes
- [ ] Reference related issues and documentation
- [ ] Follow atomic commit principles

---

**Remember**: Great commit messages are a gift to your future self and your
teammates. Take the time to write them well!

**Last Updated**: August 2025  
**Commit Standards Version**: 4.0.0  
**Team**: Fire22 Development Team **Departments**: 11 active departments with
specialized scopes
