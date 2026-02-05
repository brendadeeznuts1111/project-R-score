# Changelog

All notable changes to the NEXUS Trading Intelligence Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- AST-aware analysis tools added to MCP registry with Bun PM hash signing
  - `ast-grep-search`: AST-aware grep with semantic pattern matching
  - `pattern-weave-correlate`: Cross-file pattern correlation with confidence scoring
  - `anti-pattern-detect`: Security anti-pattern detection with automatic fixes
  - `smell-diffuse-analyze`: Code smell diffusion analysis with visualization
  - `pattern-evolve-track`: Pattern evolution tracking across git history
- Registry system endpoints (`/api/registry`, `/api/registry/:id`, `/api/registry/category/:category`, `/api/registry/search`)
- MCP Tools registry endpoint (`/api/registry/mcp-tools`)
- API Discovery endpoint (`/discovery`)
- Constants endpoint (`/api/constants`) with URL parameter utilities
- Dashboard improvements:
  - New "Env/Flags/Constants" tab
  - Architecture diagrams and color map visualizations
  - Fixed CORS handling for file:// protocol
  - GitHub links for documentation

### Changed
- Port configuration now hardcoded in `API_CONSTANTS` (PORT: 3000, WS_PORT: 3002)
- All port references updated to use constants instead of dynamic retrieval
- API documentation updated with Registry and MCP Tools endpoints
- Dashboard URLs updated to use `API_BASE` variable instead of relative paths

### Fixed
- Dashboard CORS errors when using file:// protocol
- Broken documentation links (now point to GitHub)
- Mermaid diagrams rendering in dashboard
- Relative API links in dashboard footer

### Security
- All AST analysis tools signed with Bun PM hash (SHA-256) for verification

## [0.1.16] - 2025-01-XX

### Added
- Comprehensive registry system with dedicated endpoints
- Registry browser UI (`dashboard/registry.html`)
- Property registry with versioning and lineage tracking
- Data source registry with RBAC integration
- Sharp books registry
- Bookmaker profiles registry
- MCP tools registry
- Error registry
- URL anomaly patterns registry

### Changed
- Registry endpoints consolidated under `/api/registry`
- Improved registry search and filtering

## [0.1.15] - 2025-01-XX

### Added
- Anomaly research tools for MCP server
- Performance metrics and monitoring scripts
- Research correction engine improvements

### Fixed
- SQL query fixes in MCP anomaly research tools

## [0.1.0] - 2025-01-XX

### Added
- Initial release of NEXUS Trading Intelligence Platform
- Cross-market arbitrage detection
- Crypto exchange integration (CCXT, Deribit)
- Prediction market integration (Polymarket, Kalshi)
- Sports betting normalization (ORCA)
- Telegram bot integration
- Real-time trading dashboard
- API server with OpenAPI documentation
- MCP server for AI tool integration

---

## Release Notes Format

Each release includes:
- **Version**: Semantic version (MAJOR.MINOR.PATCH)
- **Date**: Release date (YYYY-MM-DD)
- **Sections**: Added, Changed, Deprecated, Removed, Fixed, Security

## RSS Feed

The RSS feed (`/api/rss.xml`) includes:
- System status updates
- API documentation changes
- Error registry updates
- Release announcements

## Registry Integration

All changes are tracked in:
- `/api/registry` - Registry overview
- `/api/registry/mcp-tools` - MCP tools registry
- `/api/registry/errors` - Error registry
- `/api/registry/url-anomaly-patterns` - URL anomaly patterns
