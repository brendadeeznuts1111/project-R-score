---
name: sandbox-sdk
description: Route and operate Cloudflare Sandbox SDK work across the stable package, the 1.0 preview package, and migrations between them. Use for isolated code execution, interpreters, terminals, files, ports, tunnels, lifecycle, container configuration, or Sandbox SDK upgrades. Inspect the installed package line and retrieve its current official documentation before changing code.
---

# Cloudflare Sandbox SDK

The upstream skill is now split by package line. This Project R router preserves one trigger while preventing stable and preview APIs from being mixed.

## Gate on the installed line

Before writing code:

1. Read the owning repository guidance, package manifest, lockfile, Wrangler configuration, and container image.
2. Determine whether `@cloudflare/sandbox` is stable, `@next`, or another preview tag.
3. Confirm that the Worker package and container image use the same line.
4. Retrieve the matching official documentation and inspect installed types. Do not use remembered method signatures.

Route the work:

- Stable dependency and stable image: use the [stable Sandbox documentation](https://developers.cloudflare.com/sandbox/).
- `@cloudflare/sandbox@next` and matching preview image: use the [1.0 preview documentation](https://developers.cloudflare.com/sandbox/1-0-preview/).
- Stable-to-preview migration: follow the [migration guide](https://developers.cloudflare.com/sandbox/1-0-preview/migrate/) as an explicit migration, not an incidental dependency update.
- Stable bridge deployments remain on the stable line unless current official documentation says otherwise.

Stop and report a mismatch when the package and image lines differ. Do not partially apply preview APIs to a stable application.

## Operating workflow

1. Retrieve only the relevant current guide and API pages.
2. Inspect the installed package exports and types for the exact operation.
3. List the affected package, image, Wrangler bindings, Durable Object migrations, and call sites.
4. Make the smallest coherent change. Keep dependency, image, configuration, exports, and generated types aligned.
5. Run the owning repository's focused typecheck and tests, then its local Sandbox proof if available.
6. Treat deployment, remote resource creation, tunnel exposure, and destructive sandbox lifecycle operations as external mutations. Run them only when their exact outcome is authorized.

For migrations, surface decisions about production cutover, persistent data, bridge usage, images, and rollback before mutating them. Do not silently move an existing stable application to preview.

## Security and lifecycle

- Treat executed code, files, environment variables, command output, and preview URLs as untrusted or sensitive.
- Never place credentials in command arguments, examples, logs, or committed configuration.
- Bound execution with the SDK's current timeout/cancellation mechanisms and ensure cleanup is explicit.
- Use deterministic sandbox identifiers only when the tenancy and reuse boundary is intentional.
- Do not claim isolation, persistence, or cleanup behavior without a focused test on the installed line.

## Proof boundary

Version inspection, typechecking, local execution, and deployment are distinct evidence. Report which package line and image were tested, the commands that passed, and whether any remote state changed. A successful local check is not deployment proof.

Current upstream package-specific skills are `sandbox-stable`, `sandbox-next`, and `sandbox-migrate-to-next`; re-check that split during each provenance refresh rather than copying their manuals here.
