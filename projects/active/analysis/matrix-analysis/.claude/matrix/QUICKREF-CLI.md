# 🔥 matrix:cols Quick Reference

## One-Liners

```bash
# Explore
bun matrix:cols get 45                    # Column details
bun matrix:cols tension                   # Zone view
bun matrix:cols search profile            # Fuzzy search
bun matrix:cols find zone=tension type=url # Multi-filter

# Script
bun matrix:cols pipe tsv > cols.tsv       # Export TSV
bun matrix:cols get 45 --json | jq '.'    # JSON output
bun matrix:cols stats --json | jq '.byZone' # Stats JSON

# Config
bun matrix:cols fav add 45                # Add favorite
bun matrix:cols fav                       # Show favorites
bun matrix:cols config show               # View config

# Advanced
bun matrix:cols interactive               # REPL mode
bun matrix:cols preview 45                # Clickable links
bun matrix:cols export docs/cols.md       # Markdown docs
bun matrix:cols watch                     # Live reload
```

## Zone Map

```
 0      ⚪ default
 1-10   🔵 core
11-20   🔴 security
21-30   🟣 cloudflare
31-45   🟠 tension
46-60   🟢 infra
61-70   🟡 validation
71-75   🔷 chrome
76-88   ⚪ extensibility
89-95   📝 skills
96      ⚪ default (trailing)
```

## Find Criteria

```bash
zone=<name>         # default, core, tension, cloudflare...
owner=<team>        # runtime, platform, tension, infra...
type=<type>         # string, url, float, enum, boolean...
required=true       # Only required columns
has=<property>      # Columns with property (e.g., profileLink)
```

## Pipe Formats

| Format | Use Case |
|--------|----------|
| `tsv` | Spreadsheets, awk |
| `csv` | Excel, data tools |
| `names` | Simple lists |
| `ids` | Numeric IDs only |
| `grep-tags` | Log searching |
| `env` | Environment variables |

## Aliases (Built-in)

| Alias | Command |
|-------|---------|
| `t45` | `get 45` |
| `t31` | `get 31` |
| `cf` | `cloudflare` |
| `prof` | `find has=profileLink` |

Add more in `column-standards-config.json`.

## Interactive Mode

```bash
$ bun matrix:cols interactive
matrix> 45
matrix> tension
matrix> search url
matrix> find type=float
matrix> exit
```

## Tab Completion

```bash
source matrix/column-standards-completion.bash

# Then:
bun matrix:cols get <TAB>    # 0-96
bun matrix:cols list <TAB>   # zones, types
bun matrix:cols pipe <TAB>   # formats
```

## JSON Everywhere

Append `--json` to any command for scriptable output:

```bash
bun matrix:cols list --json
bun matrix:cols get 45 --json
bun matrix:cols find zone=tension --json | jq '.[].name'
```
