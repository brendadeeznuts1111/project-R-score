# Contributing to Enterprise Dashboard

## Quick Start

```bash
# Clone and setup
git clone <repo>
cd enterprise-dashboard
bun install

# Install git hooks
bun run hooks:install

# Start development
bun run dev
```

## Commit Message Format

We use structured commit messages for automated changelog generation and easy searching.

### Format

```text
[DOMAIN][SCOPE][COMPONENT][ACTION] TICKET-XXX: Summary
```

### Example

```text
[API][ENDPOINT][AUTH][ADD] ONE-456: Add /api/auth/login endpoint

Tension: 0.2

Impact:
- New POST /api/auth/login endpoint for user authentication
- Returns JWT token on success

Why:
- Users need to authenticate before accessing protected resources

How:
- Added bcrypt password verification
- JWT token generation with 24h expiry

Co-authored-by: Claude Opus 4.5 <noreply@anthropic.com>
```

### Tags Reference

#### DOMAIN (required)

| Tag | Description | Examples |
|-----|-------------|----------|
| `API` | Backend endpoints, routes, middleware | `/api/*` handlers |
| `UI` | React components, client code, styles | Dashboard tabs, components |
| `NETWORK` | Network utilities, fetch, DNS | Connection pooling, DNS cache |
| `SECURITY` | Auth, secrets, validation | JWT, password hashing |
| `CONFIG` | Configuration files | bunfig.toml, tsconfig |
| `ADAPTER` | External integrations | S3, Redis, databases |
| `MATRIX` | Analytics dashboards | Monitoring views |
| `PTY` | Terminal handling | Shell integration |
| `UTILS` | Shared utilities | Helper functions |
| `CORE` | Core infrastructure | Types, base classes |
| `DB` | Database operations | Queries, migrations |
| `SCRIPT` | Build scripts, CLI tools | automation scripts |
| `TEST` | Test files | Tests, fixtures, mocks |
| `DOCS` | Documentation | README, guides |

#### SCOPE (required)

| Tag | Description |
|-----|-------------|
| `ENDPOINT` | API endpoints |
| `TAB` | Dashboard tabs/views |
| `QUERY` | Database queries |
| `ROUTER` | Routing logic |
| `HANDLER` | Request/event handlers |
| `VALIDATOR` | Input validation |
| `MATRIX` | Matrix/grid components |
| `UTILS` | Utility functions |
| `CORE` | Core modules |
| `HOOK` | React hooks |
| `COMPONENT` | React components |
| `SERVICE` | Backend services |
| `MODEL` | Data models |
| `BENCH` | Benchmarks |
| `FIXTURE` | Test fixtures |

#### ACTION (required)

| Tag | Description |
|-----|-------------|
| `ADD` | New feature or file |
| `FIX` | Bug fix |
| `REFACTOR` | Code restructuring (no behavior change) |
| `OPTIMIZE` | Performance improvement |
| `REMOVE` | Delete feature or file |
| `UPDATE` | Modify existing feature |
| `TEST` | Add or update tests |
| `CHORE` | Maintenance tasks |
| `DOCS` | Documentation updates |
| `STYLE` | Formatting changes |
| `SECURITY` | Security-related changes |

### Searching Commits

```bash
# By domain
git log --grep="\[API\]"

# By action
git log --grep="\[FIX\]"

# By ticket
git log --grep="ONE-123"

# By grepable tag (auto-generated)
git log --grep="\[api-endpoint-fix\]"

# Combined
git log --grep="\[API\].*\[FIX\]"
```

## Development Workflow

### Running the Server

```bash
# Development with HMR
bun run dev

# Production
bun run start
```

### Testing

```bash
# Run all tests
bun test

# Watch mode
bun test --watch

# With coverage
bun test --coverage
```

### Type Checking

```bash
# Single run
bun run typecheck

# Watch mode
bun run typecheck:watch
```

### Code Quality

The pre-commit hook automatically runs:
- TypeScript syntax check on staged files
- Console.log detection (warning)
- Secret detection (blocks commit)

## Project Structure

```text
enterprise-dashboard/
├── src/
│   ├── client/           # React frontend
│   │   ├── components/   # Reusable components
│   │   ├── config/       # Client configuration
│   │   └── __tests__/    # Client tests
│   ├── server/           # Bun backend
│   │   ├── index.ts      # Server entry point
│   │   ├── db.ts         # SQLite operations
│   │   └── network.ts    # Network utilities
│   └── types.ts          # Shared types
├── scripts/              # Build & utility scripts
│   ├── hooks/            # Git hooks
│   └── bench/            # Benchmarks
├── public/               # Static assets
└── data/                 # SQLite database
```

## Git Hooks

### Installing Hooks

```bash
bun run hooks:install
```

This installs:
- `pre-commit`: TypeScript syntax check, secret detection
- `commit-msg`: Message format validation

### Hook Files

Located in `scripts/hooks/`:
- `pre-commit` - Fast checks before commit
- `commit-msg` - Message format validation

## Pull Request Process

1. Create a feature branch from `main`
2. Make changes with properly formatted commits
3. Run tests: `bun test`
4. Run type check: `bun run typecheck`
5. Push and create PR
6. Address review feedback
7. Squash and merge when approved

## Performance Guidelines

- Use `Promise.all()` for independent async operations
- Prefer `Response.json()` over `new Response(JSON.stringify())`
- Use `Bun.file()` for file operations (auto Content-Type)
- Prefetch DNS with `dns.prefetch()` for known hosts
- Use SQLite `UNION ALL` instead of multiple COUNT queries
