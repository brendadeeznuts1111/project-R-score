# Effect Reference — Plannator

Grounding card for [Effect-TS](https://effect.website/) patterns. Use Effect when a workflow needs typed errors, structured concurrency, retries, or parallel orchestration.

## Canonical sources

- Effect docs: <https://effect.website/docs>
- Effect API reference: <https://effect-ts.github.io/effect/>
- GitHub: <https://github.com/Effect-TS/effect>

## When to use Effect

Use Effect for:

- CLI tools with typed failures
- Parallel file/archive analysis
- Retry/backoff around external commands
- Structured concurrency (fork/join, scopes)

Avoid Effect for:

- One-shot pure helpers
- Simple synchronous transforms
- Anything easier to test as a plain function

## Core patterns

### Building an Effect

```ts
import { Effect } from "effect";

const readPlan = (path: string) =>
  Effect.tryPromise({
    try: () => Bun.file(path).text(),
    catch: (error) => new FileReadError({ path, error }),
  });
```

### Tagged errors

```ts
import { Data } from "effect";

class FileReadError extends Data.TaggedError("FileReadError")<{
  path: string;
  error: unknown;
}> {}
```

Always prefer tagged errors over generic strings or `Error`.

### Generator style

```ts
const program = Effect.gen(function* () {
  const text = yield* readPlan("plan.md");
  const lines = yield* Effect.sync(() => text.split("\n"));
  return lines.length;
});
```

### Running an Effect

```ts
const count = await Effect.runPromise(program);
```

Use `runPromise` for async CLI work. Use `runSync` only when the Effect is fully synchronous.

### Mapping and flatMapping

```ts
const withSummary = program.pipe(
  Effect.map((n) => ({ lineCount: n })),
  Effect.tap(({ lineCount }) => Effect.log(`Read ${lineCount} lines`))
);
```

### Error handling

```ts
const safe = program.pipe(
  Effect.catchTag("FileReadError", (e) =>
    Effect.succeed({ lineCount: 0, error: e.error })
  )
);
```

Use `catchTag` for specific errors. Use `catchAll` only when you genuinely want to handle every failure the same way.

### Parallel work

```ts
const combined = Effect.all([readPlan("a.md"), readPlan("b.md")], {
  concurrency: "unbounded",
});
```

Use `Effect.all` for independent tasks. Set `concurrency` to bound parallelism when needed.

### Retry / repeat

```ts
const resilient = Effect.retry(
  fetchStatus,
  Schedule.exponential("100 millis").pipe(Schedule.intersect(Schedule.recurs(3)))
);
```

### Structured concurrency

```ts
const forked = Effect.gen(function* () {
  const fiber = yield* Effect.fork(longRunningAnalysis);
  const result = yield* Fiber.join(fiber);
  return result;
});
```

Prefer `Effect.fork` + `Fiber.join` over raw Promise races.

## CLI main pattern

```ts
import { Effect } from "effect";

const program = Effect.gen(function* () {
  // parse args, run work, write output
  yield* Effect.log("Done");
});

Effect.runPromise(program).catch((error) => {
  console.error(error);
  process.exit(1);
});
```

Keep the imperative boundary small: parse argv, build an Effect program, then run it.

## Integration with Bun APIs

Effect does not replace Bun APIs. Wrap Bun I/O at the boundary:

```ts
const readJsonFile = (path: string) =>
  Effect.tryPromise({
    try: () => Bun.file(path).json(),
    catch: (error) => new FileReadError({ path, error }),
  });
```

Do not wrap every `Bun.file` call in Effect if the call site is already inside a simple async function.

## Anti-patterns

| Avoid | Prefer |
| --- | --- |
| Mixing `process.exit()` in business logic | Central exit handling after `Effect.runPromise` |
| Catching all failures and re-labeling as generic errors | `catchTag` with specific tagged errors |
| Converting every function to Effect | Plain functions for pure/sync work |
| Deep nested `pipe` chains | `Effect.gen` for multi-step sequential logic |

## Verification

Run the grounding script to verify reference files are present:

```bash
bun run ground-references
```
