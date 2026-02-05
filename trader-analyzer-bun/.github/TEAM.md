# NEXUS Trading Platform - Team Structure

## Overview

The NEXUS Trading Intelligence Platform is organized into specialized departments, each responsible for specific areas of the codebase and platform functionality.

---

## Departments

### 🔌 API & Routes Department
**Lead**: API Team Lead  
**Color**: `#00d4ff` (Cyan)  
**Responsibilities**:
- REST API endpoint design and implementation
- OpenAPI specification maintenance
- Request/response handling
- Error handling and status codes
- API discovery and documentation

**Key Areas**:
- `src/api/routes.ts` - Main API routes
- `src/api/docs.ts` - OpenAPI documentation
- `src/api/discovery.ts` - API discovery endpoint
- Error registry integration

**Review Focus**: Endpoint design, OpenAPI spec, error handling, backward compatibility

---

### 📊 Arbitrage & Trading Department
**Lead**: Trading Team Lead  
**Color**: `#ff1744` (Red)  
**Responsibilities**:
- Cross-market arbitrage detection
- Trading algorithm implementation
- Opportunity scanning and execution
- Market matching and correlation

**Key Areas**:
- `src/arbitrage/` - Arbitrage detection system
- `src/analytics/` - Trading analytics
- `src/providers/` - Exchange connectors
- Crypto matcher and scanner

**Review Focus**: Algorithm correctness, performance, edge cases, trading logic

---

### 🏈 ORCA & Sports Betting Department
**Lead**: ORCA Team Lead  
**Color**: `#9c27b0` (Purple)  
**Responsibilities**:
- Sports betting normalization
- Team and sport taxonomy
- Bookmaker integration
- Odds normalization and matching

**Key Areas**:
- `src/orca/` - ORCA normalizer
- `src/orca/taxonomy/` - Sports/team taxonomy
- `src/orca/sharp-books/` - Sharp bookmaker registry
- `src/orca/arbitrage/` - Sports arbitrage

**Review Focus**: Normalization accuracy, taxonomy updates, bookmaker compatibility

---

### 🎨 Dashboard & UI Department
**Lead**: Frontend Team Lead  
**Color**: `#667eea` (Indigo)  
**Responsibilities**:
- Dashboard development and maintenance
- User interface design
- Browser compatibility
- CORS and file:// protocol handling

**Key Areas**:
- `dashboard/index.html` - Main dashboard
- `dashboard/17.14.0-nexus-dashboard.html` - NEXUS Registry System dashboard (with MCP tools and CLI commands integration)
- `dashboard/registry.html` - Registry browser
- `dashboard/workspace.html` - Workspace management dashboard
- `apps/dashboard/` - Rspack-bundled dashboard application
- `src/cli/dashboard.ts` - Dashboard CLI
- UI components and styling
- Real-time data visualization
- MCP tools registry display (`/api/registry/mcp-tools`)
- CLI commands registry display (`/api/registry/cli-commands`)

**Review Focus**: UX, accessibility, CORS handling, browser compatibility, bundling configuration, dashboard API integration, MCP tools visualization, CLI commands integration

---

### 🔧 Registry & MCP Tools Department
**Lead**: Platform Team Lead  
**Color**: `#ff00ff` (Magenta)  
**Responsibilities**:
- Registry system maintenance
- MCP tools development
- Tool signing and verification
- Platform integration

**Key Areas**:
- `src/api/registry.ts` - Registry system (includes `getMCPToolsRegistry()` and `getCLICommandsRegistry()`)
- `src/mcp/` - MCP server and tools
- `scripts/mcp-server.ts` - MCP server entry point
- `docs/api/MCP-SERVER.md` - MCP server documentation
- `src/17.16.0.0.0.0.0-routing/` - URLPattern wildcard routing system (integrated with MCP tools and CLI commands)
- `.bun-version` - Bun version specification (for version managers)
- `bunfig.toml` / `config/bunfig.toml` - Bun configuration (workspaces, install settings, security scanner)
- `scripts/*.ts` - CLI tools
- `commands/` - CLI commands documentation (mcp.md, README.md, etc.)
- Tool signatures and Bun PM hashing
- Dashboard integration: `dashboard/17.14.0-nexus-dashboard.html` displays MCP tools and CLI commands registries
- Routing constants: `ROUTING_REGISTRY_NAMES` and `RSS_API_PATHS.V17_*` in `src/utils/rss-constants.ts`

**Review Focus**: Tool signatures, registry consistency, MCP compliance, platform integration, MCP server documentation, Bun version management, bunfig.toml configuration, dashboard registry integration, routing constants integration

---

### 🔒 Security Department
**Lead**: Security Team Lead  
**Color**: `#ff6b00` (Orange)  
**Responsibilities**:
- Security vulnerability assessment
- RBAC implementation
- Input validation
- Security headers and SRI

**Key Areas**:
- `src/security/` - Security modules
- `src/rbac/` - Role-based access control
- `src/middleware/csrf.ts` - CSRF protection
- Security testing tools

**Review Focus**: Vulnerabilities, RBAC checks, input validation, security headers

---

### ⚡ Performance & Caching Department
**Lead**: Performance Team Lead  
**Color**: `#00ff88` (Green)  
**Responsibilities**:
- Cache strategy and implementation
- Query optimization
- Performance monitoring
- Latency optimization

**Key Areas**:
- `src/cache/` - Cache management
- `src/observability/metrics.ts` - Metrics
- `benchmarks/` - Performance benchmarks
- `test-benchmark-registry.ts` - Benchmark registry validation
- Cache TTL strategies

**Review Focus**: Cache strategy, query optimization, latency, performance metrics, benchmark thresholds

---

### 📚 Documentation & Developer Experience Department
**Lead**: Docs Team Lead  
**Color**: `#00ff88` (Green)  
**Responsibilities**:
- Documentation maintenance
- Developer guides
- API documentation
- Contributing guidelines

**Key Areas**:
- `docs/` - Documentation files
- `commands/` - CLI commands documentation
- `README.md` - Project overview
- `docs/guides/CONTRIBUTING.md` - Contributing guide
- API documentation

**Review Focus**: Documentation accuracy, clarity, completeness, developer experience

---

## Team Roles

### Department Leads
- Review PRs in their department's area
- Make architectural decisions
- Mentor team members
- Ensure code quality standards

### Contributors
- Submit PRs following guidelines
- Respond to review feedback
- Maintain code quality
- Update documentation

### Maintainers
- Final approval on PRs
- Release management
- Security oversight
- Platform stability

---

## Review Assignment

PRs are automatically assigned to department leads based on:
- Files changed (component detection)
- Labels applied
- PR description components

**Example**:
- PR touching `src/api/routes.ts` → API & Routes Department Lead
- PR touching `src/orca/` → ORCA & Sports Betting Department Lead
- PR with `security` label → Security Department Lead

---

## Communication

- **Issues**: Use GitHub Issues with appropriate labels
- **Discussions**: Use GitHub Discussions for questions
- **PRs**: Tag relevant department leads for review
- **Urgent**: Use `@security-team` or `@maintainers` for critical issues

---

## Department Colors

Colors match the Telegram integration patterns and dashboard color scheme:

| Department | Color | Hex |
|------------|-------|-----|
| API & Routes | Cyan | `#00d4ff` |
| Arbitrage & Trading | Red | `#ff1744` |
| ORCA & Sports Betting | Purple | `#9c27b0` |
| Dashboard & UI | Indigo | `#667eea` |
| Registry & MCP Tools | Magenta | `#ff00ff` |
| Security | Orange | `#ff6b00` |
| Performance & Caching | Green | `#00ff88` |
| Documentation & DX | Green | `#00ff88` |

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0
