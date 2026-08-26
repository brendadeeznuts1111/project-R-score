# Guard coverage gap map

**Objective** Complete, evidence-backed, default-deny guard coverage from CLI
and Bun runtime controls through registries, transports, integrations, feeds,
channels, content storage, and agent/tool consumers.

**Owner** `runtime-tooling` owns this cross-plane map. Each row also names the
implementation owner that must close it.

**Scope rule** This map is coordination state, not proof. A sentence, checkbox,
review approval, or this document's existence cannot close a row. The
authoritative proof catalog remains
[`lib/harness/proof.ts`](../../../lib/harness/proof.ts), and affected claims
follow [`FRESH-RERUN.md`](../FRESH-RERUN.md).

## Evidence states

- `Open` — an authority-bearing surface is inventoried, but one or more owner,
  contract, implementation, negative test, proof entry, or rerun is missing.
- `Contracted` — typed inputs, ownership, precedence, default decision, and
  failure semantics exist. No behavioral coverage is implied.
- `Implemented` — every inventoried entry point routes through the contract and
  a discovery ratchet rejects new bypasses. No passing test is implied.
- `Tested` — deterministic positive and negative tests pass in the owning lane,
  including the row's fail-closed cases. This is not merge proof.
- `Proven` — `Tested` plus an exact `ProofPath` with `freshRerunKind: "claim"`;
  its `freshRerun` passed from a clean worktree at the candidate commit, and the
  output is attached to the PR.

States are monotonic only while their evidence is current. A changed owner,
contract, inventory, dependency, runtime channel, or proof input demotes the row
to the earliest unsupported state. `Proven` is unavailable when the target
ratchet is absent, skipped, live-only, non-hermetic, or represented solely by
prose.

## Close protocol

For every row, the implementation owner must:

1. enumerate the complete authority surface and assign a typed owner;
2. encode allow, deny, precedence, forwarding, and redaction decisions;
3. route all known consumers through that contract and add bypass discovery;
4. add hermetic positive and negative tests at the owning boundary;
5. register the exact ratchet in `package.json` and `lib/harness/proof.ts`;
6. add a fresh-rerun contract assertion and attach clean-worktree output.

The commands below are **target command contracts**. Until a command exists, is
registered as a claim proof, and passes the close protocol, its row remains
`Open`.

## Gap rows

### `CTRL-001` CLI, runtime flags, and preload controls

**State** `Open`

**Owner** `runtime-tooling`

**Dependencies** Bun channel inventory; `ALLOWED_LONG_REGISTRY`; environment and
`bunfig.toml` precedence; runtime/test/browser preload separation.

**Contract** Every long flag, case-sensitive short alias, environment
equivalent, config key, request override, and `--` position has one canonical
identity and profile decision. Unknown and experimental controls default deny.

**Target ratchet** `bun run guard:controls:check`

**Fresh rerun** `bun run guard:controls:check`

### `CTRL-002` Subprocess authority

**State** `Open`

**Owner** `runtime-tooling`

**Dependencies** `CTRL-001`; repository command inventory; child environment and
argument redaction rules.

**Contract** Child processes receive only declared flags, environment values,
working directories, and executable identities. Canonical aliases cannot be
reintroduced after sanitization.

**Target ratchet** `bun run guard:subprocess:check`

**Fresh rerun** `bun run guard:subprocess:check`

### `REG-001` Registry read, write, and resolution planes

**State** `Open`

**Owner** `factory-registry`

**Dependencies** `CTRL-001`; registry origin and credential brands; Bun CLI,
environment, `bunfig.toml`, `.npmrc`, and `publishConfig` precedence.

**Contract** Read, install, metadata, publish, and mirror operations have
separate grants. Registry overrides, embedded credentials, integrity failures,
and production auto-install fail closed. Runtime, dev, optional, peer, and
`peerDependenciesMeta` edges remain distinct.

**Target ratchet** `bun run guard:registry:check`

**Fresh rerun** `bun run guard:registry:check`

### `NET-001` Network authority

**State** `Open`

**Owner** `networking`

**Dependencies** `CTRL-001`; DNS/IP classification; redirect policy; proxy and
TLS profiles.

**Contract** Direct, environment-proxy, and named-proxy routes explicitly own
DNS, destination IP, redirect, timeout, TLS, Unix socket, preconnect, and
protocol overrides. Private, loopback, link-local, reserved, mixed-answer, and
metadata destinations fail closed unless a narrower owner grants them.

**Target ratchet** `bun run guard:network:check`

**Fresh rerun** `bun run guard:network:check`

### `INT-001` Outbound integration consumers

**State** `Open`

**Owner** `sports-terminal-os` plus each integration owner

**Dependencies** `NET-001`; complete server-side fetch inventory; endpoint
credentials and replay classification.

**Contract** Prediction providers, Pinnacle, Kimi, Betfair, Telegram, F402,
webhooks, partner sources, and internal proxy calls use the central outbound
authority. Each request declares method, body replayability, credentials,
response-byte limit, timeout, and retry budget.

**Target ratchet** `bun run guard:integrations:check`

**Fresh rerun** `bun run guard:integrations:check`

### `FEED-001` RSS, XML, and image ingestion

**State** `Open`

**Owner** `release-tracker`

**Dependencies** `NET-001`; `CAS-001`; Bun.XML channel contract; feed and media
origin policy.

**Contract** Feed redirects and referenced media inherit outbound authority. XML
parsing enforces byte, depth, node, attribute, and text quotas with a terminable
boundary. Images are MIME-sniffed, dimension-bounded, rights-aware, and stored
by content digest rather than URL.

**Target ratchet** `bun run guard:feeds:check`

**Fresh rerun** `bun run guard:feeds:check`

### `CHAN-001` Channel publication and aliases

**State** `Open`

**Owner** `release-tracker`

**Dependencies** `FEED-001`; `CAS-001`; `RIGHTS-001`; Bun stable, canary, and
tip channel policy.

**Contract** A channel alias names a verified immutable object and records
publisher, review authority, source channel, schema, and expiry. Promotion and
revocation are atomic; stale or rights-ineligible targets cannot remain active.

**Target ratchet** `bun run guard:channels:check`

**Fresh rerun** `bun run guard:channels:check`

### `CAS-001` ContentStore and media addressability

**State** `Open`

**Owner** `content-store`

**Dependencies** branded digest and object-key constructors; atomic local and R2
adapters; transform identity.

**Contract** Byte identity is an algorithm-qualified digest, independent of URL,
ETag, proxy, protocol, and backend key. Writes verify bytes atomically; aliases
and provenance are separate records. Derived images retain original digest,
transform version, and dependency edges. Bun's package `globalStore` is not the
application ContentStore.

**Target ratchet** `bun run guard:content-store:check`

**Fresh rerun** `bun run guard:content-store:check`

### `RIGHTS-001` Content rights and lifecycle

**State** `Open`

**Owner** `release-governance`

**Dependencies** `CAS-001`; source provenance; channel alias ownership.

**Contract** Publisher, storage steward, rights reviewer, and alias publisher
are separate roles. Allowed, denied, expired, and revoked rights states govern
serving, derivation, retention, and deletion without changing content identity.

**Target ratchet** `bun run guard:content-rights:check`

**Fresh rerun** `bun run guard:content-rights:check`

### `AGENT-001` Agent and tool consumers

**State** `Open`

**Owner** `agent-tooling`

**Dependencies** `CTRL-001`; `CAS-001`; capability and MCP/tool inventories.

**Contract** Agents and tools declare the flags, network routes, content
references, registries, and channels they may consume. Wire input parses once to
branded `ContentRef` and capability types; undeclared capabilities and raw
locator substitution fail closed.

**Target ratchet** `bun run guard:agents:check`

**Fresh rerun** `bun run guard:agents:check`

### `OFFLINE-001` Offline zero-socket mode

**State** `Open`

**Owner** `networking`

**Dependencies** `CTRL-001`; `NET-001`; `REG-001`; `FEED-001`; `CAS-001`.

**Contract** Offline mode resolves only verified local content and package
artifacts. A socket sentinel proves zero DNS, TCP, proxy, preconnect, registry,
object-store, and external probe activity, including child processes.

**Target ratchet** `bun run guard:offline:check`

**Fresh rerun** `bun run guard:offline:check`

### `PROTO-001` HTTP protocol and proxy matrix

**State** `Open`

**Owner** `networking`

**Dependencies** `NET-001`; replay-safe request contract; hermetic direct and
CONNECT-proxy fixtures; experimental approval policy.

**Contract** HTTP/1.1 and HTTP/2 are proven direct and through the declared
proxy path. HTTP/3 remains an explicit canary capability until stable and
approved. Fallback never replays an unsafe write, and protocol/cache keys
include route, proxy, TLS, capability expiry, and network state. Identical bytes
produce identical content digests across protocols.

**Target ratchet** `bun run guard:protocol-matrix:check`

**Fresh rerun** `bun run guard:protocol-matrix:check`

### `BASE-001` Integration type boundary

**State** `Implemented`

**Owner** `sports-terminal-os`

**Dependencies** trusted `PartnerProfileService.listPartners()` summary shape.

**Contract** The integration-health projection consumes the trusted camelCase
interior summary and never reaches back into snake_case wire/database fields.

**Ratchet** `bun run --filter sports-terminal-os typecheck`

**Fresh rerun** `bun run --filter sports-terminal-os typecheck`

This row cannot advance to `Proven` until it is attached to an exact claim or
absorbed by a broader integration claim with the same fresh rerun.

### `MERGE-001` Full clean-worktree merge proof

**State** `Open`

**Owner** `harness`

**Dependencies** every row above is `Proven`; candidate branch is synchronized
with `origin/main`; generated artifacts are current and isolated.

**Contract** The complete guard suite, full type checks, affected workspace
tests, repository hygiene, and Bun merge authority all pass at the candidate
commit without skipped gates or foreign-lane evidence.

**Ratchet** `bun run bun:ci`

**Fresh rerun** `bun run bun:ci`

## Current closure condition

The objective is incomplete while any row is below `Proven`. At this map's
baseline, `BASE-001` is implemented and every other row is open; therefore the
map is a work queue, not a completion claim.
