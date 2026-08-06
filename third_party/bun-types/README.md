# Vendored `bun-types` (tip)

Pin: oven-sh/bun `ed700c20` → packed as `bun-types-1.4.0-tip.ed700c20.tgz`.

Why: npm canary stops at `1.4.0-canary.20260519T150915`; tip types add BuildConfig/CSRF/SQL/`isStandaloneExecutable` surface used by the local tip-diff green target.

Refresh:
```bash
# from a checkout of oven-sh/bun at the desired SHA
cp -R packages/bun-types /tmp/bun-types-pack
# set version in package.json then:
(cd /tmp/bun-types-pack && npm pack)
cp /tmp/bun-types-pack/bun-types-*.tgz third_party/bun-types/
# update package.json catalog pin path if the tarball name changes
bun install
bun run bun:types-inventory:write
bun run bun:types-ci
```
