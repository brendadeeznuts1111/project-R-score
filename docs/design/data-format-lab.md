# Data-format capability lab

The lab exposes repository-owned fixture proofs for Bun-native structured-data
APIs at `/portal/labs/data-formats/`. It is a static portal board behind the
existing Cloudflare Access boundary, not a request-time parser.

## Control planes

Two independent controls prevent a feature flag from becoming a false runtime
claim:

1. `config/data-format-lab.json` owns reviewed product exposure:
   `off | preview | enabled`.
2. `lib/data-format-lab.ts` probes the operations present in the running Bun
   binary, executes every declared operation, and reports
   `available | runtime-gated | contract-drift | proof-failed`.

`off` hides capability rows. `preview` exposes baked fixture evidence to the
Access-protected lab. `enabled` represents product approval, but still cannot
override a missing runtime capability. A missing operation is permitted only
when the manifest names a future minimum Bun version; otherwise the bake fails
as contract drift.

`enabled` is fail-closed: the bake rejects it while any format is gated, while
any declared operation is missing, when a fixture proof fails, or without a
successful live Access probe baked within the previous 24 hours. `preview`
permits declared promotion blockers but not contract drift or proof failure.

The pinned production runtime remains authoritative. `Bun.XML` has a declared
minimum of Bun 1.4.0, so Bun 1.3.14 reports it as runtime-gated. The XML API is
not polyfilled and the production runtime is not promoted to satisfy the lab.

## Execution and security boundary

- Fixtures are committed, size-bounded inputs; there is no arbitrary browser
  paste or upload path.
- Parsed/serialized output is independently size-capped. The public artifact
  records byte counts and SHA-256 digests rather than fixture contents or
  parser output.
- Each available parser must accept its positive fixture and reject its
  committed negative fixture. Rejection may be an exception or a structured
  error result, which matters for streaming `Bun.JSONL.parseChunk`.
- Formats with both parse and stringify must survive a semantic
  parse → stringify → reparse round trip.
- Operation timing uses the monotonic `Bun.nanoseconds()` clock. Artifacts label
  the raw `durationNs` and the derived `durationMs = durationNs / 1,000,000`;
  nanoseconds are never rendered with an `ms` suffix.
- Parsing runs only under Bun during `bun run data-formats:bake`.
- Pages serves the resulting `/portal/registry/data-format-lab.json` under the
  protected path; Pages Functions are not treated as a Bun runtime.
- XML doctypes and entity declarations fail manifest validation.
- Browser rendering uses DOM `textContent`; parsed values are never injected as
  markup.
- The manifest fixes the surface to Cloudflare Access and build-time-static
  execution. The bake cross-checks both Pages hosts in `config/surfaces.toml`
  and `.cloudflare-access.yml`. Requests arriving through an unprotected Pages
  alias are redirected to the Access-protected canonical score host; a query
  parameter cannot enable it.

## Promotion sequence

1. Keep `mode: preview` while the production pin lacks `Bun.XML`.
2. Test the candidate stable Bun release in the monitoring lane and bake the
   same fixture report there.
3. Promote the repository runtime through the Bun channel governance workflow;
   do not change the runtime as part of the feature flag edit.
4. Require XML `parse` and `stringify` fixture proof with zero contract drift.
5. Refresh live Access evidence with
   `bun tools/portal-cli.ts doctor --group infra --verbose` and verify both
   Pages hosts challenge unauthenticated requests.
6. Change `mode` to `enabled` in a separate reviewed change and run:

```sh
bun run data-formats:check
bun run portal:theme:check
bun run validate:colors
bun run verify:portal:static
bun run portal:css:score:power
```

A future interactive parser is a separate service design: it needs an actual
Bun execution host, input quotas, content-type handling, schema/size limits,
timeouts, and abuse controls. It must not be smuggled into the static Pages
surface or enabled by reusing this manifest.
