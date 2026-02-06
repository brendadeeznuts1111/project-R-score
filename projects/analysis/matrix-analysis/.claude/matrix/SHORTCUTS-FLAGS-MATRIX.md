# 🔥 Tier-1380 OMEGA: Shortcuts, Flags & Matrix Reference

> Complete reference for the matrix:cols CLI using Bun's native utilities

## 🚀 Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│  Tier-1380 OMEGA Column Standards CLI v3.29.0                   │
├─────────────────────────────────────────────────────────────────┤
│  bun matrix:cols get 45       → Column 45 details               │
│  bun matrix:cols tension      → Tension zone (31-45)            │
│  bun matrix:cols search url   → Fuzzy search                    │
│  bun matrix:cols find zone=tension type=float → Multi-filter    │
│  bun matrix:cols pipe tsv     → Export TSV                      │
│  bun matrix:cols --json       → JSON output                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⌨️ Shortcuts

### Zone Shortcuts (Built-in)

| Shortcut | Command | Zone | Range | Emoji |
|----------|---------|------|-------|-------|
| `tension` | `list tension` | Tension | 31-45 | 🟠 |
| `cloudflare` | `list cloudflare` | Cloudflare | 21-30 | 🟣 |
| `chrome` | `list chrome` | Chrome | 71-75 | 🔷 |
| `core` | `list core` | Core | 1-10 | 🔵 |
| `validation` | `list validation` | Validation | 61-75 | 🟡 |

**Usage:**
```bash
bun matrix:cols tension        # Show tension zone
bun matrix:cols cloudflare     # Show Cloudflare zone
```

### User-Defined Aliases

Configured in `column-standards-config.json`:

```json
{
  "aliases": {
    "t45": "get 45",
    "t31": "get 31",
    "cf": "cloudflare",
    "prof": "find has=profileLink"
  }
}
```

**Usage:**
```bash
bun matrix:cols t45            # → get 45
bun matrix:cols cf             # → cloudflare
bun matrix:cols prof           # → find has=profileLink
```

### Named Column Shortcuts

```json
{
  "shortcuts": {
    "tension-profile": 45,
    "anomaly-score": 31,
    "chrome-cookie": 71
  }
}
```

Access via favorites or interactive mode.

---

## 🚩 Flags Reference

### Global Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--json` | Output as JSON | `cols get 45 --json` |
| `--help, -h` | Show help | `cols --help` |
| `--version, -v` | Show version | `cols --version` |
| `--no-color` | Disable colors | `cols list --no-color` |

### Command-Specific Options

#### `list [filter]`
```bash
cols list                    # All columns
cols list tension            # Filter by zone
cols list url                # Filter by type
cols list platform           # Filter by owner
```

#### `get <col>`
```bash
cols get 45                  # Column 45 details
cols get 45 --json           # Raw JSON output
cols get tension-profile     # Via shortcut (if configured)
```

#### `search <term>`
```bash
cols search profile          # Search all fields
cols search url --json       # JSON results array
```

#### `find <criteria>`
```bash
cols find zone=tension                    # Single criterion
cols find zone=tension required=true      # Multiple criteria
cols find owner=platform type=url         # Type filter
cols find has=profileLink                 # Property exists
```

**Available Criteria:**
- `zone=<name>` - Zone name (tension, cloudflare, etc.)
- `owner=<team>` - Owner team (runtime, platform, etc.)
- `type=<type>` - Data type (string, url, float, etc.)
- `required=true|false` - Required flag
- `has=<property>` - Has specific property (profileLink, uriPattern, etc.)

#### `pipe <format>`
```bash
cols pipe tsv        # Tab-separated values
cols pipe csv        # Comma-separated values
cols pipe names      # Column names only
cols pipe ids        # Column IDs only
cols pipe grep-tags  # Grep tag patterns
cols pipe env        # Environment variables
```

#### `fav [action]`
```bash
cols fav             # Show favorites
cols fav add 45      # Add to favorites
cols fav remove 45   # Remove from favorites
```

#### `config [action]`
```bash
cols config show                    # Show config
cols config set cli.colors false    # Set option
cols config reset                   # Reset defaults
```

---

## 📊 The Matrix (97 Columns)

### Zone Map

```
 0       ⚪ DEFAULT
 1-10    🔵 CORE (Runtime)
11-20    🔴 SECURITY
21-30    🟣 CLOUDFLARE (Platform)
31-45    🟠 TENSION
46-60    🟢 INFRA
61-70    🟡 VALIDATION
71-75    🔷 CHROME (Platform)
76-88    ⚪ EXTENSIBILITY
89-95    📝 SKILLS
96       ⚪ DEFAULT (trailing)
```

### Full Matrix Grid

View with: `bun matrix:cols matrix`

| Row | +0 | +1 | +2 | +3 | +4 | +5 | +6 | +7 | +8 | +9 |
|-----|----|----|----|----|----|----|----|----|----|----|
| 0 | ⚪0 | 🔵1 | 🔵2 | 🔵3 | 🔵4 | 🟢5 | 🔵6 | 🔵7 | 🔵8 | 🔵9 |
| 10 | 🔵10 | 🔴11 | 🔴12 | 🔴13 | 🔴14 | 🔴15 | 🔴16 | 🔴17 | 🔴18 | 🔴19 |
| 20 | 🔴20 | 🟣21 | 🟣22 | 🔴23 | 🟣24 | 🟣25 | 🟣26 | 🟣27 | 🔴28 | 🔴29 |
| 30 | 🟣30 | 🟠31 | 🟠32 | 🟠33 | 🟠34 | 🟠35 | 🟠36 | 🟠37 | 🟠38 | 🟠39 |
| 40 | 🟠40 | 🟠41 | 🟠42 | 🟠43 | 🟠44 | 🟠45 | 🟢46 | 🟢47 | 🟢48 | 🟢49 |
| 50 | 🟢50 | 🟢51 | 🟢52 | 🟢53 | 🟢54 | 🟢55 | 🟢56 | 🟢57 | 🟢58 | 🟢59 |
| 60 | 🟢60 | 🟡61 | 🟡62 | 🟡63 | 🟡64 | 🟡65 | 🟡66 | 🟡67 | 🟡68 | 🟡69 |
| 70 | 🟡70 | 🔷71 | 🔷72 | 🔷73 | 🔷74 | 🔷75 | ⚪76 | ⚪77 | ⚪78 | ⚪79 |
| 80 | ⚪80 | ⚪81 | ⚪82 | ⚪83 | ⚪84 | ⚪85 | ⚪86 | ⚪87 | ⚪88 | 📝89 |
| 90 | 📝90 | 📝91 | 📝92 | 📝93 | 📝94 | 📝95 | ⚪96 | - | - | - |

### Zone Details

| Zone | Range | Count | Team | Emoji | Description |
|------|-------|-------|------|-------|-------------|
| DEFAULT | 0, 96 | 2 | infra | ⚪ | Context-dependent default |
| CORE | 1-10 | 10 | runtime | 🔵 | Runtime/header invariants |
| SECURITY | 11-20 | 10 | security | 🔴 | Security policy & audit |
| CLOUDFLARE | 21-30 | 10 | platform | 🟣 | Edge telemetry |
| TENSION | 31-45 | 15 | tension | 🟠 | Anomaly detection |
| INFRA | 46-60 | 15 | infra | 🟢 | Infrastructure metrics |
| VALIDATION | 61-70 | 10 | validation | 🟡 | Quality gates |
| CHROME | 71-75 | 5 | platform | 🔷 | Chrome state |
| EXTENSIBILITY | 76-88 | 13 | infra | ⚪ | Profile links |
| SKILLS | 89-95 | 7 | skills | 📝 | Skill tracking |

---

## 🔧 Bun Utilities Used

### `Bun.inspect.table()`

Used for beautiful tabular output:

```typescript
// In the CLI code:
function displayTable(data: Record<string, unknown>[], columns?: string[]): void {
  const tableConfig = columns
    ? { columns: columns.reduce((acc, col) => ({ ...acc, [col]: { title: col } }), {}) }
    : undefined;
  console.log(Bun.inspect.table(data, tableConfig));
}
```

**Used in:**
- `stats` - Distribution statistics
- `matrix` - Grid view
- `shortcuts` - Alias listing
- `flags` - Flag documentation
- `doctor` - Environment check

### `Bun.which()`

Used for dependency detection:

```typescript
// In the CLI code:
function checkCommand(cmd: string): { exists: boolean; path: string | null } {
  const path = Bun.which(cmd);
  return { exists: path !== null, path };
}
```

**Used in:**
- `doctor` - Check for jq, rg, fzf, bat, delta

---

## 🎯 Command Combinations

### Scripting Patterns

```bash
# Get column names as array
bun matrix:cols pipe names | jq -R -s -c 'split("\n")[:-1]'

# Find all URL columns and export to TSV
bun matrix:cols find type=url --json | jq -r '.[] | [.index, .name, .zone] | @tsv'

# Check if jq is available, fallback to raw JSON
if bun matrix:cols doctor | grep -q "jq.*✅"; then
  bun matrix:cols stats --json | jq '.byZone'
else
  bun matrix:cols stats --json
fi
```

### Pipe Chains

```bash
# Export columns, filter with rg, format with awk
bun matrix:cols pipe tsv | rg "tension" | awk -F'\t' '{print $1, $2}'

# Get all profile links, convert to env vars
bun matrix:cols find has=profileLink --json | jq -r '.[] | "export COL_\(.index)=\(.name)"'

# Stats to CSV via jq
bun matrix:cols stats --json | jq -r '.byZone | to_entries[] | [.key, .value] | @csv'
```

---

## 📝 Cheat Sheet

```bash
# Navigation
bun matrix:cols                    # List all
bun matrix:cols get 45             # Column details
bun matrix:cols tension            # Zone view
bun matrix:cols matrix             # Grid view

# Search & Filter
bun matrix:cols search profile     # Fuzzy search
bun matrix:cols find zone=tension  # Filter
bun matrix:cols find type=url required=true  # Multi-filter

# Output
bun matrix:cols pipe tsv           # TSV export
bun matrix:cols get 45 --json      # JSON output
bun matrix:cols export docs.md     # Markdown docs

# Interactive
bun matrix:cols interactive        # REPL mode
bun matrix:cols fav add 45         # Add favorite
bun matrix:cols shortcuts          # Show shortcuts

# Diagnostics
bun matrix:cols doctor             # Environment check
bun matrix:cols validate           # Schema validation
bun matrix:cols flags              # Flag reference

# Info
bun matrix:cols --version          # Version
bun matrix:cols --help             # Help
```

---

## 🔗 References

- **Bun Docs:** https://bun.sh/docs/runtime/utils
- **Main README:** [COLUMN-CLI-README.md](./COLUMN-CLI-README.md)
- **Quick Ref:** [QUICKREF-CLI.md](./QUICKREF-CLI.md)
