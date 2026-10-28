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

The current repository-wide baseline records 438 exact rows: 99 guarded-boundary
calls, 64 native verification calls, and 275 explicit unowned calls. That volume
is evidence that the repository-wide ownership goal is not yet complete. The
reviewed migrations now include high-risk configurable root consumers plus the
Matrix, Kal Poly Bot, Factory registry, and bounded Fantasy42 tranches. Their
typed boundaries require exact origins and methods, bind credentials, reject
redirects and proxy/TLS/protocol/experimental overrides unless explicitly owned,
classify replay safety, bound deadlines and response bytes, and reject offline
requests before DNS resolution or transport effects.

The largest remaining domain is the still-unmigrated portion of Fantasy42,
followed by Bun TOML Secrets Editor, Geelark, other nested products, and root
operational/Telegram consumers. Their rows deliberately remain `unowned` until
each owning domain supplies a typed policy and hermetic negative proof.
