# Partner dashboard MVP proposal

<!-- REF:ID 0.1.partner-consolidation-status -->
<a id="0.1.partner-consolidation-status"></a>

This directory contains a derived, reviewable proposal snapshot of the partner
consolidation lane. The default view includes readiness metrics, a connector
implementation-state graph, and the exact connector cutover table. Its Sports
Terminal row is backed by a four-row API/HTML boundary audit extract.

- `artifact.json` is the canonical dashboard payload for the snapshot.
- `index.html` is the generated, self-contained, read-only reader.
- `validation.txt` and `foundation-commits.txt` are reviewed source extracts for
  validator counts and delivered branch history.
- `sql/*.sql` are runnable SQLite snapshot queries used by the dashboard source
  affordances. They materialize the reviewed extracts without redefining the
  upstream TOML or design documents.

The dashboard is **not** another partner-domain SSOT or a production data
surface. Profile coverage is now materialized for ASH · BIL · NOV · SPEN; the
snapshot remains partial while other connectors and the one-artifact board cutover remain open. Its
sources remain:

- `docs/design/partner-dashboard-mvp.toml` for MVP composition and policy;
- `scripts/validate-partner-dashboard-plan.ts` for enforced plan counts;
- the semantic and type/reference maps for human interpretation;
- Git history for delivered foundation work.

The connector table's Sports Terminal row records why it remains blocked: the
React page is mounted, but the matching `partnerRoutes` module is not mounted by
the main API router; its detail shape also mixes bare IDs, private
contact/Telegram fields, lifecycle, limits, and floating-point money. The row
and its SQL extract are cutover evidence, not a new API authority.

Regenerate `index.html` from `artifact.json` with the validated
portable-artifact builder supplied by the Data Analytics dashboard workflow. The
generated reader requires no network requests, runtime sidecar, or sibling data
file. Serve it from a local static server for the supported browser-review path;
the in-app browser intentionally blocks direct `file://` navigation.

The current QA receipt records one shared-reader TODO: its `100vw` top bar
overflows by the classic scrollbar width in the bundled headless-shell at the
390px verification viewport. The artifact's structural payload and enhanced
desktop graph/table rendering are verified; the fix belongs in the shared
portable reader rather than an artifact-local HTML patch.

The refreshed `artifact.json` and `sql/partner-plan.sql` classify the bookmakers
connector as partial after its catalog parser landed. Regeneration of
`index.html` remains withheld because the portable builder now treats that same
shared-reader mobile overflow as a hard verification failure. Until the shared
reader is fixed, `artifact.json` is the current proposal snapshot and the
existing HTML is the prior verified render.
