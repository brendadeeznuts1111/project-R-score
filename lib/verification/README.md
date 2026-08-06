# lib/verification

Verification helpers — install-env probes and channel checks.

**Scale:** ~11k lines · ~37 modules. Prefer the **Area map** first. Inventory
SSOT: [`../README.md`](../README.md). Maps are cluster indexes, not exhaustive
file lists.

## Area map

| Area | Paths (entry) | Role |
| ---- | ------------- | ---- |
| Types / taxonomy | [`types.ts`](types.ts) · [`subsystem.ts`](subsystem.ts) · [`proof-taxonomy.ts`](proof-taxonomy.ts) · [`proof-consistency.ts`](proof-consistency.ts) · [`proof-diff.ts`](proof-diff.ts) · [`jsonld.ts`](jsonld.ts) · [`canonical-coverage.ts`](canonical-coverage.ts) | Report shapes, pillars, dashboard proof contracts |
| Channel resolve / doctor | [`channels.ts`](channels.ts) · [`bun-channel-doctor.ts`](bun-channel-doctor.ts) · [`bun-release-channel.ts`](bun-release-channel.ts) · [`channel-suite.ts`](channel-suite.ts) · [`channel-proof.ts`](channel-proof.ts) · [`channel-meta-refresh.ts`](channel-meta-refresh.ts) · [`networking-channel.ts`](networking-channel.ts) | GitHub Releases resolve + stable/canary/main tip doctor ([`config/bun-channels.toml`](../../config/bun-channels.toml)) |
| Runtime pin / nits | [`bun-runtime-pin.ts`](bun-runtime-pin.ts) · [`bun-runtime-nits-probes.ts`](bun-runtime-nits-probes.ts) · [`resolve-bun-binary.ts`](resolve-bun-binary.ts) · [`ratchet.ts`](ratchet.ts) | Version pin, runtime nits suite, ratchet DB |
| Install / PM | [`install-env-probes.ts`](install-env-probes.ts) · [`install-env-config.ts`](install-env-config.ts) · [`install-platform.ts`](install-platform.ts) · [`pm-registry-probes.ts`](pm-registry-probes.ts) · [`registry-client-probes.ts`](registry-client-probes.ts) | Install-env + install-platform + registry client proofs |
| Bundler | [`bundler-loader-probes.ts`](bundler-loader-probes.ts) | Asset Processing loader proofs (`css` / `jsonc` / `ts` / …) |
| Cloudflare Access / Pages | [`cloudflare-access-live.ts`](cloudflare-access-live.ts) · [`cloudflare-access-policy.ts`](cloudflare-access-policy.ts) · [`cloudflare-access-token.ts`](cloudflare-access-token.ts) · [`cloudflare-token-scope.ts`](cloudflare-token-scope.ts) · [`cloudflare-pages-preflight.ts`](cloudflare-pages-preflight.ts) | Live Access probes, token scope, Pages preflight |
| Pages edge / publish plane | [`pages-edge-weave.ts`](pages-edge-weave.ts) · [`pages-edge-weave-subdomains.ts`](pages-edge-weave-subdomains.ts) · [`publish-plane-weave.ts`](publish-plane-weave.ts) · [`publish-plane-color.ts`](publish-plane-color.ts) · [`links.ts`](links.ts) | Edge weave, publish-plane color, link checks |
| Soft / tennis SSOT | [`ssot-flow-soft.ts`](ssot-flow-soft.ts) · [`tennis-ssot-release.ts`](tennis-ssot-release.ts) · [`release-preview.ts`](release-preview.ts) | Soft flow SSOT + tennis release surface + release preview filters |

**Operate:** `bun run verify-all` · `verify:channel:meta` · `verify:proof-taxonomy:save` ·
[`docs/platform-routing.md`](../../docs/platform-routing.md) ·
[`docs/harness/PROOF.md`](../../docs/harness/PROOF.md).

| File | Purpose |
|------|---------|
| `channels.ts` | Channel resolve via GitHub Releases (`bun upgrade` feeds) |
| `bun-channel-doctor.ts` | Read-only reconciliation of stable, canary, main tip, RSS, Atom, npm type tags, manifests, lockfile, and installed evidence |
| `types.ts` | `SemanticTags` / `ChannelAwareVerificationReport` / snapshot index |
| `subsystem.ts` | Meta-verification pillar: `runtime` \| `package-manager` \| `networking` \| `bundler` (+ DocSection map) |
| `bundler-loader-probes.ts` | Thin Asset Processing loader proofs (css / jsonc / ts / text / file) |
| `jsonld.ts` | Schema.org JSON-LD for proofs |
| `proof-diff.ts` | Diff two channel-aware proofs by probe name |
| `proof-taxonomy.ts` | Proof JSON contracts — subsystem audit for dashboard artifacts |
| `proof-consistency.ts` | Cross-proof parity (install-platform embed · bySubsystem rollups) |
| `release-preview.ts` | SSOT for omitting install-platform rows from release preview |
| `ratchet.ts` | Version-locked verification per channel — `ratchet.json` DB, regression detection, force-accept (`bun run ratchet[:force]`) |
| `install-env-probes.ts` | Install-environment probe definitions |

**Subsystems (orthogonal to channel):**

| Pillar | Suites / tools |
|--------|----------------|
| `runtime` | `verify:channel` release + `verify:bun-runtime-nits` |
| `package-manager` | install-platform rows in release · `verify:install-env` · `verify:install-platform` |
| `networking` | fetch/DNS/preconnect rows · `verify:channel:networking` bridge |
| `bundler` | `verify:bundler` / `--suite=bundler` (loaders; portal *build* stays separate) |

**Channel sources (not npm, not bun.sh text):**

| Channel | API |
|---------|-----|
| `latest` / `stable` | `Jarred-Sumner/bun-releases-for-updater` → `/releases/latest` (fallback `oven-sh/bun`) |
| `canary` | `oven-sh/bun` → `/releases/tags/canary` → `canary+<sha12>` + commit / publishedAt / match |
| `runtime` / pinned semver | Local `Bun.version` / literal |

`channels.ts` resolves metadata for verification runs; it does not switch the
binary. The stricter channel doctor is governed by
[`config/bun-channels.toml`](../../config/bun-channels.toml): stable is promotion
authority, main tip and rolling canary are observations, RSS/Atom corroborate
publication, and npm dist-tags prove the independently selected type channels.
The doctor never upgrades or rewrites pins.

Optional auth (precedence): `GITHUB_TOKEN` → `GITHUB_ACCESS_TOKEN` → `GH_TOKEN` → `gh auth token`  
API host: `GITHUB_API_DOMAIN` (default `api.github.com`).  
Catalogued in `lib/env-check.ts` (group `github`, optional).

**Fetch policy:** anonymous-first for public Bun release feeds; escalate with a token only on HTTP 403/429. Use `--prefer-auth` when CI is already rate-limited.

**Artifacts on `--save` (suite-aware for channel runner):**
- `suite=release|all` → `public/registry/release-features.json` (canonical dashboard / meta-proof)
- `suite=bundler` → `public/registry/bundler-loaders-proof.json` (**does not** clobber release)
- `suite=networking` → `public/registry/networking-channel-proof.json` (channel-shaped; native proof stays `networking-proof.json`)
- `public/registry/install-platform.json` · `install-env-proof.json` (package-manager subsystem)
- `public/registry/networking-proof.json` (`check:networking:save` / `verify-all`)
- `public/registry/bun-runtime-nits-proof.json` (`verify:bun-runtime-nits:save` / `verify-all`)
- `public/registry/docs-coverage-proof.json` · `registry-client-proof.json` · `doc-index.json` (taxonomy contracts)
- `public/registry/proof-taxonomy-audit.json` (`verify:proof-taxonomy:save` / `verify-all`)
- `public/registry/verification-<channel>-<version>[-suite].json` (snapshots; bundler gets `-bundler`)
- `public/registry/verification-index.json` (`canonical` updates only for release/all)

```bash
bun run verify:proof-taxonomy
bun run verify:proof-taxonomy:save
```

**Canonical metadata SSOT:** [`tools/canonical-helpers.ts`](../../tools/canonical-helpers.ts) (`getCanonicalEntry`, `resolveCanonicalForProbe`) merges token maps from [`tools/bun-doc-refs.ts`](../../tools/bun-doc-refs.ts). Every proof row should carry `subsystem`, `introducedIn`, `canonicalKey`, `canonicalKind`, `canonicalStability` (filled at resolve + re-normalized in `rehashChannelProof` / `ensureRowTaxonomy`).

**Bare vs meta `release-features.json`**

| Mode | How | Bake |
|------|-----|------|
| Bare (~46 rows) | `bun tools/verify-bun-release.ts --save` | **Invalidated** (`ChannelMetaBakeInvalid`) |
| Meta (~75 rows) | `bun run verify:channel:meta` | Written as `channel-meta-bake.json` |

`verify-all` ends with `verify-channel-meta` then `verify-proof-taxonomy`. After ad-hoc bare release saves, re-run meta before relying on taxonomy consistency.

```bash
bun run verify:channel:auth
bun run verify:channel:resolve -- --channel=latest
bun run verify:channel:canary
bun run verify:channel:all          # release + nits + bundler + networking
bun run verify:channel:meta         # prefer-artifact merge (no full re-run)
bun run verify:channel:bundler      # bundler loaders only
bun run verify:channel:networking   # networking channel bridge
bun run verify:bundler              # same suite, standalone tool
bun run verify:channel:diff         # compare two saved proofs (human table)
bun run env:check:channel-auth

# Custom diff (human by default; add --json for machine output)
bun tools/verify-channel.ts \
  --diff=public/registry/verification-stable-1.4.0.json \
  --diff-against=public/registry/verification-pinned-1.3.14.json

bun tools/verify-channel.ts --diff=a.json --diff-against=b.json --json
```
