# Spine tenants runbook

Continuous-maintenance owners for in-process spine tenants ([`spine/tenants.ts`](../../spine/tenants.ts)).  
One page starts with the **install-verify** tenant (already shipping). Add a section per tenant when more land.

Daemon: `bun run spine:schedule` · once: `bun run spine:schedule:once` · filter: `--tenant=<id>`

---

## Tenant: install-verify

**Schedule**  
`30 6 * * *` UTC (in-process complement)

**Command**  
`bun run test:install-verify` (via spine tenant runner)

### Signal

Observable symptom that this tenant is failing:

- `bun run spine:schedule:once -- --tenant=install-verify` exits **non-zero**, or
- Daemon log line `❌ spine tenant · install-verify · exit N` with `N ≠ 0`, or
- Journey assertion fails (`#status` ≠ `verified` / WebView smoke error)

### Intervention

1. Re-run the journey locally: `bun run test:install-verify`
2. If that fails, open the journey owner: [`install-verify.md`](install-verify.md) · `tests/journey/install-verify.test.ts`
3. Check recent spine / CI logs for the tenant label `install-verify`
4. Page the human owner of claim `install-verify-journey` (see [`AUTHORITY.md`](AUTHORITY.md) lanes)

Do **not** delete the tenant to green the daemon.

### Proof

- Journey claim: **`install-verify-journey`** — [`PROOF.md`](PROOF.md) · [`install-verify.md`](install-verify.md)  
  *Ratchet* → `bun run test:install-verify`
- Spine multi-tenant claim: **`spine-multi-tenant`** — registry includes this tenant  
  *Ratchet* → `bun run spine:schedule:once -- --tenant=install-verify`
- This runbook: **`spine-tenants-runbook`**  
  *Ratchet* → `bun run docs:spine-tenants`

### Retirement

Remove or retire this spine tenant only when **all** hold:

1. The install-verify journey proof is enforced by a **deployment / CI gate** that runs without spine (e.g. required workflow already runs `test:install-verify` on every merge and on a schedule), **and**
2. Continuous-maintenance for that journey is owned by that gate (spine is no longer the only periodic re-proof), **and**
3. Claim `spine-multi-tenant` is updated (or another tenant keeps the registry at ≥2) so multi-tenant proof does not go hollow.

---

## Lookup

```bash
bun run docs:spine-tenants
bun run spine:schedule:once -- --tenant=install-verify
bun run test:install-verify
```
