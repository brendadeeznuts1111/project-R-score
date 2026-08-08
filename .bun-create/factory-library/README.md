# Bun-native library

This is a small, test-first starting point for a library consumed by Bun.

## First five minutes

1. Set the package `description` and confirm the generated `name` in `package.json`.
2. Replace the `hello` example in `src/index.ts` with the public API.
3. Update the matching tests in `src/index.test.ts`.
4. Run the local proof:

```bash
bun test
bun run build
bun pm pack --dry-run
```

`exports`, `module`, and `types` intentionally point at TypeScript source: this is a
Bun-native template, not a precompiled Node/browser distribution. Keep the public API
at `src/index.ts` unless you deliberately introduce a build-and-declaration pipeline.

## Scaffold from the monorepo

Run this from the FactoryWager monorepo root, where `.bun-create/factory-library` is
available. Bun names the new package from the destination directory.

```bash
# Preferred: the Factory wrapper provides consistent local-template routing.
bun run factory:create -- factory-library ./packages/my-library

# Direct Bun route: equivalent when run from the monorepo root.
bun create factory-library ./packages/my-library
```

`bun create` initializes Git and installs dependencies by default. Use Bun's documented
create flags only when needed; inspect them on the active runtime with `bun create --help`.
The destination must be disposable: local-template scaffolding may replace it.

## Development

```bash
bun install
bun dev
bun test
bun run test:coverage
bun run build
bun run bench          # Bun.nanoseconds throughput JSON
bun run profile:cpu    # same workload under --cpu-prof → ./profiles/*.cpuprofile
```

### Scaffold metrics

| Script | Metric | Unit / shape | Profile |
| ------ | ------ | ------------ | ------- |
| `bench` | `helloThroughput` | JSON: `iterations`, `totalNs`, `meanNs`, `opsPerSec`, `bunVersion` | n/a |
| `profile:cpu` | same workload | Bun `.cpuprofile` under `./profiles/` | `--cpu-prof` |

Harness catalog (monorepo root): `bun run bench:status` ·
[`docs/harness/tenants/bun-bench-profiling.md`](../../docs/harness/tenants/bun-bench-profiling.md).
Upstream: [Bun benchmarking](https://bun.com/docs/project/benchmarking).

## Package and publish


Package from this library directory, then publish the resulting archive from the
monorepo root. Publishing is an explicit, separate operation.

```bash
# In the library directory
bun pm pack

# In the monorepo root; replace paths and metadata with the actual values.
bun run factory:publish ./packages/my-library/my-library-0.1.0.tgz \
  --name my-library --version 0.1.0 --type library
```

If portal consumers need the new registry state, refresh the static snapshot after a
successful publish:

```bash
bun run factory:snapshot
```

`factory create ... --publish` registers a scaffold marker; it does not replace the
archive publish step above.

## Configuration

`bun dev` watches and executes the source entry point while you work. `bunfig.toml` keeps
child processes tied to the parent and configures readable console output. `[serve.static]
env = "PUBLIC_*"` is only for non-secret browser configuration.
