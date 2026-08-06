# lib/doctor

**Status:** `hub` — this directory is the **index** for portal doctor boards and
run commands. Implementation lives in `tools/lib/portal-cli-doctor*.ts` and
related probes; machine bunfig policy in [`install/`](../install/).

Doctor-state bake helpers and portal board contracts for `portal-cli doctor`.

- Machine bunfig policy SSOT:
  [`lib/install/machine-bunfig-policy.ts`](../install/machine-bunfig-policy.ts)
- Bunfig probes (doctor group): `tools/lib/portal-cli-doctor-bunfig.ts`
- Runtime environment probes: `tools/lib/portal-cli-doctor-runtime-env.ts`
- Live Access probes:
  [`lib/verification/cloudflare-access-live.ts`](../verification/cloudflare-access-live.ts)
- CLI checks: `tools/lib/portal-cli-doctor*.ts`
- Board artifact: `public/registry/doctor-state.json`
- Tenant:
  [`docs/harness/tenants/portal-doctor.md`](../../docs/harness/tenants/portal-doctor.md)

```bash
bun run portal:doctor --group bunfig --verbose
bun run portal:doctor --group runtime --verbose
bun run bake:doctor
bun run bake:doctor:check
```

Claim: `portal-cli doctor` · `bun run bake:doctor`
