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
