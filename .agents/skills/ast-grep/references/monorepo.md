# Monorepo map — `/Users/nolarose/Projects`

Curated ast-grep targets for this workspace. Run via helper `map` or one-off `outline`/`search`.

## Quick orientation

```bash
AG=.agents/skills/ast-grep/scripts/ast_grep_helper.py

python3 $AG map                          # all targets in repo-map.json
python3 $AG map --only sports-terminal   # filter by name substring
python3 $AG scan --config .agents/skills/ast-grep/sgconfig.yml \
  --path projects/active/sports-terminal-os/src
```

## High-value outline paths

| Area | Path | Why |
|---|---|---|
| Sports terminal API | `projects/active/sports-terminal-os/src/api` | Route handlers, proxy endpoints |
| Sports terminal services | `projects/active/sports-terminal-os/src/services` | Domain logic, WS handlers |
| Sports terminal entry | `projects/active/sports-terminal-os/src/index.ts` | `Bun.serve`, boot wiring |
| Kimi sports plugin | `kimi-plugin/sports-odds-plugin/scripts` | Odds/scores CLI scripts |
| Agent skills | `.agents/skills` | SKILL.md workflows (markdown — use rg for prose) |
| Shared constants | `kimi-plugin/shared` | Cross-plugin types/constants |

## Verified search patterns (this repo)

```bash
# Bun HTTP servers
python3 $AG search 'Bun.serve($$$)' --path projects/active/sports-terminal-os --lang ts

# Structured loggers
python3 $AG search 'createLogger($$$)' --path projects/active/sports-terminal-os/src --lang ts

# Outbound fetch (plugin + services)
python3 $AG search 'fetch($$$)' --path kimi-plugin/sports-odds-plugin --lang ts

# WebSocket clients
python3 $AG search 'new WebSocket($$$)' --path projects/active/sports-terminal-os --lang ts

# Route table shape (router.ts)
python3 $AG outline projects/active/sports-terminal-os/src/api/router.ts --view digest
```

## Scan rules (bundled)

| Rule | File | Finds |
|---|---|---|
| `no-console-log` | `rules/no-console-log.yml` | `console.*($$$)` |
| `no-as-any` | `rules/no-as-any.yml` | `$EXPR as any` |

Preview only unless you pass `--apply` to `scan`.

## Agent workflow for unfamiliar zones

1. `python3 $AG map --only <zone>` — symbol names without reading every file
2. `outline --view digest` on the 1–2 files that matter
3. `search` with syntax pattern from [recipes.md](recipes.md)
4. `Read` only the matched line ranges — not whole directories

## Globs that reduce noise

```bash
--globs '!**/*.test.ts' --globs '!**/node_modules/**' --globs '!**/demos/**'
```

Use demos exclusion when exploring production `src/` only.