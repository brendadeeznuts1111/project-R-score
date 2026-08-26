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

A scoped proof may be narrower than its gap row. Such a proof makes the passing
behavior independently rerunnable, but it does not promote the row past its
earliest unsupported requirement. The reasons below name those remaining
requirements explicitly.

## Gap rows

### `CTRL-001` CLI, runtime flags, and preload controls

**State** `Contracted`

**Owner** `runtime-tooling`

**Dependencies** Bun channel inventory; `ALLOWED_LONG_REGISTRY`; environment and
`bunfig.toml` precedence; runtime/test/browser preload separation.

**Contract** Every long flag, case-sensitive short alias, environment
equivalent, config key, request override, and `--` position has one canonical
identity and profile decision. Unknown and experimental controls default deny.

**Target ratchet** `bun run guard:controls:check`

**Fresh rerun** `bun run guard:controls:check`

**Scoped proof** `guard-controls-v1`

The typed kernel and exact-capability evaluator are present, with a reviewed
ownership manifest, JSON schema, bidirectional manifest-to-kernel drift guard,
live Bun-help drift, and focused contract tests. The proof covers registry,
preconnect, preload/config/environment sources, experimental HTTP/2 and HTTP/3,
request proxy/TLS/socket/protocol overrides, and the offline profile. It also
records that `--connect`, `-O`, and `-R` have no Bun 1.4 authority meaning:
`search:smart` owns `-R` only after the application entrypoint, while observed
`-O` uses belong to non-Bun download tools. Application-local online/offline
inventory, request-policy adoption by every outbound consumer, and the raw or
dynamically assembled subprocess backlog remain open, so this row is not yet
`Implemented`.

### `CTRL-002` Subprocess authority

**State** `Contracted`

**Owner** `runtime-tooling`

**Dependencies** `CTRL-001`; repository command inventory; child environment and
argument redaction rules.

**Contract** Child processes receive only declared flags, environment values,
working directories, and executable identities. Canonical aliases cannot be
reintroduced after sanitization.

**Target ratchet** `bun run guard:subprocess:check`

**Fresh rerun** `bun run guard:subprocess:check`

**Scoped proof** `guard-subprocess-authority-v1`

The guarded child contract binds an absolute executable, complete runtime argv,
working directory, and a non-inherited environment to exact control grants. The
first migrated set covers five registry info/publish consumers, including the
operator publish lane, and rejects changed registry, reserved `--connect` / `-O`
/ `-R`, experimental HTTP, and runtime preload controls before spawn. The
bidirectional hashed inventory records guarded consumers and exact native-probe
owner/reason exceptions; 182 raw or dynamic consumers remain explicit unowned
gaps, so this row is not yet `Implemented`.

### `REG-001` Registry read, write, and resolution planes

**State** `Contracted`

**Owner** `factory-registry`

**Dependencies** `CTRL-001`; registry origin and credential brands; Bun CLI,
environment, `bunfig.toml`, `.npmrc`, and `publishConfig` precedence.

**Contract** Read, install, metadata, publish, and mirror operations have
separate grants. Registry overrides, embedded credentials, integrity failures,
and production auto-install fail closed. Runtime, dev, optional, peer, and
`peerDependenciesMeta` edges remain distinct.

**Target ratchet** `bun run guard:registry:check`

**Fresh rerun** `bun run guard:registry:check`

**Scoped proof** `guard-registry-authority-v1`

The registry SDK separates metadata read, artifact read, publish, and mirror
write grants, rejects credential-bearing origins, bounds and parses responses,
and preserves runtime, development, optional, peer, and optional-peer edges.
Guarded install/publish planners enforce the modeled source precedence, explicit
write authority, clean child environments, and hermetic metadata parsing. The
exact subprocess inventory still classifies direct package-manager probes
outside those planners, and configuration values are modeled inputs rather than
a completed migration of every native file parser and consumer, so this row is
not `Implemented`.

### `NET-001` Network authority

**State** `Contracted`

**Owner** `networking`

**Dependencies** `CTRL-001`; DNS/IP classification; redirect policy; proxy and
TLS profiles.

**Contract** Direct, environment-proxy, and named-proxy routes explicitly own
DNS, destination IP, redirect, timeout, TLS, Unix socket, preconnect, and
protocol overrides. Private, loopback, link-local, reserved, mixed-answer, and
metadata destinations fail closed unless a narrower owner grants them.

**Target ratchet** `bun run guard:network:check`

**Fresh rerun** `bun run guard:network:check`

**Scoped proof** `guard-network-authority-v1`

The route/network/protocol/replay/deadline/response contracts, exact request
capability composition, public-address classifier, mixed-answer rejection, and
offline rejection-before-resolution are implemented with focused tests. DNS
preflight cannot by itself pin Bun's eventual socket, named proxies delegate
final-address enforcement, and the server-side fetch discovery ratchet remains
open; therefore this row is not yet `Implemented`.

### `INT-001` Outbound integration consumers

**State** `Contracted`

**Owner** `sports-terminal-os` plus each integration owner

**Dependencies** `NET-001`; complete server-side fetch inventory; endpoint
credentials and replay classification.

**Contract** Prediction providers, Pinnacle, Kimi, Betfair, Telegram, F402,
webhooks, partner sources, and internal proxy calls use the central outbound
authority. Each request declares method, body replayability, credentials,
response-byte limit, timeout, and retry budget.

**Target ratchet** `bun run guard:integrations:check`

**Fresh rerun** `bun run guard:integrations:check`

**Scoped proof** `guard-sports-integrations-v1`

**Repository inventory proof** `guard-outbound-consumers-v1`

Sports Terminal's inventoried server-side provider, webhook, internal-proxy, and
Telegram consumers route through reviewed policy boundaries and their focused
suite passes. The repository-wide AST ratchet exactly matches 671 structural
rows: 44 owned policy boundaries, 61 intentional native probes, and 566 explicit
unowned gaps. It rejects additions and removals and requires each row to retain
an owner, reason, and classification, but classification is not consumer
migration. The 566 unowned consumers keep this row below `Implemented`.

### `FEED-001` RSS, XML, and image ingestion

**State** `Contracted`

**Owner** `release-tracker`

**Dependencies** `NET-001`; `CAS-001`; Bun.XML channel contract; feed and media
origin policy.

**Contract** Feed redirects and referenced media inherit outbound authority. XML
parsing enforces byte, depth, node, attribute, and text quotas with a terminable
boundary. Images are MIME-sniffed, dimension-bounded, rights-aware, and stored
by content digest rather than URL.

**Target ratchet** `bun run guard:feeds:check`

**Fresh rerun** `bun run guard:feeds:check`

**Scoped proof** `guard-feed-ingestion-v1`

**Durable adapter proof** `guard-r2-content-v1`

**Independent rights proof** `guard-rights-revocation-ledger-v1`

Both RSS parsers reject DTD/entity declarations and enforce input, depth, node,
attribute, and text quotas. Feed images are MIME/dimension bounded and can store
rights-gated originals and derived thumbnails as verified, related content
references. A deterministic manifest now verifies offline snapshot identity and
the hermetic R2 adapter loads it without online fallback. All known
network-backed RSS consumers parse through a per-request Bun Worker with a hard
deadline and unconditional termination; trusted checked-in inputs retain the
synchronous parser. Central network migration and complete production feed/R2
binding consumer migration remain open. `RSSManager` now rejects its former
free-form URL-keyed R2 JSON fallback: offline recovery requires an exact
source-bound manifest, verified CAS bytes, freshness policy, and a second pass
through the terminable XML worker. Package manifests are parsed once into
deterministically ordered runtime, development, optional, and peer dependency
records; optional-peer metadata and dependency kind are retained in package-feed
categories and stable GUIDs. A durable archive writer and complete production
binding migration remain open, so this row is not `Implemented`.

### `CHAN-001` Channel publication and aliases

**State** `Contracted`

**Owner** `release-tracker`

**Dependencies** `FEED-001`; `CAS-001`; `RIGHTS-001`; Bun stable, canary, and
tip channel policy.

**Contract** A channel alias names a verified immutable object and records
publisher, review authority, source channel, schema, and expiry. Promotion and
revocation are atomic; stale or rights-ineligible targets cannot remain active.

**Target ratchet** `bun run guard:channels:check`

**Fresh rerun** `bun run guard:channels:check`

**Scoped proof** `guard-channel-alias-contract-v1`

**Durable adapter proof** `guard-r2-content-v1`

The branded in-memory alias store has exact revision/digest compare-and-swap,
distinct authority roles, immutable verified targets, expiry, promotion, and
terminal revocation tests. The hermetic R2 adapter persists strict alias JSON,
rehashes it on read, and uses ETag compare-and-swap. Hermetic memory and R2
aliases consult the independent current rights decision, and reviewer revocation
disables resolution without rewriting alias identity. Production R2 binding/live
proof and complete channel-consumer wiring remain open, so this row is
`Contracted`, not `Implemented`.

### `CAS-001` ContentStore and media addressability

**State** `Contracted`

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

**Scoped proof** `guard-content-store-contract-v1`

**Durable adapter proof** `guard-r2-content-v1`

Branded content and locator identities, strict `ContentRef` parsing,
operation-specific rights decisions, content/package relation separation, the
bounded memory adapter, and an atomic fsync-backed local adapter are tested. The
hermetic R2 binding adapter conditionally creates digest-keyed objects and
rehashes bounded reads; the R2 alias adapter verifies persisted JSON around ETag
CAS. Production binding/live proof, reachability, and complete consumer
migration remain open, so this row is not yet `Implemented`.

### `RIGHTS-001` Content rights and lifecycle

**State** `Contracted`

**Owner** `release-governance`

**Dependencies** `CAS-001`; source provenance; channel alias ownership.

**Contract** Publisher, storage steward, rights reviewer, and alias publisher
are separate roles. Allowed, denied, expired, and revoked rights states govern
serving, derivation, retention, and deletion without changing content identity.

**Target ratchet** `bun run guard:content-rights:check`

**Fresh rerun** `bun run guard:content-rights:check`

**Scoped proof** `guard-content-rights-contract-v1`

**Independent ledger proof** `guard-rights-revocation-ledger-v1`

ContentRef decisions cover allowed, denied, expired, revoked,
authority-mismatched, and operation-ineligible cases. The independent memory and
R2 ledgers enforce a distinct reviewer, exact revision/digest and ETag CAS,
strict bounded hash-linked history, terminal revocation, and propagation into
active memory and R2 alias resolution in hermetic tests. Retention/deletion/GC
policy enforcement, production ledger/channel wiring, and live R2 proof remain
open, so this row is `Contracted`, not `Implemented`.

### `AGENT-001` Agent and tool consumers

**State** `Contracted`

**Owner** `agent-tooling`

**Dependencies** `CTRL-001`; `CAS-001`; capability and MCP/tool inventories.

**Contract** Agents and tools declare the flags, network routes, content
references, registries, and channels they may consume. Wire input parses once to
branded `ContentRef` and capability types; undeclared capabilities and raw
locator substitution fail closed.

**Target ratchet** `bun run guard:agents:check`

**Fresh rerun** `bun run guard:agents:check`

**Scoped proof** `guard-agent-capabilities-v1`

The strict manifest/invocation boundary, experimental approval checks, exact
ContentRef capabilities, preload authority, and hashed agent-entrypoint
inventory are tested. Repository tools have not all been migrated to execute
through this manifest evaluator, so the row is not yet `Implemented`.

### `OFFLINE-001` Offline zero-socket mode

**State** `Contracted`

**Owner** `networking`

**Dependencies** `CTRL-001`; `NET-001`; `REG-001`; `FEED-001`; `CAS-001`.

**Contract** Offline mode resolves only verified local content and package
artifacts. A socket sentinel proves zero DNS, TCP, proxy, preconnect, registry,
object-store, and external probe activity, including child processes.

**Target ratchet** `bun run guard:offline:check`

**Fresh rerun** `bun run guard:offline:check`

**Scoped proof** `guard-offline-content-v1`

The offline loader resolves verified local objects and rejects configured DNS,
proxy, registry, object-store, and external-probe effects before invoking them.
The feed manifest also rejects missing or corrupt local snapshots without an
online fallback. A reversible process-wide sentinel denies external
`fetch`/`fetch.preconnect`, `Bun.connect`, and Bun's `node:net`, `node:tls`,
`node:http`, `node:https`, `node:http2`, and `node:dgram` compatibility
entrypoints before their captured runtime functions run. It explicitly admits
only `localhost`, IPv4 `127/8`, IPv6 `::1`/mapped loopback test fixtures,
non-network fetch URLs, and local Unix-domain sockets; ambient proxies and
custom lookup/connection transports are disabled. Bun 1.4's immutable
`Bun.fetch`, detached named ESM exports of Node built-ins, child processes,
native addons, and network APIs outside these patchable entrypoints are not
globally observed, so zero-socket mode remains `Contracted` rather than
`Implemented`.

### `PROTO-001` HTTP protocol and proxy matrix

**State** `Contracted`

**Owner** `networking`

**Dependencies** `NET-001`; replay-safe request contract; hermetic direct and
CONNECT-proxy fixtures; experimental approval policy.

**Contract** HTTP/1.1 and HTTP/2 are proven direct. Proxy topology is explicit:
HTTPS/H1 CONNECT is exercised, while Bun 1.4 HTTP/2-over-CONNECT is accepted
only if supported and otherwise must return the exact pre-tunnel
`HTTP2Unsupported` failure. HTTP/3 remains an explicit canary capability until
stable and approved. Fallback never replays an unsafe write, and protocol/cache
keys include route, proxy, TLS, capability expiry, and network state. Identical
bytes produce identical content digests across protocols.

**Target ratchet** `bun run guard:protocol-matrix:check`

**Fresh rerun** `bun run guard:protocol-matrix:check`

**Scoped proof** `guard-protocol-matrix-v1`

The injectable protocol client uses exact Bun `HTTP2Unsupported` errors,
replay-safe or explicitly recreatable fallback, expiring singleflight capability
state, and route/proxy/TLS/protocol/network cache dimensions. The hermetic suite
now exercises direct H1 and H2, HTTPS CONNECT reuse, the exact pre-CONNECT
`HTTP2Unsupported` outcome for proxied H2, an explicit unavailable H3 candidate,
and content-digest parity. QUIC/H3 transport, socket pinning, and unsafe-write
fallback at a live transport boundary remain open, so the full row has not
reached `Tested`.

### `BASE-001` Integration type boundary

**State** `Proven`

**Owner** `sports-terminal-os`

**Dependencies** trusted `PartnerProfileService.listPartners()` summary shape.

**Contract** The integration-health projection consumes the trusted camelCase
interior summary and never reaches back into snake_case wire/database fields.

**Ratchet** `bun run --filter sports-terminal-os typecheck`

**Fresh rerun** `bun run --filter sports-terminal-os typecheck`

**Claim proof** `sports-integration-type-v1`

The exact claim is cataloged with `freshRerunKind: "claim"`; the fresh rerun was
executed from the clean proof worktree at the candidate commit. Its output must
remain attached to the PR under the fresh-rerun contract.

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

The objective is incomplete while any row is below `Proven`. The current states
record only evidence already present on the integration candidate. Any row below
`Proven` remains active work; therefore this map is a work queue, not a
completion claim.
