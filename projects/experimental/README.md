# Experimental tier

Prototypes, demos, and proofs-of-concept. May promote to `active/`, freeze under `archive/`, or delete.

## Status

Bucket exists for triage. **No projects relocated yet** — candidates still under `active/` until an explicit `git mv`:

| Candidate (under `active/`) | Why experimental |
|-----------------------------|------------------|
| `games/2048` | Demo game, not platform product |
| `apps/cli-dashboard`, `apps/edge-worker`, `apps/my-bun-app` | Tiny Bun demos |
| `tools/zig-self-bun`, `tools/rust-bun-plugin` | Native experiment toolchains |
| `utilities/keyboard-shortcuts-lite` | Lightweight utility demo |

## Promote / freeze

```bash
git mv projects/experimental/<name> projects/active/<name>
git mv projects/active/<path> projects/experimental/<name>
git mv projects/experimental/<name> projects/archive/<name>
```

Each project keeps its own `bun install` / lockfile. Root workspaces do **not** auto-include this tree.
