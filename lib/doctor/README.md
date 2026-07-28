# lib/doctor

Doctor-state bake helpers and portal board contracts for `portal-cli doctor`.

- Bunfig probes SSOT: `tools/lib/portal-cli-doctor-bunfig.ts`
- Live Access probes: [`lib/verification/cloudflare-access-live.ts`](../verification/cloudflare-access-live.ts)
- CLI checks: `tools/lib/portal-cli-doctor*.ts`
- Board artifact: `public/registry/doctor-state.json`
- Tenant: [`docs/harness/tenants/portal-doctor.md`](../../docs/harness/tenants/portal-doctor.md)

```bash
bun run portal:doctor --group bunfig --verbose
bun run bake:doctor
bun run bake:doctor:check
```

Claim: `portal-cli doctor` · `bun run bake:doctor`
