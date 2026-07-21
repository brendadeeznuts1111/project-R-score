# Experimental tier

Prototypes, demos, and proofs-of-concept. May promote to `active/`, freeze under `archive/`, or delete.

Each top-level folder is a **product leaf** and MUST have `README.md` + `package.json`. Nested takes stay inside the parent (`codepoint/*`, `tan-bun/TAKE-*`).

Triage SSOT: [`../README.md`](../README.md).

## On disk

| Path | Why experimental |
|------|------------------|
| [`2048/`](2048/) | Demo game, not platform product |
| [`cli-dashboard/`](cli-dashboard/), [`edge-worker/`](edge-worker/), [`my-bun-app/`](my-bun-app/) | Tiny Bun demos (ex-`active/apps/`) |
| [`zig-self-bun/`](zig-self-bun/), [`rust-bun-plugin/`](rust-bun-plugin/) | Native experiment toolchains (ex-`active/tools/`) |
| [`keyboard-shortcuts-lite/`](keyboard-shortcuts-lite/) | Lightweight utility demo (ex-`active/utilities/`) |
| [`tan-bun/`](tan-bun/) | Scratch takes / profile experiments |
| [`testing/`](testing/) | Misnamed Dev HQ / proxy playground |
| [`codepoint/`](codepoint/) | Nested proxy / dashboard sandbox |
| [`api-plive-setup-discovery/`](api-plive-setup-discovery/) | One-shot Plive discovery tooling |

## Promote / freeze

```bash
git mv projects/experimental/<name> projects/active/<name>
git mv projects/active/<path> projects/experimental/<name>
git mv projects/experimental/<name> projects/archive/<name>
```

Each project keeps its own `bun install` / lockfile. Root workspaces do **not** auto-include this tree.
