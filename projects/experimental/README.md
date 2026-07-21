# Experimental tier

Prototypes, demos, and proofs-of-concept. May promote to `active/`, freeze under `archive/`, or delete.

## On disk

| Path | Why experimental |
|------|------------------|
| `2048` | Demo game, not platform product |
| `cli-dashboard`, `edge-worker`, `my-bun-app` | Tiny Bun demos (ex-`active/apps/`) |
| `zig-self-bun`, `rust-bun-plugin` | Native experiment toolchains (ex-`active/tools/`) |
| `keyboard-shortcuts-lite` | Lightweight utility demo (ex-`active/utilities/`) |
| `tan-bun` | Scratch takes / profile experiments (ex-`active/utilities/`) |
| `testing` | Misnamed Dev HQ / proxy playground (ex-`active/utilities/`) |

## Promote / freeze

```bash
git mv projects/experimental/<name> projects/active/<name>
git mv projects/active/<path> projects/experimental/<name>
git mv projects/experimental/<name> projects/archive/<name>
```

Each project keeps its own `bun install` / lockfile. Root workspaces do **not** auto-include this tree.
