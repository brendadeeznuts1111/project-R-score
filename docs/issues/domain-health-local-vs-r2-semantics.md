# Domain Health Source Semantics: local vs r2

## Summary
`source=local` intentionally uses placeholder storage keys, while `source=r2` reflects actual bucket objects. This can appear as false critical storage unless source context is explicit.

## Repro
1. Load dashboard in local mode.
2. Observe storage summary in Domain Health.
3. Switch to R2 and compare.

## Actual
- Local mode can show missing storage (`0/3`) by design.
- Users can interpret this as a real R2 outage.

## Expected
- Source context and semantics are explicit in the UI.

## Acceptance Criteria
- Clear source badge and mode hint in Domain Health.
- Optional separation between "Local simulated storage" and "R2 storage".
- Optional remembered preferred source in UI state.

