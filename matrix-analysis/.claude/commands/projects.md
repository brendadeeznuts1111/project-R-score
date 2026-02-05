# /projects - Project Manager

Manage git projects, repos, remotes, and tasks across workspace with Bun-native APIs.

## Quick Reference

### 📊 Status & Overview
| Command | Flag | Description |
|---------|------|-------------|
| `/projects status` | | Full status all projects |
| `/projects status` | `--problems` | Only projects with issues |
| `/projects status` | `--stale` | Only stale projects (7+ days) |
| `/projects summary` | | Quick overview dashboard |
| `/projects matrix` | | 53-column enterprise dashboard |

### 🔄 Git Operations
| Command | Flag | Description |
|---------|------|-------------|
| `/projects push` | `--all` | Push all projects |
| `/projects pull` | `--all --rebase` | Pull all with rebase |
| `/projects sync` | `--all` | Full sync (stash+pull+push) |
| `/projects commit` | `-a "msg"` | Stage and commit |
| `/projects branch` | `--list` | List all branches |

### 🔒 Lockfile Management
| Command | Flag | Description |
|---------|------|-------------|
| `/projects lockfile` | `--status` | Lockfile status all projects |
| `/projects lockfile` | `--setup` | Generate bun.lock for all |
| `/projects lockfile` | `--matrix` | Enhanced matrix view |
| `/projects lockfile` | `--clean` | Remove package-lock.json |
| `/projects lockfile` | `--migrate` | Migrate npm → bun |

### 🔧 Project Management
| Command | Args | Description |
|---------|------|-------------|
| `/projects open` | `<name>` | Fuzzy match and open |
| `/projects clean` | `--dry-run` | Preview cleanup |
| `/projects health` | | Project health report |

### 🎛️ Display Flags
| Flag | Output | Description |
|------|--------|-------------|
| `--table` | `Bun.inspect.table()` | Formatted table (default) |
| `--json` | JSON | Machine-readable |
| `--short` | Compact | One-line per project |
| `--verbose` | Detailed | Full output |

### 🏷️ Filtering
| Flag | Pattern | Description |
|------|---------|-------------|
| `--filter` | `<name>` | Filter by project name |
| `--branch` | `<name>` | Filter by branch |
| `--problems` | | Only with issues |
| `--stale` | | Only stale (7+ days) |

### ⚡ Quick Combos
```bash
/projects status --problems --table   # Issues in table format
/projects sync --all                  # Morning sync routine
/projects lockfile --matrix --filter "arb*"  # Filtered matrix
```

## Commands

| Command | Description | Bun APIs Used |
|---------|-------------|---------------|
| `status` | Show all projects with git status | `Bun.spawn`, `Bun.$` |
| `summary` | Quick overview dashboard | `Bun.inspect.table` |
| `matrix` | 53-column enterprise dashboard | `Bun.inspect.table`, `Bun.Cookie` |
| `lockfile` | Manage bun.lock across projects | `Bun.spawn`, `Bun.file`, `Bun.inspect.table` |
| `push` | Push commits (one or all) | `Bun.spawn` |
| `pull` | Pull updates (one or all) | `Bun.spawn` |
| `open` | Navigate to project | `Bun.file` |
| `commit` | Stage and commit changes | `Bun.spawn`, `Bun.$` |
| `remote` | Manage git remotes | `Bun.spawn` |
| `branch` | Manage branches | `Bun.spawn` |
| `sync` | Full sync (stash+pull+push) | `Bun.spawn`, `Bun.$` |
| `clean` | Clean working directories | `Bun.file`, `Bun.$` |
| `health` | Project health report | `Bun.nanoseconds` |

## Feature Flags

```bash
# Display options
--short           # Compact view
--verbose         # Detailed output
--json            # JSON output
--table           # Bun.inspect.table() output

# Filtering
--problems        # Only projects with issues
--filter=<name>   # Filter by project name
--branch=<name>   # Filter by branch
--stale           # Only stale projects

# Git options
--rebase          # Use rebase for pull
--force           # Skip confirmations
--dry-run         # Preview only
--all             # Apply to all projects
```

## Output Formats

```bash
--format=table    # Bun.inspect.table() (default)
--format=json     # Machine-readable JSON
--format=short    # Compact one-line per project
--format=matrix   # Full 53-column matrix
```

## Workflow Examples

### Morning Sync Routine

```bash
/projects status --problems
/projects pull --all --rebase
/projects push --all
```

Output:
```
📊 Projects Status (3 with issues)

┌───┬─────────────────────┬──────────┬───────────┬───────────────┐
│   │ Project             │ Branch   │ Status    │ Remote        │
├───┼─────────────────────┼──────────┼───────────┼───────────────┤
│ 0 │ trader-analyzer     │ main     │ 3 mod     │ ⬆️ Ahead 5    │
│ 1 │ kal-poly-bot        │ feat/x   │ Clean     │ ⬇️ Behind 2   │
│ 2 │ registry-powered    │ main     │ 1 staged  │ ✅ Up to date │
└───┴─────────────────────┴──────────┴───────────┴───────────────┘

Pulling all projects with rebase...
✅ trader-analyzer: Already up to date
✅ kal-poly-bot: Pulled 2 commits
✅ registry-powered: Already up to date

Pushing all projects...
✅ trader-analyzer: Pushed 5 commits
```

### Before Commit Workflow

```bash
/projects status
/projects commit -a "feat: add new feature"
/projects push
```

### End of Day Sync

```bash
/projects sync --all
```

Output:
```
🔄 Full Sync (12 projects)

1/12 trader-analyzer
     Stashing 3 changes...
     Pulling with rebase...
     Applying stash...
     Pushing 2 commits...
     ✅ Done

2/12 kal-poly-bot
     No local changes
     Pulling with rebase...
     Nothing to push
     ✅ Done

...
```

### Clean Working Directories

```bash
/projects clean --dry-run
```

Output:
```
🧹 Clean Preview

trader-analyzer:
  Would remove: node_modules/ (245 MB)
  Would remove: dist/ (12 MB)
  Would remove: .cache/ (8 MB)

kal-poly-bot:
  Would remove: node_modules/ (189 MB)
  Would remove: build/ (24 MB)

Total: 478 MB would be freed

Run without --dry-run to apply
```

## Matrix Dashboard

The `matrix` command provides an enterprise-grade 53-column dashboard using `Bun.inspect.table()`, `Bun.Cookie`, and `URLPattern`.

### Quick Start

```bash
/projects matrix
# Or run directly:
bun run ~/.claude/scripts/projects-matrix.ts
```

### Column Categories

| Category | Count | Columns |
|----------|-------|---------|
| **Identity** | 4 | idx, name, branch, pkgVersion |
| **Git Status** | 9 | statusIcon, staged, modified, untracked, deleted, totalChanges, remoteIcon, ahead, behind |
| **Commit Info** | 3 | lastCommit, lastCommitDate, totalCommits |
| **File Stats** | 5 | tsFiles, jsFiles, jsonFiles, totalFiles, diskSize |
| **Dependencies** | 2 | deps, devDeps |
| **Profiles** | 11 | firstName, lastName, teamName, authorName, authorEmail, githubUser, pkgAuthor, pkgMaintainer, sshHost, profilePattern, remoteShort |
| **URLPattern** | 5 | patternMatch, patOwner, patRepo, projectUrl, hasRegExpGroups |
| **Cookie** | 6 | cookieName, cookieValue, cookiePath, cookieSecure, cookieSameSite, cookieMaxAge |
| **Computed** | 8 | healthScore, healthBar, priority, needsPush, needsPull, stale, randomId, timestamp |

### Profile Columns

| Column | Description | Example |
|--------|-------------|---------|
| `firstName` | First word of git author | "DuoPlus" |
| `lastName` | Last word of git author | "Team" |
| `teamName` | Full name if 3+ words | "DuoPlus Dev Team" |
| `authorName` | Git user.name per project | "John Doe" |
| `authorEmail` | Email prefix | "dev" (from dev@company.com) |
| `githubUser` | GitHub username | "johndoe" |
| `sshHost` | SSH host alias | "github.com-personal" |
| `profilePattern` | Active profile | "personal" |
| `remoteShort` | Profile indicator | "🔑 personal" |

### Health Scoring

```
healthScore = 100 - (staged × 5) - (modified × 3) - (untracked × 2)
```

| Score | Health Bar | Priority |
|-------|------------|----------|
| 90-100 | ████████ | ✅ OK |
| 70-89 | ██████░░ | 📝 LOW |
| 50-69 | ████░░░░ | ⚠️ MED |
| < 50 | ██░░░░░░ | 🔥 HIGH |

### Matrix Features

- Health scoring (0-100) based on uncommitted changes
- Priority flags: 🔥 HIGH, ⚠️ MED, 📝 LOW, ✅ OK
- Cookie-based state tracking per project (dirty/unpushed/clean)
- URLPattern matching for GitHub URLs
- Git profile detection with directory-based patterns
- SSH host alias tracking for multi-account setups
- Stale detection for old commits (> 7 days)

## Bun-Native Integrations

### Using Bun.spawn for Git

```typescript
import { $ } from "bun";

// Git status
const status = await $`git -C ${projectPath} status --porcelain`.text();

// Get remote info
const ahead = await $`git -C ${projectPath} rev-list HEAD...@{u} --count`.text();
```

### Using Bun.inspect.table

```typescript
const projects = await getProjectsStatus();

const formatted = projects.map((p, i) => ({
  "#": i + 1,
  "Project": `${p.icon} ${p.name}`,
  "Branch": p.branch,
  "Status": `${p.statusIcon} ${p.status}`,
  "Health": "█".repeat(p.health / 12.5) + "░".repeat(8 - p.health / 12.5),
}));

console.log(Bun.inspect.table(formatted, { colors: true }));
```

### Using URLPattern for Remote Matching

```typescript
const githubPattern = new URLPattern(
  "https://github.com/:owner/:repo{.git}?",
  "https://github.com"
);

const match = githubPattern.exec(remote);
if (match) {
  const { owner, repo } = match.pathname.groups;
  // owner: "username", repo: "project-name"
}
```

### Using Bun.Cookie for State

```typescript
const cookie = new Bun.Cookie("project_state", JSON.stringify({
  lastSync: Date.now(),
  status: "clean",
  branch: "main"
}), {
  maxAge: 86400, // 24 hours
  path: "/projects"
});
```

### Using Core Logger

```typescript
import { log } from "@dev-hq/core";

log.info("Sync started", { projects: projectCount });
log.warn("Stale project", { name, lastCommit });
log.error("Push failed", { name, error });
```

## Configuration

### ~/.claude/projects.json

```json
{
  "projectsDir": "~/Projects",
  "autoDiscover": true,
  "maxDepth": 3,
  "ignore": [
    "node_modules",
    ".git",
    "dist"
  ],
  "profiles": {
    "personal": {
      "sshHost": "github.com-personal",
      "email": "*@gmail.com"
    },
    "work": {
      "sshHost": "github.com-work",
      "email": "*@company.com"
    }
  },
  "thresholds": {
    "staleAfterDays": 7,
    "healthWarning": 70,
    "healthCritical": 50
  },
  "sync": {
    "defaultRebase": true,
    "autoStash": true,
    "pushAfterPull": false
  }
}
```

### bunfig.toml Integration

```toml
[projects]
# Discovery
projectsDir = "~/Projects"
maxDepth = 3
autoDiscover = true

# Sync behavior
defaultRebase = true
autoStash = true

# Thresholds
staleAfterDays = 7
healthWarning = 70
```

## Integration with Other Skills

| Skill | Integration |
|-------|-------------|
| `/diagnose` | Project health feeds into diagnosis |
| `/analyze` | Code analysis per project |
| `/pm` | Dependency status across projects |

## Related Commands

```bash
/diagnose health       # Overall health including projects
/analyze scan          # Code analysis
/pm outdated --all     # Outdated deps across projects
```

## Multi-Account Git Setup

For users with multiple GitHub accounts (personal/work):

### SSH Config

```bash
# ~/.ssh/config
Host github.com-personal
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_personal

Host github.com-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_work
```

### Git Config with includeIf

```bash
# ~/.gitconfig
[user]
  name = Default Name
  email = default@email.com

[includeIf "gitdir:~/Projects/personal/"]
  path = ~/.gitconfig-personal

[includeIf "gitdir:~/Projects/work/"]
  path = ~/.gitconfig-work
```

### Per-Profile Configs

```bash
# ~/.gitconfig-personal
[user]
  name = Personal Name
  email = personal@gmail.com
[github]
  user = personal-username

# ~/.gitconfig-work
[user]
  name = Work Name
  email = work@company.com
[github]
  user = work-username
```

## CLI Options Reference

```bash
# Status options
--problems            # Only show projects with issues
--stale               # Only show stale projects
--branch=<name>       # Filter by branch name

# Sync options
--all                 # Apply to all projects
--rebase              # Use rebase for pull
--no-stash            # Don't auto-stash
--force               # Skip confirmations

# Lockfile options
--status              # Show lockfile status across projects
--setup               # Generate bun.lock (runs bun install)
--matrix              # Enhanced matrix view with health scores
--clean               # Remove package-lock.json files
--migrate             # Migrate from npm/yarn to bun
--dry-run             # Preview lockfile changes
--workspace           # Filter to workspace projects only

# Clean options
--node-modules        # Only clean node_modules
--dist                # Only clean dist/build dirs
--cache               # Only clean cache dirs

# Output options
--json                # JSON output
--table               # Bun.inspect.table()
--short               # Compact view
--verbose             # Detailed output
```

## Bun Install CLI Reference

Core `bun install` flags used by lockfile operations:

### Project Files & Lockfiles

| Flag | Alias | Description |
|------|-------|-------------|
| `--save` | | Save to package.json (default: true) |
| `--no-save` | | Don't update package.json or save lockfile |
| `--frozen-lockfile` | | Disallow changes to lockfile (CI mode) |
| `--save-text-lockfile` | | Save text-based lockfile (bun.lock) |
| `--lockfile-only` | | Generate lockfile without installing |
| `--yarn` | `-y` | Also write yarn.lock (v1 format) |
| `--trust` | | Add to trustedDependencies + install |

### Installation Control

| Flag | Alias | Description |
|------|-------|-------------|
| `--production` | `-p` | Skip devDependencies |
| `--optional` | | Install optionalDependencies |
| `--no-optional` | | Skip optionalDependencies |
| `--force` | `-f` | Reinstall all dependencies |
| `--dry-run` | | Preview without installing |

### Backend & Performance

| Flag | Description |
|------|-------------|
| `--backend clonefile` | macOS copy-on-write (fastest) |
| `--backend hardlink` | Linux shared inodes |
| `--backend symlink` | Symbolic links (debugging) |
| `--backend copyfile` | Full copy (slowest) |

### CI/CD Usage

```bash
bun ci                    # Equivalent to --frozen-lockfile
bun install --frozen-lockfile  # Same behavior
```

## Lockfile Matrix Columns

The `lockfile --matrix` command provides a 12-column health dashboard:

| Column | Description | Example |
|--------|-------------|---------|
| `#` | Index | 0, 1, 2... |
| `Project` | Status icon + name | 🆕 grok-secuirty |
| `Ver` | Package version | 1.0.0 |
| `Pkgs` | Dependency count | 38 |
| `Lock` | Lockfile size + tier | 🔒 4.6KB |
| `Disk` | Project disk usage | 15M |
| `WS` | Workspace indicator | 📦 or — |
| `Git` | Git tracking | ✓ or ✗ |
| `Health` | Visual health bar | ████████ |
| `Score` | Numeric health (0-100) | 100 |
| `Priority` | Status flag | ✅ OK |
| `Action` | Operation performed | bun.lock created |

### Status Icons

| Icon | Status | Description |
|------|--------|-------------|
| 🆕 | Created | New bun.lock generated |
| 📭 | No deps | No dependencies (OK) |
| 🔄 | Migrated | Converted from npm/yarn |
| 🧹 | Cleaned | Removed duplicate lockfile |

### Lock Size Tiers

| Icon | Size | Description |
|------|------|-------------|
| 🔒 | < 5KB | Small lockfile |
| 🔐 | 5-20KB | Medium lockfile |
| 🗄️ | > 20KB | Large lockfile |

### Health Scoring

```
healthScore = 100 - (no-deps × 15) - (no-git × 15) + (migrated × 5)
```

| Score | Health Bar | Priority |
|-------|------------|----------|
| 90-100 | ████████ | ✅ OK |
| 70-89 | ██████░░ | 📝 LOW |
| 50-69 | ████░░░░ | ⚠️ MED |
| < 50 | ██░░░░░░ | 🔥 HIGH |
