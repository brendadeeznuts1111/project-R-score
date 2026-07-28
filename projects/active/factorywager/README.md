# factorywager

Umbrella for the FactoryWager private NPM registry platform (R2-backed storage, CDN, auth).

| | |
|--|--|
| Tier | `active` · [triage](../../README.md) |
| Registry app | [`registry/`](registry/) |
| Workspace packages | `registry/packages/*` + `registry/apps/*` — **nested** workspaces under `registry/package.json`, not root monorepo workspaces |

```bash
cd projects/active/factorywager/registry
bun install   # separate install root from factorywager-enterprise
```
