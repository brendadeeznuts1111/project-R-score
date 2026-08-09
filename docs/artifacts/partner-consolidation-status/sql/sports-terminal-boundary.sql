-- Reviewed snapshot query for the Sports Terminal partner API/HTML boundary.
-- Upstream:
--   projects/active/sports-terminal-os/src/api/partner-routes.ts
--   projects/active/sports-terminal-os/src/api/partner-integration-health-routes.ts
--   projects/active/sports-terminal-os/src/api/router.ts
--   projects/active/sports-terminal-os/src/index.ts
--   projects/active/sports-terminal-os/src/frontend/App.tsx
--   projects/active/sports-terminal-os/src/frontend/pages/PartnersPage.tsx
--   packages/partners/src/adapters/sports-terminal.ts
--   public/registry/sports-terminal/partner-integration-health.json

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
  'Handler exists in partner-routes.ts but full partnerRoutes remains unmounted (float money / bare partnerId)',
  'unsafe-input',
  'Do not mount list/detail; dashboard uses IntegrationHealthReadPort only'
UNION ALL SELECT
  3,
  'GET /api/partners/:id',
  'Returns bare partnerId, contact data, Telegram config, lifecycle, limits, and floating-point money',
  'unsafe-input',
  'Do not consume directly; project only qualified external state and health'
UNION ALL SELECT
  4,
  'GET /api/v1/partners/integration-health',
  'Authenticated IntegrationHealthReadPort: ExternalPartnerRef map, money-free/integer-minor wire, mounted with auth required',
  'implemented',
  'Pure adapter parseSportsTerminalIntegrationHealth + registry fixture + bake join'
UNION ALL SELECT
  5,
  'registry sports-terminal/partner-integration-health.json',
  'Exact public fixture schema factorywager.sports-terminal-integration-health.v1',
  'implemented',
  'Connector sports-terminal implemented; authors integrations.sportsTerminal + externalPartnerRefs';

SELECT surface, observed, status, decision
FROM sports_terminal_boundary_audit
ORDER BY "order";
