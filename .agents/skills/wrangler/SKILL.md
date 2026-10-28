---
name: wrangler
description: Operate the current Cloudflare Wrangler CLI for Workers and related resources. Use when inspecting or changing wrangler configuration, running local development, generating types, validating or deploying Workers, managing bindings or secrets, or diagnosing Wrangler commands. Retrieve exact flags and schemas from the installed CLI and official Cloudflare documentation before acting.
---

# Wrangler CLI

Wrangler changes frequently. Treat the repository's installed version, configuration, and scripts as operational authority; use current official documentation for behavior they do not explain.

## Start with local authority

1. Resolve the owning repository and read its applicable `AGENTS.md` files.
2. Inspect `package.json`, the lockfile, and `wrangler.jsonc`, `wrangler.json`, or `wrangler.toml` before proposing commands.
3. Prefer repository scripts. Otherwise use the repository-local CLI through `bun x wrangler`.
4. Record the actual CLI surface before using a changing command:

```bash
bun x wrangler --version
bun x wrangler <command> --help
```

5. Read the installed schema at `node_modules/wrangler/config-schema.json` when present. Retrieve the current official command or configuration page for exact fields and flags.

Do not install `wrangler@latest` merely because the CLI is absent. First determine whether dependencies have been installed and whether the repository pins Wrangler. Change the dependency only when dependency maintenance is in scope.

## Configuration rules

- Treat the checked-in Wrangler configuration as the deployment source of truth.
- Prefer `wrangler.jsonc` for a new project unless the owning repository specifies another format. Do not convert an existing configuration without a scoped migration and validation.
- For a new Worker, select a current `compatibility_date`. For an existing Worker, do not advance it mechanically: inspect the intervening compatibility flags, test the application, and preserve an explicit rollback path.
- Keep environment selection explicit. Confirm whether a command targets local state, a remote development resource, staging, or production.
- Regenerate Worker types after binding changes using the exact script or `wrangler types` form owned by the repository.
- Never infer account IDs, resource IDs, binding names, or environment names.

## Mutation boundary

Classify the command before running it:

- Read-only or local: version/help, config inspection, type generation, local development, and repository tests are normally safe within scope.
- Remote reads: authentication checks, logs, and resource listings may expose operational data; keep output minimal and avoid recording secrets.
- Remote writes: deploy, delete, secret changes, migrations, resource creation, and remote data operations change external state. Run them only when the user has authorized that outcome and the exact target is known.

Use supported interactive or secret-management input. Never place secret values in command arguments, source files, examples, logs, or shell history. A command that accepts a secret name does not imply authority to rotate its value.

## Verification ladder

Use the smallest proof that matches the change:

1. Confirm the local Wrangler version and targeted `--help` output.
2. Validate configuration against the installed schema and generate types when bindings changed.
3. Run the repository's focused tests and local-development proof.
4. Use a supported dry-run command only after confirming it in the installed CLI.
5. Deploy or mutate remote resources only when explicitly in scope, then verify the named environment and preserve the resulting deployment identifier.

Do not present a successful local build, global doctor, or CLI parse as deployment proof.

## Current sources

- [Wrangler documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Compatibility dates](https://developers.cloudflare.com/workers/configuration/compatibility-dates/)
- [Install and update Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

Retrieve only the pages needed for the task. Do not copy a large command catalog into this skill; the installed CLI and official documentation are fresher and more precise.
