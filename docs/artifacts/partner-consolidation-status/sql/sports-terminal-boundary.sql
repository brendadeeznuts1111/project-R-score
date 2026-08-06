-- Reviewed snapshot query for the Sports Terminal partner API/HTML boundary.
-- Upstream:
--   projects/active/sports-terminal-os/src/api/partner-routes.ts
--   projects/active/sports-terminal-os/src/api/router.ts
--   projects/active/sports-terminal-os/src/index.ts
--   projects/active/sports-terminal-os/src/frontend/App.tsx
--   projects/active/sports-terminal-os/src/frontend/pages/PartnersPage.tsx

CREATE TEMP TABLE sports_terminal_boundary_audit AS
SELECT
  1 AS "order",
  'React /partners' AS surface,
  'Mounted UI calls /api/partners and mutation routes with page-local DTOs' AS observed,
  'reference-only' AS status,
  'Reuse list/detail information architecture, not its domain schema' AS decision
UNION ALL SELECT
  2,
  'GET /api/partners',
  'Handler exists in partner-routes.ts but partnerRoutes is not mounted by the main API router',
  'blocked',
  'Mount only behind an authenticated, parsed adapter boundary'
UNION ALL SELECT
  3,
  'GET /api/partners/:id',
  'Returns bare partnerId, contact data, Telegram config, lifecycle, limits, and floating-point money',
  'unsafe-input',
  'Do not consume directly; project only qualified external state and health'
UNION ALL SELECT
  4,
  'GET /api/partners/:id/sources/health',
  'Closest IntegrationHealthReadPort candidate, but remains unmounted and accepts an unqualified path ID',
  'candidate',
  'Define auth, ExternalPartnerRef resolution, parsed response, and integer-money exclusion';

SELECT surface, observed, status, decision
FROM sports_terminal_boundary_audit
ORDER BY "order";
