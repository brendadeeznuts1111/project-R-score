# lib/install

Install / bunfig machine policy (code SSOT).

| Module | Role |
|--------|------|
| [`machine-bunfig-policy.ts`](./machine-bunfig-policy.ts) | Machine-owned install keys · age excludes · forbidden env · ephemeral CI allowlist · template path · check snippets |

**Consumers:** `tools/lib/portal-cli-doctor-bunfig.ts` · `scripts/ensure-machine-bunfig.ts` · `scripts/audit-bunfig.ts`

**Human map:** [`docs/UNIFIED.md`](../../docs/UNIFIED.md) · template `config/machine.bunfig.toml.template`

```bash
bun test tests/machine-bunfig-policy.test.ts
bun run machine:bunfig:ensure
bun run portal:doctor --group bunfig
```
