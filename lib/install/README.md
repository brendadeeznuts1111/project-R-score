# lib/install

Install / bunfig machine policy (code SSOT).

| Module | Role |
|--------|------|
| [`machine-bunfig-policy.ts`](./machine-bunfig-policy.ts) | Machine-owned install keys · age excludes · forbidden env · ephemeral CI allowlist · template path · check snippets |

**Consumers:** `tools/lib/portal-cli-doctor-bunfig.ts` · `scripts/ensure-machine-bunfig.ts` · `scripts/audit-bunfig.ts` · `scripts/verify-install-cache.ts` (`install:verify`)

**Human map:** [`docs/UNIFIED.md`](../../docs/UNIFIED.md) · template `config/machine.bunfig.toml.template`

Live `~/.bunfig.toml` may be a symlink to `~/dotfiles/bun/bunfig.toml`. `ensure --check` reads through it; `--overwrite` will not flatten it.

```bash
bun test tests/machine-bunfig-policy.test.ts tests/ensure-machine-bunfig.test.ts
bun run machine:bunfig:ensure
bun run portal:doctor --group bunfig
```
