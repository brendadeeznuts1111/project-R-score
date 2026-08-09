-- Partner dashboard MVP reviewed snapshot query
CREATE TEMP TABLE mvp_overview AS
SELECT
  18 AS implementedComponents,
  18 AS totalComponents,
  8 AS connectors,
  0 AS blockedConnectors;

SELECT * FROM mvp_overview;
