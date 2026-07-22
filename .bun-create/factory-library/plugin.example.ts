// @see https://bun.sh/docs/runtime/plugins#onresolve — onResolve lifecycle hook
import type { BunPlugin } from "bun";

/**
 * Factory registry plugin — resolves `@factorywager/<name>` imports to
 * locally installed artifacts.
 *
 * Usage:
 *   import { factoryPlugin } from "./plugin.example";
 *   await Bun.build({ entrypoints: ["./app.ts"], plugins: [factoryPlugin] });
 *
 * After `factory install my-lib`:
 *   import { hello } from "@factorywager/my-lib";
 *   // → resolves to ./node_modules/@factorywager/my-lib/src/index.ts
 */
export const factoryPlugin: BunPlugin = {
  name: "factorywager-resolver",
  setup(build) {
    build.onResolve({ filter: /^@factorywager\// }, args => {
      // Strip the scope prefix and resolve to the installed artifact
      const pkg = args.path.replace("@factorywager/", "");
      return {
        path: `./node_modules/@factorywager/${pkg}/src/index.ts`,
      };
    });
  },
};
