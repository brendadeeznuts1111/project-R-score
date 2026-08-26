# Outbound consumer ownership

`config/outbound-consumers.json` is the exact, AST-derived inventory of
server-side `fetch`, `Bun.fetch`, and approved typed outbound-boundary call
expressions under `lib/`, `packages/`, `scripts/`, `tools/`, `server/`, and
`projects/active/`.

Run `bun run guard:outbound-consumers:check`. The guard rejects both newly added
calls and removed or structurally changed calls until the manifest is reviewed.
Comments do not authorize a call. Identity is the repository path, callee,
SHA-256 expression fingerprint, and duplicate occurrence index; line and column
are review metadata only.

Every row has one classification and a non-empty owner and reason:

- `owned-policy-boundary` — the call enters a typed boundary backed by
  `lib/http/outbound-policy.ts`.
- `intentional-native-probe` — a reviewed online verification path where native
  transport behavior is the subject of the probe.
- `unowned` — a visible migration gap. These rows are not silently allowlisted;
  the exact debt remains queryable and cannot drift without review.

The first repository-wide baseline records 824 exact rows: 37 guarded-boundary
calls, 45 native verification calls, and 742 explicit unowned calls. That volume
is evidence that the repository-wide ownership goal is not yet complete. This
change closes three high-risk configurable consumers: Bun documentation HEAD
validation, npm package metadata reads, and operator-research URL retries. They
now use the public-resource boundary, which requires HTTPS, rejects URL/header
credentials, redirects, proxy/TLS/protocol/experimental overrides, non-public or
mixed DNS answers, and over-limit streamed responses. Its offline mode rejects
before DNS resolution or fetch.

The largest remaining domains are nested standalone products under
`projects/active/`, followed by root operational/Telegram consumers and registry
storage/webhook implementations. Their rows deliberately remain `unowned` until
each owning domain supplies a typed policy and hermetic negative proof.
