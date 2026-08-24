# Bun 1.4 CLI example

Minimal harness CLI using [`lib/harness/bun-cli.ts`](../../lib/harness/bun-cli.ts).

```bash
bun examples/bun-1.4-cli/cli.ts --help
bun examples/bun-1.4-cli/cli.ts --ping
bun examples/bun-1.4-cli/cli.ts --json --ping
bun examples/bun-1.4-cli/cli.ts --typo   # gate · why · fix
```

**Patterns:** `Bun.markdown.ansi` help · `printGateFailure` · `--json` · `Bun.spawnSync` via `spawnText` · `process.exitCode` (not `Bun.exit`).

Production cousin: `bun run sync:main`.

## Bundle metafile (Bun 1.4)

Two surfaces ([blog](https://bun.com/blog/bun-v1.4#metafile-true) · [#metafile-md](https://bun.com/blog/bun-v1.4#metafile-md)):

| Surface | Since | What |
| -------- | ----- | ---- |
| `Bun.build({ metafile: true })` | 1.3.6 · improved 1.4.0 | esbuild-format `inputs` / `outputs` → [analyze](https://esbuild.github.io/analyze/) |
| `bun build --metafile-md` | 1.3.8 · improved 1.4.0 | Markdown graph for LLMs / grep |

**Import path alignment ([#34534](https://bun.com/blog/bun-v1.4#backpressure)):** bundled `imports[].path` is the same string as the `metafile.inputs` key (e.g. `lib/harness/bun-cli.ts`). `original` keeps the relative specifier. Before 1.4, `path` was often a raw specifier or absolute path, so `metafile.inputs[path]` never matched.

```bash
# one-shot: meta.json + meta.md under examples/bun-1.4-cli/dist/ (gitignored)
bun examples/bun-1.4-cli/build-meta.ts
bun run example:bun-1.4-cli:meta

# or raw CLI (always --target=bun here — browser target cannot import `bun`)
bun build ./examples/bun-1.4-cli/cli.ts --target=bun --outdir=./examples/bun-1.4-cli/dist \
  --metafile=./examples/bun-1.4-cli/dist/meta.json \
  --metafile-md=./examples/bun-1.4-cli/dist/meta.md
```

API sketch:

```ts
const result = await Bun.build({
  entrypoints: ["./examples/bun-1.4-cli/cli.ts"],
  target: "bun",
  outdir: "./examples/bun-1.4-cli/dist",
  metafile: true,
});
// path is the inputs key; original is the source specifier
const edge = result.metafile!.inputs["examples/bun-1.4-cli/cli.ts"].imports[0];
console.log(edge.path in result.metafile!.inputs); // true on Bun ≥1.4
console.log(edge.original); // e.g. "../../lib/bun-executable.ts"
```

Heavier monorepo graph audit: `bun run audit:packages`.
