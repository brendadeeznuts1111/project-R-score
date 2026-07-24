# TOC Ops

Drum / Buffer / Rope partner desk (demo-readonly on Pages).

## Plane

- HTML board: [/portal/toc/](/portal/toc/)
- Artifact: [/registry/toc-ops.json](/registry/toc-ops.json)
- API: `GET /api/toc` (POST → 503)
- Eval: operate-lite Hard Gates + T/I/OE baked into the artifact
- Mutations: toc-ops-repo `ct` or local bun Soft journal — not on Pages

## Agent brief

Read `#toc-agent-brief` on the HTML board, or fetch the JSON artifact.
Theory SSOT: `toc-ops-repo` (TOC-REF · ACCOUNTING · SOPs).

## Commands

```bash
bun run ops:seed:toc
bun run ops:snapshot --no-routing
```

Rebuild an existing fixture with the seed tool force flag.
