# Search governance journey proof

## Claim

The search governance surface returns results for a known query. “Done” means policy check passes, `search-smart` yields hits for `governance`, and a headless browser types that query, submits, and asserts at least one `.result-item`.

## Evidence

- **`tests/journey/search-governance.test.ts`** — real `search:policy:check` + `search-smart` → local UI → WebView type/submit/assert; failure screenshot  
  *Ratchet* → `bun run test:search-governance`
- **`lib/harness/proof.ts` / `PROOF.md`** — claim `search-governance-basic`  
  *Ratchet* → proof inventory
- **CI** — Search Governance workflow runs the journey  
  *Ratchet* → `.github/workflows/search-governance.yml`

## Fresh-rerun

`bun run test:search-governance` — paste output in the PR when touching this journey ([`FRESH-RERUN.md`](FRESH-RERUN.md)).

## Notes

In-tree there is no separate staging SPA. The journey serves a minimal UI over live `search-smart` hits (same materialize pattern as install-verify). Set `SEARCH_GOVERNANCE_URL` to point at an external host when one exists.
