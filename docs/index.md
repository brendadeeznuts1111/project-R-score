# Welcome to Bun Docs

This is a sample documentation file.

## Getting Started

1. Edit this file in `./docs/`
2. Run `bun-docs publish`
3. View your published documentation

## Features

- 📚 Documentation publishing
- 📡 RSS feed monitoring
- 🗄️ R2 storage management
- 🐚 Interactive shell
- 🩺 System diagnostics
- 📊 Analytics and reporting

## Policy Index

- Bun-first engineering policy: `docs/bun/BUN_FIRST_POLICY.md`
- JSON response rule: prefer `Response.json(data)` over
  `new Response(JSON.stringify(data))`
- Runtime baseline: enforce Bun v1.3.6+ reliability/security fixes listed in
  `docs/bun/BUN_FIRST_POLICY.md`
- Generated release-note docs: `docs/generated/bun-release-notes/`
- Demo/template outputs location: `examples/demos/bun/`

For more information, run `bun-docs --help`.
