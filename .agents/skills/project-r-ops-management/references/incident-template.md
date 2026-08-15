# Incident template

- capturedAtUTC: `<ISO timestamp>`
- branch: `<branch>`
- sha: `<commit sha>`
- operator: `<name>`
- objective: `<owned blocker to clear>`

## Pre-state

Record the exact failing command and output. For runtime/type incidents include
`bun --version`, `bun --revision`, and `bun run bun:channel:check`.

## Actions

List commands and file changes in order. Separate observation, promotion, and
installation actions.

## Post-state

Record the focused proof, staged hook, and merge proof results.

## Rollback

Record the previous SHA and exact rollback sequence.
