# Commit Message Conventions

This repository follows
[Conventional Commits](https://www.conventionalcommits.org/) specification for
commit messages.

## Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

## Types

| Type       | Description              | Example                                          |
| ---------- | ------------------------ | ------------------------------------------------ |
| `feat`     | New feature              | `feat(dashboard): add real-time metrics display` |
| `fix`      | Bug fix                  | `fix(api): resolve connection timeout issue`     |
| `docs`     | Documentation changes    | `docs(readme): update installation instructions` |
| `style`    | Code style changes       | `style(core): format with prettier`              |
| `refactor` | Code refactoring         | `refactor(pattern): simplify weaver logic`       |
| `perf`     | Performance improvements | `perf(build): optimize bundle size`              |
| `test`     | Test changes             | `test(api): add integration tests`               |
| `build`    | Build system changes     | `build(deps): upgrade bun to 1.2.20`             |
| `ci`       | CI/CD changes            | `ci(github): add staging deployment`             |
| `chore`    | Maintenance tasks        | `chore(scripts): cleanup unused files`           |
| `revert`   | Revert commits           | `revert: feat(dashboard): add metrics`           |
| `security` | Security fixes           | `security(auth): patch JWT vulnerability`        |
| `deps`     | Dependency updates       | `deps(core): update cloudflare workers`          |
| `release`  | Release commits          | `release: v3.0.9`                                |
| `hotfix`   | Critical fixes           | `hotfix(api): emergency rate limit fix`          |

## Scopes

### Workspace Scopes

- `core` - Core dashboard functionality
- `pattern` - Pattern system
- `api` - API client
- `betting` - Sports betting
- `telegram` - Telegram integration
- `build` - Build system

### Component Scopes

- `dashboard` - Dashboard UI
- `worker` - Cloudflare Worker
- `db` - Database
- `auth` - Authentication
- `cache` - Caching
- `queue` - Queue system
- `p2p` - P2P functionality

### Infrastructure Scopes

- `cf` - Cloudflare specific
- `monitoring` - Monitoring
- `logging` - Logging
- `docker` - Docker config
- `k8s` - Kubernetes

### Development Scopes

- `lint` - Linting
- `format` - Formatting
- `deps` - Dependencies
- `config` - Configuration
- `scripts` - Scripts
- `bench` - Benchmarks
- `docs` - Documentation
- `wiki` - Wiki

### Testing Scopes

- `unit` - Unit tests
- `integration` - Integration tests
- `e2e` - End-to-end tests
- `perf-test` - Performance tests

### CI/CD Scopes

- `ci` - CI pipeline
- `cd` - CD pipeline
- `release` - Release process
- `deploy` - Deployment

## Examples

### Feature Addition

```
feat(dashboard): add live wager tracking

Implements real-time wager tracking with SSE support
- Updates every 5 seconds
- Shows pending and completed wagers
- Adds filtering by agent

Closes #123
```

### Bug Fix

```
fix(api): handle rate limit errors gracefully

Previously the API would crash when hitting rate limits.
Now implements exponential backoff with retry logic.

Fixes #456
```

### Breaking Change

```
feat(api)!: update endpoint structure

BREAKING CHANGE: API endpoints have been restructured
- /api/v1/* -> /api/v2/*
- Response format changed to include metadata

Migration guide in docs/migration-v2.md
```

### Multiple Scopes

```
refactor(core,pattern): consolidate utility functions

Moved shared utilities from core to pattern workspace
for better code reuse across all workspaces.
```

## Commit Body

- Use the body to explain **what** and **why** vs. **how**
- Wrap at 100 characters
- Use bullet points for multiple items
- Reference issues and PRs

## Commit Footer

- Reference issues: `Closes #123`, `Fixes #456`
- Breaking changes: `BREAKING CHANGE: description`
- Co-authors: `Co-authored-by: Name <email>`
- Sign-offs: `Signed-off-by: Name <email>`

## Git Hooks

Install commit linting:

```bash
bun add -d @commitlint/cli @commitlint/config-conventional husky
bun husky install
bun husky add .husky/commit-msg 'bunx commitlint --edit $1'
```

## Interactive Commits

Use commitizen for interactive commits:

```bash
bun add -d commitizen cz-conventional-changelog
bun run commit  # Interactive commit prompt
```

## Automated Changelog

Commits following these conventions automatically generate:

- CHANGELOG.md entries
- Release notes
- Version bumps (semantic versioning)

## Tips

1. Keep the subject line under 50 characters
2. Use imperative mood ("add" not "added")
3. Don't end subject with period
4. Separate subject from body with blank line
5. Reference issues in footer
6. Group related changes in one commit
7. Keep commits atomic and focused
