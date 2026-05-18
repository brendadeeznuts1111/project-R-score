# Project Triage

Each project under `projects/` is classified into one of three tiers:

| Directory | Meaning | Lifecycle |
|-----------|---------|-----------|
| `active/` | Actively developed or maintained | Regular updates, CI, reviews |
| `experimental/` | Prototypes, proofs-of-concept, sandbox | May promote to active, archive, or delete |
| `archive/` | Frozen research, no longer actively worked on | Read-only, kept for reference |

## Rules

- Each project is independent — no shared workspaces with the root.
- Each project runs its own `bun install`, `bun test`, etc.
- The root `package.json` workspace only covers `packages/*`, `factorywager/registry/packages/*`, `kimiremote/packages/*`, and `lib/*`.
- To promote from `experimental/` to `active/`: `git mv projects/experimental/<name> projects/active/<name>`
- To archive from `active/` to `archive/`: `git mv projects/active/<name> projects/archive/<name>`
