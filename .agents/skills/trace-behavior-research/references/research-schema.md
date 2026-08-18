# Research report schema

`behavior-research.json` schema version 2 contains:

- `schemaVersion`: integer version of the report contract.
- `generatedAt`: report timestamp used for history ordering.
- `source`: trace totals, `since`, and incremental cache hit/rescan counts.
- `clusters`: sorted repeated behaviors. Each item has `label`, `count`,
  `sessions`, `confidence`, `lastSeen`, up to three redacted samples,
  `evidenceHashes`, and `promotion`.
- `promotion`: `candidate` when the behavior meets the minimum count and session
  spread; otherwise `observe`.
- `trend`: new families, changes greater than 20%, and families absent for seven
  days.

`.trace-cache.json` stores file size, modification time, aggregate counts,
redacted samples, and hashes. It never stores a complete message or arbitrary
trace fields.

Drafts are `<family>.draft.md` files. They are intentionally not active skill
packages and cannot be promoted automatically.
