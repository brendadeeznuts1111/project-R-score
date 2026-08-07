# CLI Quick Reference

Generated encyclopedia — **not** loaded for day-loop.

```bash
bun run help                 # categorized commands (SSOT)
bun run help --verbose
bun run cli:docs             # regenerate full docs/CLI.md from package.json
bun run validate:colors      # color-kernel Claim/Evidence (theme-dark aliases)
bun run validate:colors:json # ClaimReport JSON (Bun.write stdout)
bun run test:colors          # unit + validate smoke (claim color-kernel-theme-aliases)
bun run portal:theme:watch   # theme.jsonc → theme-tokens.css on every edit (bun --watch)
bun run dev:portal:theme     # one-command dev loop: theme watch + serve:public:hot
```

Categories: [`scripts/lib/cli-categories.ts`](../scripts/lib/cli-categories.ts). Packages: `bun run packages:list` · [`packages/README.md`](./packages/README.md).

