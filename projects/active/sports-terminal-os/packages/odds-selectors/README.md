# odds-selectors

DOM selector mappings for sportsbook odds scraping — **versioned configuration, no code.**

When a bookmaker changes their HTML layout, publish a new version of this package,
update the lockfile, and restart the monitor. Zero code deployment.

## Quickstart

```bash
bun add odds-selectors
```

Then in your scraper:

```ts
import { readConfigFromPackage } from "./readme-config-loader";
const selectors = await readConfigFromPackage("odds-selectors");
// selectors.arsenal.rowSelector → "#odds-table tr"
```

---

## Selector Reference

```toml
# ---------- Arsenal (custom table layout) ----------
[arsenal]
rowSelector = "#odds-table tr"
teamSelector = ".team"
oddsSelector = ".price"
confSelector = ".conf"

# ---------- Liverpool (data-attribute layout) ----------
[liverpool]
type = "data-attributes"
rowSelector = ".odds-list li"
teamSelector = "[data-team]"
oddsSelector = "[data-price]"

# ---------- Manchester United ----------
[manchester-united]
rowSelector = "#odds-table tr"
teamSelector = ".team"
oddsSelector = ".odds"
confSelector = ".confidence"

# ---------- Real Madrid ----------
[real-madrid]
rowSelector = ".odds-grid .row"
teamSelector = ".team-name"
oddsSelector = ".odds-value"

# ---------- Barcelona ----------
[barcelona]
type = "shadow-dom"
rowSelector = "odds-widget::shadow(.row)"
teamSelector = ".team"
oddsSelector = ".price"

# ---------- Generic fallback (applied when no team-specific config exists) ----------
[fallback]
rowSelector = "table.odds tr"
teamSelector = "td:nth-child(1)"
oddsSelector = "td:nth-child(2)"
```

## Versioning Policy

| Version bump | Trigger |
|-------------|---------|
| **Patch** (1.0.x) | Fix typo in selector, no structural change |
| **Minor** (1.x.0) | Add new team, new selector type |
| **Major** (x.0.0) | Remove team, change TOML structure, rename keys |

## Why a package instead of a config file?

- **Immutable releases** — every version is a permanent, content-addressed snapshot
- **Global virtual store** — Bun deduplicates identical packages; zero extra disk space after first install
- **Symlink delivery** — `bun add` completes in ~115 ms for cached packages (no tarball download, no extraction)
- **No lifecycle scripts** — qualifies for the global store; no `postinstall`, no `node-gyp`, no surprises
- **Self-documenting** — the README is both human-readable docs and machine-consumable config
- **Lockable** — `bun.lock` pins the exact version; no drift between environments
