# Partner consolidation delivery dashboard

This directory contains a derived, reviewable snapshot of the partner
consolidation lane:

- `artifact.json` is the canonical dashboard payload for the snapshot.
- `index.html` is the generated, self-contained, read-only reader.
- `validation.txt` and `foundation-commits.txt` are the reviewed source extracts
  for validator counts and delivered branch history.
- `sql/*.sql` are runnable SQLite snapshot queries used by the dashboard source
  affordances. They materialize the reviewed extracts without redefining the
  upstream TOML or design documents.

The dashboard is **not** another partner-domain SSOT. Its sources remain:

- `docs/design/partner-dashboard-mvp.toml` for MVP composition and policy;
- `scripts/validate-partner-dashboard-plan.ts` for enforced plan counts;
- the semantic and type/reference maps for human interpretation;
- Git history for delivered foundation work.

Regenerate `index.html` from `artifact.json` with the validated portable-artifact
builder supplied by the Data Analytics dashboard workflow. The generated reader
requires no network requests, runtime sidecar, or sibling data file.
