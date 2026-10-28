# Structured-data operations runbook

Use this runbook for the Project R data-format capability lab and for production
workflows that adopt Bun-native JSON5, JSONL, or XML operations. The lab proves
capability; it does not silently migrate an application parser or promote the
Bun runtime.

## Five independent gates

| Gate | Evidence | Failure state |
| --- | --- | --- |
| Runtime identity | `bun --version` and `bun --revision` | Stop; do not infer capability from documentation or types |
| API contract | Namespace plus every manifest `requiredOperation` | `runtime-gated` below a declared minimum; otherwise `contract-drift` |
| Behavioral proof | Positive, malformed-input, streaming, and round-trip checks as applicable | `proof-failed` |
| Security envelope | Fixture/output byte ceilings, text-only rendering, XML declaration policy | `proof-failed` |
| Exposure | Manifest mode plus fresh live Access proof on both protected hosts | Remain `off` or `preview` |

These gates are conjunctive. Passing one never substitutes for another. A type
declaration, successful import, baked artifact, or static Access declaration is
not runtime or live-edge proof.

## Operation matrix

| Format | Required proof | Explicit non-contract |
| --- | --- | --- |
| JSON | `parse`, `stringify`, malformed rejection, semantic round trip | JSON extensions |
| JSONC | `parse`, malformed rejection | Native stringify |
| JSON5 | `parse`, `stringify`, malformed rejection, semantic round trip | Automatic conversion to strict JSON |
| JSONL | complete `parse`, incremental `parseChunk`, finalization, malformed rejection | Native stringify or silent-prefix acceptance |
| YAML | `parse`, `stringify`, malformed rejection, semantic round trip | Schema-specific coercion guarantees not in the fixture |
| TOML | `parse`, malformed rejection | Native stringify |
| XML | Bun 1.4+ `parse`, `stringify`, malformed rejection, semantic round trip | DOM, DTD validation, namespace resolution, or streaming SAX |

Do not generalize from one operation to a whole namespace. Adding or removing
an operation changes the manifest contract and requires tests plus a new baked
artifact.

## JSONL completeness protocol

`Bun.JSONL.parse()` throws when no value was parsed, but it may return values
parsed before a later syntax error. Therefore a non-throwing `parse()` result is
not sufficient evidence that a critical file or stream was consumed fully.

For critical ingestion:

1. Hash and record the bounded source before parsing.
2. Use `parseChunk` as the completeness authority. Carry the unconsumed suffix
   into the next chunk; never drop it between reads.
3. Treat `read` in the input's unit: characters for strings and byte offsets for
   `Uint8Array`. Slice strings with `slice(read)` and bytes with
   `subarray(read)`; do not mix those units.
4. Stop on a non-null `error`. Record the last committed record count and input
   offset, but do not persist the parser's raw error or source contents.
5. At end of stream, call `parseChunk` on the remainder and require all three:
   `error === null`, `done === true`, and no unconsumed suffix. An incomplete
   final record is a failure even when `error` is null.
6. Compare the accepted record count and final offset with framing or producer
   metadata when that metadata exists. Commit downstream effects only after the
   completeness checks pass, or use an owned idempotent transaction boundary.

`parse()` remains appropriate for a bounded convenience input when the caller
does not claim full-stream integrity, or when an independent framing check has
already proved completeness.

## JSON5 semantic boundary

JSON5 admits values and syntax strict JSON does not, including comments,
trailing commas, `NaN`, positive or negative `Infinity`, hexadecimal numbers,
and signed zero. Parsing JSON5 and then using `JSON.stringify` can erase or
change some of those distinctions.

- Use `Bun.JSON5.stringify` for the native round-trip proof.
- Treat comments and original lexical formatting as non-preserved unless a
  separate source-preserving editor owns that requirement.
- Keep configuration values within the consuming schema. If non-finite numbers
  are allowed, the canonical evidence encoder must distinguish `NaN`, both
  infinities, and negative zero before their hashes can be called semantic
  proof. The current lab fixture intentionally does not claim that coverage.
- Never equate equal serialized text with equal semantics; compare canonical
  parsed values and document any normalization.

## XML shape and security boundary

`Bun.XML` is new in Bun 1.4. Project R's pinned Bun 1.3.14 must report XML as
`runtime-gated`; do not add a polyfill merely to turn the lab green.

After a reviewed runtime promotion:

- Choose compact or tree shape explicitly. Compact shape can change a repeated
  element from one value to an array and does not preserve mixed-content order;
  tree shape preserves ordered children.
- Treat text and attributes as strings. Apply domain coercion only at the wire
  boundary after parsing.
- Treat namespace prefixes as literal names; `Bun.XML` does not resolve
  namespaces for the application.
- Continue rejecting `DOCTYPE` and entity declarations in the lab even though
  Bun's non-validating parser does not fetch external entities. This stricter
  Project R envelope keeps fixtures deterministic and avoids hidden expansion
  work.
- Use a justified third-party parser when the product requires DOM mutation,
  DTD or schema validation, namespace resolution, or streaming SAX behavior.
  Native availability does not erase those requirements.
- Render results as escaped text or structured data. Never inject parsed names,
  attributes, or text through an HTML sink.

## Evidence and timing

- Persist fixture byte counts and SHA-256 digests, operation status, negative
  behavior, runtime version/revision, and the manifest digest. Do not persist
  raw fixtures, raw parsed output, or raw parser errors in a public artifact.
- `Bun.nanoseconds()` is a monotonic process-relative duration source. Store the
  raw delta as `durationNs`; derive `durationMs = durationNs / 1_000_000` only
  for display.
- A single tiny-fixture duration proves unit correctness and catches severe
  regressions; it is not a benchmark or latency service-level objective. Any
  performance gate needs owned fixture classes, warmup policy, sample count,
  percentile, machine profile, and a reviewed baseline.
- Use wall-clock ISO timestamps for artifact generation and Access freshness.
  Never compare `Bun.nanoseconds()` values across processes or restarts.

## Exposure state machine

```text
off --reviewed manifest--> preview --all five gates--> enabled
 ^                              |                         |
 +------ proof/access drift ----+------ emergency rollback+
```

- `off`: no behavioral execution or exposed lab claim.
- `preview`: run proofs and publish diagnostic capability state behind Access;
  runtime-gated formats are allowed and block promotion.
- `enabled`: every declared format is available, behavioral proof passes, and
  live Access evidence is fresh. Any new blocker makes enabled configuration a
  validation failure.

Use the manifest mode as the durable flag. Do not add a second environment flag
that can disagree with it. Host and path protection remain independent policy
gates.

## Operator workflow

```bash
bun --version
bun --revision
bun run bun:channel:check
bun run data-formats:check
```

When the reviewed report changes intentionally:

```bash
bun run data-formats:bake
bun run data-formats:check
```

Before changing `preview` to `enabled`, run the live portal Access doctor from
the owning command documented by the portal tenant, persist only its supported
evidence artifact, rebake, and confirm there are no promotion blockers. A local
HTTP success is not live Access proof.

## Failure handling and rollback

| Symptom | Classification | Response |
| --- | --- | --- |
| API missing below minimum version | Expected runtime gate | Keep preview; promote runtime only through channel governance |
| API missing at or above minimum | Contract drift | Stop promotion; verify runtime revision and official API history |
| Invalid input accepted | Behavioral proof failure | Keep previous parser/flag state; minimize and add a regression fixture |
| JSONL prefix returned before corrupt row | Completeness failure | Reject the batch; preserve last safe offset and investigate producer framing |
| XML cardinality or mixed-content mismatch | Shape-contract failure | Select tree shape or normalize at the wire boundary; do not patch consumers ad hoc |
| Access proof absent or stale | Exposure failure | Keep preview/off; rerun the owned live doctor without weakening freshness |
| Baked artifact differs unexpectedly | Provenance drift | Re-run read-only proof, inspect manifest/runtime digests, and do not hand-edit output |

Rollback is a manifest-mode change to `preview` or `off`, followed by the same
validation and bake workflow. It does not downgrade Bun, delete evidence, or
rewrite unrelated application parsers.
