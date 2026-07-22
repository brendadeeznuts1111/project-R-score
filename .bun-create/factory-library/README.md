# {{name}}

{{description}}

## Usage

```ts
import { hello } from "{{name}}";

console.log(hello());
```

## Development

```bash
bun install
bun test
bun run build
```

## Consumers

If other projects import this library via `@factorywager/{{name}}`, use the
Bun plugin in `plugin.example.ts` to resolve the import path at build time:

```ts
import { factoryPlugin } from "../plugin.example";
await Bun.build({ entrypoints: ["./app.ts"], plugins: [factoryPlugin] });
```

See [Bun Plugins](https://bun.sh/docs/runtime/plugins#onresolve) for the full API.

## Configuration

`bunfig.toml` is pre-configured with:

- **Console depth** — `[console] depth = 4` for `console.log` / `Bun.inspect` output
- **Inline env vars** — `[serve.static] env = "PUBLIC_*"` exposes `process.env.PUBLIC_*`
  variables to frontend bundles at build time. Set `PUBLIC_REGISTRY_URL` in `.env` and
  Bun inlines it — no custom plugin needed.

See [Inline Environment Variables](https://bun.sh/docs/bundler/fullstack#inline-environment-variables).
