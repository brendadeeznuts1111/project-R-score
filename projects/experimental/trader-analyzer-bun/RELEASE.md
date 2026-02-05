# Release Notes

## [Unreleased] - Feature: AST Analysis Tools & Registry System

**Release Date**: TBD  
**Version**: 0.1.17 (planned)

### 🎉 Major Features

#### AST-Aware Analysis Tools
We've added comprehensive AST-aware code analysis tools to the MCP registry:

- **AST Grep Search** (`ast-grep-search`)
  - Semantic pattern matching using AST syntax
  - Context-aware code search with type inference
  - Transformation and rewrite capabilities

- **Pattern Weave Correlate** (`pattern-weave-correlate`)
  - Cross-file pattern correlation
  - Confidence scoring and support metrics
  - Pattern relationship visualization

- **Anti-Pattern Detect** (`anti-pattern-detect`)
  - Security vulnerability detection
  - Automatic fix application
  - Severity-based filtering

- **Smell Diffuse Analyze** (`smell-diffuse-analyze`)
  - Code smell propagation analysis
  - Hotspot identification
  - HTML visualization support

- **Pattern Evolve Track** (`pattern-evolve-track`)
  - Git history pattern tracking
  - Frequency analysis
  - Predictive pattern occurrence

**Security**: All tools are signed with Bun PM hash (SHA-256) for verification.

#### Registry System Enhancements

New registry endpoints for comprehensive system discovery:

- `/api/registry` - Overview of all registries
- `/api/registry/:registryId` - Specific registry by ID
- `/api/registry/category/:category` - Registries by category
- `/api/registry/search` - Search across registries
- `/api/registry/mcp-tools` - MCP tools registry (includes AST tools)

#### API Discovery

New `/discovery` endpoint provides:
- Complete endpoint listing
- Grouped by path and method
- OpenAPI integration

### 🔧 Improvements

- **Port Configuration**: All ports now hardcoded in `API_CONSTANTS` for consistency
- **Dashboard**: Enhanced with architecture diagrams and better CORS handling
- **Documentation**: All links updated to GitHub for better accessibility

### 🐛 Bug Fixes

- Fixed CORS errors when using dashboard via file:// protocol
- Fixed broken documentation links
- Fixed Mermaid diagram rendering in dashboard
- Fixed relative API links

### 📚 Documentation

- Added `CHANGELOG.md` for tracking changes
- Added `RELEASE.md` for release notes
- Updated `MCP-SERVER.md` with AST tools documentation
- Created `MCP-AST-TOOLS.md` reference
- Created `MCP-TOOLS-SIGNATURES.md` for tool verification

### 🔗 Related

- **RSS Feed**: `/api/rss.xml` - Subscribe for updates
- **Registry**: `/api/registry` - Explore all registries
- **API Docs**: `/docs` - Complete API documentation

---

## [0.1.16] - Registry System

**Release Date**: 2025-01-XX  
**Version**: 0.1.16

### Features

- Comprehensive registry system
- Registry browser UI
- Multiple registry types (properties, data sources, tools, errors)

---

## [0.1.0] - Initial Release

**Release Date**: 2025-01-XX  
**Version**: 0.1.0

### Features

- Cross-market arbitrage detection
- Crypto exchange integration
- Prediction market integration
- Sports betting normalization
- Telegram bot integration
- Real-time trading dashboard
- API server with OpenAPI docs
- MCP server for AI tools

---

## RSS Feed

Subscribe to our RSS feed for automatic updates:

- **URL**: `http://localhost:3000/api/rss.xml`
- **Format**: RSS 2.0 compliant
- **Updates**: Real-time system status and release announcements

## Registry Access

Explore all system registries:

- **Overview**: `GET /api/registry`
- **MCP Tools**: `GET /api/registry/mcp-tools`
- **Errors**: `GET /api/registry/errors`
- **Search**: `GET /api/registry/search?q=query`
