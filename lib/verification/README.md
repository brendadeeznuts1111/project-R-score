# lib/verification

Verification helpers — install-env probes and channel checks.

| File | Purpose |
|------|---------|
| `channels.ts` | Channel resolve via GitHub Releases (`bun upgrade` feeds) |
| `types.ts` | `SemanticTags` / `ChannelAwareVerificationReport` / snapshot index |
| `subsystem.ts` | Meta-verification pillar: `runtime` \| `package-manager` \| `networking` \| `bundler` (+ DocSection map) |
| `bundler-loader-probes.ts` | Thin Asset Processing loader proofs (css / jsonc) |
| `jsonld.ts` | Schema.org JSON-LD for proofs |
| `proof-diff.ts` | Diff two channel-aware proofs by probe name |
| `ratchet.ts` | Version-locked verification per channel — `ratchet.json` DB, regression detection, force-accept (`bun run ratchet[:force]`) |
| `install-env-probes.ts` | Install-environment probe definitions |

**Subsystems (orthogonal to channel):**

| Pillar | Suites / tools |
|--------|----------------|
| `runtime` | `verify:channel` release + `verify:bun-runtime-nits` |
| `package-manager` | install-platform rows in release · `verify:install-env` · `verify:install-platform` |
| `networking` | fetch/DNS/preconnect rows (inferred from docs URLs) |
| `bundler` | `verify:bundler` / `--suite=bundler` (loaders; portal *build* stays separate) |

**Channel sources (not npm, not bun.sh text):**

| Channel | API |
|---------|-----|
| `latest` / `stable` | `Jarred-Sumner/bun-releases-for-updater` → `/releases/latest` (fallback `oven-sh/bun`) |
| `canary` | `oven-sh/bun` → `/releases/tags/canary` → `canary+<sha12>` + commit / publishedAt / match |
| `runtime` / pinned semver | Local `Bun.version` / literal |

Optional auth (precedence): `GITHUB_TOKEN` → `GITHUB_ACCESS_TOKEN` → `GH_TOKEN` → `gh auth token`  
API host: `GITHUB_API_DOMAIN` (default `api.github.com`).  
Catalogued in `lib/env-check.ts` (group `github`, optional).

**Fetch policy:** anonymous-first for public Bun release feeds; escalate with a token only on HTTP 403/429. Use `--prefer-auth` when CI is already rate-limited.

**Artifacts on `--save`:**
- `public/registry/release-features.json` (canonical dashboard proof)
- `public/registry/install-platform.json` · `install-env-proof.json` (package-manager subsystem)
- `public/registry/networking-proof.json` (`check:networking:save` / `verify-all`)
- `public/registry/verification-<channel>-<version>.json` (per-channel snapshot; `+` → `-`)
- `public/registry/verification-index.json` (multi-snapshot switcher for the ops portal)

**Canonical metadata SSOT:** [`tools/canonical-helpers.ts`](../../tools/canonical-helpers.ts) (`getCanonicalEntry`, `resolveCanonicalForProbe`) merges token maps from [`tools/bun-doc-refs.ts`](../../tools/bun-doc-refs.ts). Each proof row may carry `subsystem`, `introducedIn`, `canonicalKey`, `canonicalKind`, `canonicalStability`.

```bash
bun run verify:channel:auth
bun run verify:channel:resolve -- --channel=latest
bun run verify:channel:canary
bun run verify:channel:all          # release + runtime-nits + bundler loaders
bun run verify:channel:bundler      # bundler loaders only
bun run verify:bundler              # same suite, standalone tool
bun run verify:channel:diff         # compare two saved proofs (human table)
bun run env:check:channel-auth

# Custom diff (human by default; add --json for machine output)
bun tools/verify-channel.ts \
  --diff=public/registry/verification-stable-1.4.0.json \
  --diff-against=public/registry/verification-pinned-1.3.14.json

bun tools/verify-channel.ts --diff=a.json --diff-against=b.json --json
```

