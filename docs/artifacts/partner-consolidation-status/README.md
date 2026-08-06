# Partner dashboard MVP proposal

This directory contains a derived, reviewable proposal snapshot of the partner
consolidation lane. The default view includes readiness metrics, a connector
implementation-state graph, and the exact connector cutover table.

- `artifact.json` is the canonical dashboard payload for the snapshot.
- `index.html` is the generated, self-contained, read-only reader.
- `validation.txt` and `foundation-commits.txt` are reviewed source extracts for
  validator counts and delivered branch history.
- `sql/*.sql` are runnable SQLite snapshot queries used by the dashboard source
  affordances. They materialize the reviewed extracts without redefining the
  upstream TOML or design documents.

The dashboard is **not** another partner-domain SSOT or a production data
surface. It is intentionally marked partial while profile coverage is empty.
Its sources remain:

- `docs/design/partner-dashboard-mvp.toml` for MVP composition and policy;
- `scripts/validate-partner-dashboard-plan.ts` for enforced plan counts;
- the semantic and type/reference maps for human interpretation;
- Git history for delivered foundation work.

Regenerate `index.html` from `artifact.json` with the validated portable-artifact
builder supplied by the Data Analytics dashboard workflow. The generated reader
requires no network requests, runtime sidecar, or sibling data file. Serve it
from a local static server for the supported browser-review path; the in-app
browser intentionally blocks direct `file://` navigation.

The current QA receipt records one shared-reader TODO: its `100vw` top bar
overflows by the classic scrollbar width in the bundled headless-shell at the
390px verification viewport. The artifact's structural payload and enhanced
desktop graph/table rendering are verified; the fix belongs in the shared
portable reader rather than an artifact-local HTML patch.
