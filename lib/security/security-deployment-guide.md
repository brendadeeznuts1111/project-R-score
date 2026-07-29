# Security deployment guide (retired)

Prefer:

- `bun run security:audit` · `bun run security:guard:deps` ·
  `bun run security:secrets:local` (`security:audit` fails closed against
  [`scripts/security-audit-exceptions.json`](../../scripts/security-audit-exceptions.json);
  every exception has an owner, rationale, scope, and expiry)
- [docs/WIRE_BOUNDARY.md](../../docs/WIRE_BOUNDARY.md) · branded IDs skill
- [lib/README.md](../README.md)

History: `git log -- lib/security/security-deployment-guide.md`
