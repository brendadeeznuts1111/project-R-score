# Vendored `bun-types` (tip)

Pin: oven-sh/bun **`ed700c20`** → `bun-types-1.4.0-tip.ed700c20.tgz`.

Lives under **`tools/vendor/`** (allowlisted root; not a new top-level dir).

Why: npm canary stopped at `1.4.0-canary.20260519T150915`; tip types add BuildConfig / CSRF / SQL / `isStandaloneExecutable` surface. Runtime stays Bun 1.3.14 (`@types/bun` catalog unchanged).

Catalog pin (root `package.json`):

```json
"bun-types": "file:tools/vendor/bun-types/bun-types-1.4.0-tip.ed700c20.tgz"
```

Refresh from a Bun checkout:

```bash
SHA=$(git -C /path/to/bun rev-parse --short HEAD)
cp -R /path/to/bun/packages/bun-types /tmp/bun-types-pack
# set "version": "1.4.0-tip.${SHA}" in package.json then:
(cd /tmp/bun-types-pack && npm pack)
cp /tmp/bun-types-pack/bun-types-*.tgz tools/vendor/bun-types/
# update catalog path if tarball name changes
# frozenLockfile false → bun install → restore true
bun run bun:types-inventory:write
bun run bun:types-ci
```
