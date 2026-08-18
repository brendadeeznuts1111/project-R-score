# Research report schema

`behavior-research.json` schema version 3 contains:

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
- `skillImpact`: aggregate turns, errors, interruptions, clean-resolution rate,
  and the turns delta against no-skill baseline sessions.
- `rankedSkills`: at most three active or draft skills ordered by confidence,
  recency, and measured clean-resolution rate.

`.trace-cache.json` schema version 2 stores file size, modification time,
aggregate counts, redacted samples, hashes, and validated aggregate telemetry.
It never stores a complete message or arbitrary trace fields.

`skills.db` is a local `bun:sqlite` registry. It stores skill metadata, trigger
events, and per-session aggregate metrics. Use `--registry <file>` to relocate
it or `--no-registry` to disable it.

Drafts are `<family>.draft.md` files. They are intentionally not active skill
packages and cannot be promoted automatically.

## Skill telemetry events

Telemetry is opt-in JSONL input. Producers must emit aggregate events with an
opaque session ID. Never include prompts, responses, tokens, credentials, user
identifiers, or tool payloads.

Record a trigger when an owning runtime intentionally selects a skill:

```json
{
  "type": "skill_triggered",
  "timestamp": "2026-08-18T00:00:00.000Z",
  "payload": { "skill_name": "ci-and-proof-loop", "session_id": "session-001" }
}
```

Record one terminal summary per session. List selected skills or use an empty
array for a no-skill baseline:

```json
{"type":"session_summary","timestamp":"2026-08-18T00:10:00.000Z","payload":{"session_id":"session-001","turns_to_resolution":6,"error_count":1,"interruption_count":0,"skills":["ci-and-proof-loop"]}}
{"type":"session_summary","timestamp":"2026-08-18T00:20:00.000Z","payload":{"session_id":"session-002","turns_to_resolution":10,"error_count":0,"interruption_count":1,"skills":[]}}
```

All counts must be non-negative integers. Invalid or incomplete events are
ignored. Reprocessing is idempotent by skill and session ID.

Metrics are observational. A favorable delta does not promote a draft, and an
unfavorable delta does not delete an active skill. Both decisions require human
review and repository validation.

Use `bun scripts/record-telemetry.ts --help` through the package entrypoint
`bun run trace:telemetry` to emit validated events. The writer rejects raw
content, non-opaque identifiers, invalid timestamps, and negative counts.
