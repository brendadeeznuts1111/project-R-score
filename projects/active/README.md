# Active tier

Maintained product leaves. Full inventory + root contract: [`../README.md`](../README.md).

## Categories

| Category | Products |
|----------|----------|
| [`analysis/`](analysis/) | grok-security, matrix-analysis, scanner |
| [`automation/`](automation/) | execution plan; runtime implementation lives under root `lib/automation/` + `lib/provisioning/` |
| [`dashboards/`](dashboards/) | enterprise-dashboard, quantum-terminal-dashboard, secrets-dashboard |
| [`development/`](development/) | geelark, kal-poly-bot |
| [`enterprise/`](enterprise/) | bet-ticker-worker-v1.1, cascade-mover-v3, fantasy42-fire22-registry, foxy-proxy, full-stack-bun.io |
| [`tools/`](tools/) | native-addon-tool |
| [`utilities/`](utilities/) | bun-file-analyzer, bun-toml-secrets-editor, proton-pass, shortcut-registry, toml-cli |

## Top-level products

| Project | Notes |
|---------|-------|
| [`sports-terminal-os/`](sports-terminal-os/) | Root workspace member |
| [`factorywager/`](factorywager/) | Registry umbrella → `registry/` |
| `kimiremote/` | Own remote (gitignored; not materialized in every worktree) |
| `f402-openapi/` | Own remote (gitignored; not materialized in every worktree) |
| [`playwriter-skill/`](playwriter-skill/) | Playwright skill package |

Each product leaf has its own `README.md` + `package.json`. Nested workspace packages stay nested.
