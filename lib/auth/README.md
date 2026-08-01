# Auth

Edge-safe authentication contracts shared by Bun-only Pages handlers:

- [`session.ts`](session.ts) signs and verifies expiring HMAC-SHA256 portal
  sessions, parses the `fw_session` cookie, and narrows account and tenant
  claims to `PortalAccountId` and `PortalTenantId`.
- [`oidc.ts`](oidc.ts) performs the configured HTTPS authorization-code
  exchange and exposes the explicit `dev:<subject>:<email>` parser used only
  when the callback enables development authentication.

The module uses Web Crypto and Web platform APIs so it remains portable across
Bun and Cloudflare Pages. Tenant identity and public manifest projection live
in [`config/tenants.ts`](../../config/tenants.ts).
