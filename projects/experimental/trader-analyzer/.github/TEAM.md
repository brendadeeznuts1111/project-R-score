# [TEAM.STRUCTURE.RG] NEXUS Trading Platform - Team Structure

## [TEAM.OVERVIEW.RG] Overview

**Scope**: The NEXUS Trading Intelligence Platform is organized into specialized departments, each responsible for specific areas of the codebase and platform functionality.

**Ripgrep Pattern**: `TEAM.OVERVIEW.RG|Team Structure|Department organization`

---

## [TEAM.DEPARTMENTS.RG] Departments

### [TEAM.DEPARTMENT.API.ROUTES.RG] 🔌 API & Routes Department
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

### [TEAM.DEPARTMENT.ARBITRAGE.TRADING.RG] 📊 Arbitrage & Trading Department
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

### [TEAM.DEPARTMENT.ORCA.SPORTS.RG] 🏈 ORCA & Sports Betting Department
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

### [TEAM.DEPARTMENT.DASHBOARD.UI.RG] 🎨 Dashboard & UI Department
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

### [TEAM.DEPARTMENT.REGISTRY.MCP.RG] 🔧 Registry & MCP Tools Department
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

### [TEAM.DEPARTMENT.SECURITY.RG] 🔒 Security Department
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

### [TEAM.DEPARTMENT.PERFORMANCE.CACHING.RG] ⚡ Performance & Caching Department
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

### [TEAM.DEPARTMENT.DOCUMENTATION.DX.RG] 📚 Documentation & Developer Experience Department
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

## [TEAM.ROLES.RG] Team Roles

**Ripgrep Pattern**: `TEAM.ROLES.RG|Team Roles|Department Leads`

### [TEAM.ROLES.LEADS.RG:ASSIGNMENT] Department Leads
**Scope**: Tech Leads & Ownership

- Review PRs in their department's area
- Make architectural decisions
- Mentor team members
- Ensure code quality standards

**Contacts**: @api-team-lead @trading-team-lead @orca-team-lead @frontend-team-lead @platform-team-lead @security-team-lead @performance-team-lead @docs-team-lead

### [TEAM.ROLES.CONTRIBUTORS.RG:ONBOARDING] Contributors
**Scope**: Team Member Directory

- Submit PRs following guidelines
- Respond to review feedback
- Maintain code quality
- Update documentation

### [TEAM.ROLES.MAINTAINERS.RG:CODEOWNERS] Maintainers
**Scope**: Code Review Responsibilities

- Final approval on PRs
- Release management
- Security oversight
- Platform stability

**Contacts**: @maintainers

---

## [TEAM.REVIEW.ASSIGNMENT.RG:AUTOMATION] Review Assignment

**Ripgrep Pattern**: `TEAM.REVIEW.ASSIGNMENT.RG|Review Assignment|PR assignment`

**Scope**: PR Review Routing Logic

PRs are automatically assigned to department leads based on:
- Files changed (component detection)
- Labels applied
- PR description components

**Assignment Rules**:
- PR touching `src/api/routes.ts` → API & Routes Department Lead
- PR touching `src/orca/` → ORCA & Sports Betting Department Lead
- PR touching `src/mcp/tools/` → Registry & MCP Tools Department Lead
- PR touching `src/security/` → Security Department Lead
- PR with `security` label → Security Department Lead
- PR with `performance` label → Performance & Caching Department Lead

**Automation**: See `src/mcp/tools/team-coordinator.ts` for implementation

---

## [TEAM.COMMUNICATION.RG:PROTOCOLS] Communication

**Ripgrep Pattern**: `TEAM.COMMUNICATION.RG|Team Communication|GitHub Issues`

**Scope**: Slack/Email Channel Matrix

- **Issues**: Use GitHub Issues with appropriate labels
- **Discussions**: Use GitHub Discussions for questions
- **PRs**: Tag relevant department leads for review
- **Urgent**: Use `@security-team` or `@maintainers` for critical issues
- **Telegram**: Use team-specific Telegram topics for real-time coordination
- **Slack**: #nexus-platform (general), #nexus-security (security), #nexus-performance (performance)

---

## [TEAM.DEPARTMENT.COLORS.RG] Department Colors

**Ripgrep Pattern**: `TEAM.DEPARTMENT.COLORS.RG|Department Colors|Color scheme`

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

---

## [TEAM.POLICY.ENFORCEMENT.RG] Policy Enforcement

**Ripgrep Pattern**: `TEAM.POLICY.*.RG|Policy Enforcement|SLA|Roster`

**Scope**: Mandatory policies defined in TEAM.md and enforced programmatically

### [TEAM.POLICY.PR_REVIEW_SLA.RG] PR Review SLA

**Name**: PR Review Time SLA  
**Description**: Maximum time for PR review completion  
**Type**: SLA  
**Value**: 2h  
**Scope**: global  
**Enforced By**: CI

### [TEAM.POLICY.INCIDENT_RESPONSE_ROSTER.RG] Incident Response Roster

**Name**: On-Call Roster Requirement  
**Description**: Minimum on-call coverage per department  
**Type**: Roster  
**Value**: ["Primary", "Secondary", "Escalation"]  
**Scope**: department  
**Enforced By**: Runtime

### [TEAM.POLICY.ALERT_THRESHOLD.RG] Alert Threshold

**Name**: Alert Sensitivity Threshold  
**Description**: Minimum confidence threshold for alerting  
**Type**: Threshold  
**Value**: 0.8  
**Scope**: global  
**Enforced By**: Runtime

---

## [TEAM.ROLES.ONCALL.RG:SCHEDULE] On-Call Rotation

**Ripgrep Pattern**: `TEAM.ROLES.ONCALL.RG|On-Call Rotation|Oncall Schedule`

**Scope**: On-call schedule and escalation paths

| Week | Primary | Secondary | Escalation | Department |
|------|---------|-----------|------------|------------|
| 2025-W01 | @api-team-lead | @api-maintainer-1 | @platform-team-lead | API & Routes |
| 2025-W02 | @trading-team-lead | @trading-maintainer-1 | @platform-team-lead | Arbitrage & Trading |
| 2025-W03 | @orca-team-lead | @orca-maintainer-1 | @platform-team-lead | ORCA & Sports |
| 2025-W04 | @frontend-team-lead | @frontend-maintainer-1 | @platform-team-lead | Dashboard & UI |
| 2025-W05 | @platform-team-lead | @platform-maintainer-1 | @security-team-lead | Registry & MCP |
| 2025-W06 | @security-team-lead | @security-maintainer-1 | @platform-team-lead | Security |
| 2025-W07 | @performance-team-lead | @performance-maintainer-1 | @platform-team-lead | Performance & Caching |
| 2025-W08 | @docs-team-lead | @docs-maintainer-1 | @platform-team-lead | Documentation & DX |

**Rotation**: 8-week cycle, rotates weekly

---

## [TEAM.ROLES.REVIEW_SPECIALTIES.RG] Reviewer Specialties

**Ripgrep Pattern**: `TEAM.ROLES.REVIEW_SPECIALTIES.RG|Reviewer Specialties|Review Expertise`

**Scope**: Reviewer specializations for ML-driven assignment

- **@api-team-lead**: API design, OpenAPI specs, REST patterns, error handling
- **@trading-team-lead**: Trading algorithms, arbitrage logic, market matching, performance optimization
- **@orca-team-lead**: Sports normalization, taxonomy, bookmaker integration, odds matching
- **@frontend-team-lead**: UI/UX, dashboard design, browser compatibility, CORS handling
- **@platform-team-lead**: MCP tools, registry systems, infrastructure, CI/CD
- **@security-team-lead**: Security audits, vulnerability assessment, compliance, access control
- **@performance-team-lead**: Performance optimization, caching strategies, database queries, profiling
- **@docs-team-lead**: Documentation quality, RG markers, discoverability, onboarding

---

## [TEAM.METADATA.RG] Document Metadata

**Last Updated**: 2025-01-27  
**Version**: 1.0.0  
**Ripgrep Pattern**: `TEAM.METADATA.RG|TEAM.STRUCTURE.RG`
