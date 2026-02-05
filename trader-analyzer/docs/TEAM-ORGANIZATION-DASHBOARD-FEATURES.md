# 🏢 Team Organization Dashboard - Complete Feature Summary

**Location**: `dashboard/team-organization.html`  
**RG Marker**: `[TEAM.ORGANIZATION.DASHBOARD.RG]`

## 📊 Dashboard Sections (20 total)

### 1. Statistics Grid
**RG Marker**: `[DASHBOARD.STATS.GRID.RG]`

Displays key metrics at the top of the dashboard:
- **Teams count**: Total number of teams (3)
- **Team members count**: Total team members (10)
- **Packages count**: Total packages in the workspace (14)

**Visual**: Three stat cards with large numbers and labels

---

### 2. Metadata Standards
**RG Marker**: `[DASHBOARD.METADATA.STANDARDS.RG]`

Displays organizational standards and conventions:

- **REF Tags format**: 
  - Pattern: `v-{version}.{TYPE}.{NAME}.{TEAM}.{API}.{MAJOR}.{MINOR}.A.{PATCH}.DOC.{SUB}`
  - Example: `v-1.3.4.COMP.LAYER4.SPRT.1.0.A.1.1.DOC.1.1`

- **Package Types**: 
  - `COMP` - Component
  - `MCPT` - MCP Tool
  - `SCRP` - Script
  - `UTIL` - Utility
  - `SERV` - Service

- **Properties categorization**: Tags like `anomaly-detection`, `correlation`, `benchmarking`, `streaming`

- **Dependencies & Exports**: Package imports, public API symbols, semantic versioning

---

### 3. Team Filter Tabs
**RG Marker**: `[DASHBOARD.FILTER.TABS.RG]`

Interactive filtering system with keyboard navigation:
- **All Teams** - Shows all team members
- **Sports Correlation** - Filters to sports team
- **Market Analytics** - Filters to markets team
- **Platform & Tools** - Filters to platform team

**Accessibility**: Full keyboard navigation with Arrow keys, Home/End, Enter/Space for activation

---

### 4. Mermaid C4Component Architecture Diagram
**RG Marker**: `[DASHBOARD.MERMAID.DIAGRAM.RG]`

Visual representation of team structure:
- **Team leads** and their package ownership
- **Developers** and their maintainer responsibilities
- **Package relationships** and dependencies
- **Container boundaries** for registry, workspace, and packages
- **Database connections** (TimescaleDB, Redis, PostgreSQL)

**Features**:
- Color-coded by team (Blue: Sports, Purple: Markets, Green: Platform, Orange: Benchmarks)
- Interactive hover effects
- Responsive layout

---

### 5. Quick Actions
**RG Marker**: `[DASHBOARD.QUICK.ACTIONS.RG]`

Quick navigation cards for common workflows:
- **Registry Dashboard** - Link to package registry (`http://localhost:4000/packages`)
- **Create RFC** - Link to RFC submission form (`http://localhost:4000/rfcs/new`)
- **Sports Mini-App** - Link to Sports Correlation dashboard (`http://localhost:4001`)
- **Markets Mini-App** - Link to Market Analytics dashboard (`http://localhost:4002`)

**Visual**: Card-based layout with icons and descriptions

---

### 6. MCP AI Team Tools Overview
**RG Marker**: `[DASHBOARD.MCP.AI.TOOLS.RG]`

Overview of available MCP (Model Context Protocol) tools:

- **LSP Bridge** - Language Server Protocol integration for code intelligence
- **Benchmark Tool** - Performance benchmarking and analysis
- **RSS Monitor** - RSS feed monitoring and updates
- **Sitemap Generator** - Component sitemap generation
- **Team Coordinator** - Team coordination and workflow management
- **Component Scaffold** - Component scaffolding automation
- **Telegram Alerts** - Telegram integration for notifications

**Documentation**: Links to `../docs/MCP-AI-TEAM-INTEGRATION.md`

---

### 7. Team Info Query (Human Capital Knowledge Graph)
**RG Marker**: `[DASHBOARD.TEAM.INFO.QUERY.RG]`, `[DASHBOARD.TEAM.INFO.DEPARTMENT.QUERIES.RG]`

Dynamic query interface for TEAM.md data:

**Features**:
- **Query input** with example queries:
  - `department:api` - Find API department members
  - `role:team-lead` - Find all team leads
  - `package:@graph/layer4` - Find package maintainers
  - `contact:telegram` - Extract Telegram contacts
  - `oncall` - Find on-call rotation information
  - `policy` - Find policy enforcement details

**Department Query Buttons**:
- Quick buttons for all 8 departments
- Color-coded by department
- One-click department queries

**Role & Other Query Buttons**:
- Leads, Maintainers
- Communication, Review
- On-Call, Policy

- **Results display**:
  - Department/Role information
  - Contact extraction (email, Telegram, GitHub)
  - Related markers discovery
  - Package ownership relationships

**API Endpoint**: `POST /api/team/info` or `GET /api/team/info?query=<query>`

**Implementation**: `[DASHBOARD.TEAM.INFO.QUERY.FUNCTION.RG:IMPLEMENTATION]`

---

### 8. ML-Driven PR Reviewer Assignment
**RG Marker**: `[DASHBOARD.PR.REVIEWER.ASSIGNMENT.RG]`

AI-powered PR analysis and reviewer suggestions:

**Features**:
- **PR analysis interface**: Input PR number and base branch
- **AI-powered reviewer suggestions**: ML-driven recommendations
- **Confidence scoring visualization**: Visual confidence indicators
- **Availability & load metrics**: Reviewer workload and availability

**API Endpoint**: `POST /api/pr/reviewers`

**Request Body**:
```json
{
  "prNumber": 123,
  "baseBranch": "main"
}
```

**Response**: Reviewer suggestions with confidence scores, availability, and reasoning

**Implementation**: `[DASHBOARD.PR.REVIEWER.ANALYZE.RG:IMPLEMENTATION]`

---

### 9. Developer Workspace
**RG Marker**: `[DASHBOARD.DEVELOPER.WORKSPACE.RG]`

Workspace key management and statistics:

**Statistics Display**:
- **Active keys count**: Number of active workspace keys
- **Onboarding/Interview tracking**: Key creation for interviews/onboarding
- **Request count monitoring**: API usage statistics

**Workspace Keys List**:
- Key ID, email, purpose
- Creation and expiration dates
- Active status
- Rate limit per hour
- Request count

**API Endpoints**:
- `GET /api/registry/workspace` - Workspace statistics
- `GET /api/workspace/keys` - Workspace keys list

**Implementation**: 
- `[DASHBOARD.WORKSPACE.LOAD.STATS.RG:IMPLEMENTATION]`
- `[DASHBOARD.WORKSPACE.LOAD.KEYS.RG:IMPLEMENTATION]`

---

### 10. RSS Feed Integration
**RG Marker**: `[DASHBOARD.RSS.FEED.SECTION.RG]`

Real-time team updates via RSS:

**Features**:
- **Team updates display**: Recent team activity and announcements
- **Patch tracking**: Dependency patch notifications
- **Real-time refresh**: Manual refresh button

**API Endpoint**: `GET /api/rss.xml`

**Implementation**: `[DASHBOARD.RSS.FEED.RG]`

---

### 11. Team Cards Grid
**RG Marker**: `[DASHBOARD.TEAM.CARDS.RG]`

Visual team member cards organized by team:

**Teams**:
- **Sports Correlation Team** (Blue theme)
  - Alex Chen (Team Lead)
  - Jordan Lee (Maintainer)
  - Priya Patel (Maintainer)

- **Market Analytics Team** (Purple theme)
  - Sarah Kumar (Team Lead)
  - Tom Wilson (Maintainer)
  - Lisa Zhang (Maintainer)

- **Platform & Tools Team** (Green theme)
  - Mike Rodriguez (Team Lead)
  - David Kim (Maintainer)
  - Emma Brown (Maintainer)
  - Ryan Gupta (Maintainer)

**Card Information**:
- Name and role
- Package ownership
- Telegram contact
- Quick action buttons (GitHub, Telegram, Mini-App)

**Implementation**: `[DASHBOARD.JAVASCRIPT.RENDER.TEAM.CARDS.RG:IMPLEMENTATION]`

---

### 12. Package Ownership Table
**RG Marker**: `[DASHBOARD.PACKAGE.OWNERSHIP.TABLE.RG]`

Maintainer responsibility matrix:

**Responsibilities**:
- **Package Review**: Team lead required for all changes, maintainer for major changes
- **Version Bumping**: Team lead required, maintainer can patch for hotfixes
- **Publishing**: Team lead required, maintainer can publish patches
- **Benchmark Review**: Team lead validates, maintainer runs benchmarks
- **Property Iteration**: Team lead approves, maintainer executes
- **Documentation**: Team lead reviews, maintainer writes
- **Incident Response**: Team lead coordinates, maintainer fixes

**Visual**: Table format with clear role definitions

---

### 13. Command Palette (⌘K)
**RG Marker**: `[DASHBOARD.COMMAND.PALETTE.RG]`

Quick search and navigation:

**Features**:
- **Search team members**: Find by name, role, or team
- **Search packages**: Find by package name or scope
- **Quick navigation**: Direct links to team cards and packages

**Keyboard Shortcuts**:
- `⌘K` / `Ctrl+K` - Open command palette
- `Arrow Down/Up` - Navigate results
- `Enter` - Select item
- `Escape` - Close palette

**Implementation**: `[DASHBOARD.JAVASCRIPT.COMMAND.PALETTE.RG:IMPLEMENTATION]`

---

### 14. Interactive Filtering
**RG Marker**: `[DASHBOARD.FILTER.TABS.RG]`

Multi-level filtering system:

**Filter Types**:
- **Team-based filtering**: Filter by team (All, Sports, Markets, Platform)
- **Package search**: Search packages by name or scope
- **Person search**: Search team members by name or role

**Visual Feedback**: 
- Active tab highlighting
- Filtered results display
- Smooth transitions

---

### 15. Patch Tracking
**RG Marker**: `[DASHBOARD.PATCH.TRACKING.SECTION.RG]`

Dependency patch management:

---

### 16. Department Structure
**RG Marker**: `[DASHBOARD.DEPARTMENT.FILTER.RG]`, `[DASHBOARD.DEPARTMENT.CARDS.RG]`, `[DASHBOARD.DEPARTMENT.COLORS.RG]`

Complete 8-department organizational structure from TEAM.md:

**Department Filter Tabs**:
- All Departments
- 🔌 API & Routes (Cyan: #00d4ff)
- 📊 Arbitrage & Trading (Red: #ff1744)
- 🏈 ORCA & Sports Betting (Purple: #9c27b0)
- 🎨 Dashboard & UI (Indigo: #667eea)
- 🔧 Registry & MCP Tools (Magenta: #ff00ff)
- 🔒 Security (Orange: #ff6b00)
- ⚡ Performance & Caching (Green: #00ff88)
- 📚 Documentation & DX (Green: #00ff88)

**Department Cards Display**:
- Department name, lead, color
- Responsibilities list
- Key areas (file paths and components)
- Review focus areas

**Department Colors Reference**:
- Visual color palette matching TEAM.md
- Color codes for each department
- Consistent with Telegram integration patterns

**Implementation**: 
- `[DASHBOARD.DEPARTMENT.RENDER.RG:IMPLEMENTATION]` - Render function
- `[DASHBOARD.DEPARTMENT.FILTER.RG:IMPLEMENTATION]` - Filter function
- `[DASHBOARD.DEPARTMENT.DATA.RG]` - Data structure

---

### 17. On-Call Rotation
**RG Marker**: `[DASHBOARD.ONCALL.ROTATION.RG]`, `[DASHBOARD.ONCALL.STATUS.RG]`

8-week rotation schedule display:

**Current On-Call Status Widget**:
- Shows current week's on-call assignments
- Primary, Secondary, and Escalation contacts
- Department coverage

**On-Call Schedule Table**:
- 8-week rotation cycle
- Weekly assignments per department
- Highlights current week
- Primary, Secondary, Escalation columns

**Implementation**: 
- `[DASHBOARD.ONCALL.RENDER.RG:IMPLEMENTATION]` - Render function

---

### 18. Policy Enforcement
**RG Marker**: `[DASHBOARD.POLICY.ENFORCEMENT.RG]`

Mandatory policies display:

**Policy Cards**:
- **PR Review SLA**: 2h maximum review time (Enforced by: CI)
- **Incident Response Roster**: Primary/Secondary/Escalation coverage (Enforced by: Runtime)
- **Alert Threshold**: 0.8 confidence minimum (Enforced by: Runtime)

**Policy Details**:
- Policy type (SLA, Roster, Threshold)
- Policy value
- Scope (global or department)
- Enforcement mechanism

---

### 19. Reviewer Specialties
**RG Marker**: `[DASHBOARD.REVIEWER.SPECIALTIES.RG]`

ML-driven reviewer expertise display:

**Specialties Grid**:
- Each team lead's expertise areas
- Color-coded by department
- Clickable cards linking to PR reviewer assignment
- Specialties include:
  - API design, OpenAPI specs, REST patterns
  - Trading algorithms, arbitrage logic
  - Sports normalization, taxonomy
  - UI/UX, dashboard design
  - MCP tools, registry systems
  - Security audits, vulnerability assessment
  - Performance optimization, caching
  - Documentation quality, RG markers

**Implementation**: 
- `[DASHBOARD.REVIEWER.SPECIALTIES.RENDER.RG:IMPLEMENTATION]` - Render function
- `[DASHBOARD.REVIEWER.SPECIALTY.CLICK.RG:IMPLEMENTATION]` - Click handler

---

### 20. Communication Protocols
**RG Marker**: `[DASHBOARD.COMMUNICATION.PROTOCOLS.RG]`

Team communication channels and protocols:

**GitHub**:
- Issues with appropriate labels
- Discussions for questions
- PRs with department lead tagging
- Urgent: @security-team or @maintainers

**Telegram**:
- Team-specific Telegram topics
- Real-time coordination
- Supergroups and topics per team

**Slack**:
- #nexus-platform (general)
- #nexus-security (security)
- #nexus-performance (performance)

---

### 15. Patch Tracking
**RG Marker**: `[DASHBOARD.PATCH.TRACKING.SECTION.RG]`

Dependency patch management:

**Features**:
- **Dependency patches**: Track all patches applied to dependencies
- **RSS constants integration**: Integration with RSS feed for patch notifications
- **Team impact**: Shows which teams are affected by patches
- **Severity levels**: Critical, High, Medium, Low
- **Category tags**: Routing, AI Integration, Testing, Performance, Data Quality

**Patch Information**:
- Package name and version
- Patch ID and description
- Applied by (developer email)
- Applied date
- Team impact labels
- Severity and category

**Documentation**: Links to `../docs/BUN-PATCH.md`

**Implementation**: `[DASHBOARD.JAVASCRIPT.PATCH.TRACKING.RG:IMPLEMENTATION]`

---

## 🔗 API Integrations

### Team Info Query
- **Endpoint**: `POST /api/team/info` or `GET /api/team/info?query=<query>`
- **Purpose**: Query TEAM.md using team-info MCP tool
- **Implementation**: `src/api/routes.ts:3726-3789`
- **Tool**: `src/mcp/tools/team-info.ts`

### PR Reviewer Assignment
- **Endpoint**: `POST /api/pr/reviewers`
- **Purpose**: Analyze PR and get ML-driven reviewer suggestions
- **Request Body**: `{ prNumber: number, baseBranch?: string }`
- **Implementation**: `src/api/routes.ts:3750-3770`
- **Integration**: `src/integrations/ml-pr-reviewer-assignment.ts`

### Workspace Statistics
- **Endpoint**: `GET /api/registry/workspace`
- **Purpose**: Get workspace registry statistics
- **Returns**: Active keys, expired keys, by-purpose breakdown
- **Implementation**: `src/api/routes.ts:3626-3641`
- **Registry**: `src/api/registry.ts:1833-1917`

### Workspace Keys List
- **Endpoint**: `GET /api/workspace/keys`
- **Purpose**: List all workspace API keys
- **Returns**: Key details, metadata, usage statistics
- **Implementation**: `src/api/workspace-routes.ts`

### RSS Feed
- **Endpoint**: `GET /api/rss.xml`
- **Purpose**: Get team updates RSS feed
- **Returns**: RSS XML with team updates and patch notifications
- **Implementation**: `src/api/routes.ts` (RSS route)

---

## 🎨 Visual Features

### Color Scheme
- **Primary Background**: `#0a0a0a` (Dark)
- **Secondary Background**: `#1a1a1a` (Medium dark)
- **Tertiary Background**: `#2a2a2a` (Lighter dark)
- **Accent Blue**: `#00d4ff` (Primary accent)
- **Accent Purple**: `#a855f7` (Markets team)
- **Accent Green**: `#10b981` (Platform team)
- **Accent Orange**: `#f59e0b` (Alerts/Warnings)

### Layout
- **Responsive grid layouts**: Adapts to screen size
- **Interactive cards**: Hover effects and transitions
- **Real-time data updates**: Live data refresh
- **Loading states**: Visual feedback during API calls
- **Error handling**: User-friendly error messages

### Accessibility
- **Keyboard navigation**: Full keyboard support
- **ARIA labels**: Screen reader support
- **Focus indicators**: Clear focus states
- **Tab navigation**: Logical tab order

---

## 🔍 RG Markers

The dashboard includes **35+ ripgrep-discoverable markers** for:

### Dashboard Sections
- `[TEAM.ORGANIZATION.DASHBOARD.RG]` - Main dashboard marker
- `[DASHBOARD.CONTAINER.RG]` - Main container
- `[DASHBOARD.STATS.GRID.RG]` - Statistics grid
- `[DASHBOARD.FILTER.TABS.RG]` - Filter tabs
- `[DASHBOARD.TEAM.GRID.RG]` - Team cards grid
- `[DASHBOARD.MERMAID.DIAGRAM.RG]` - Mermaid diagram
- `[DASHBOARD.TEAM.CARDS.RG]` - Team cards sidebar
- `[DASHBOARD.QUICK.ACTIONS.RG]` - Quick actions
- `[DASHBOARD.TEAM.INFO.QUERY.RG]` - Team info query section
- `[DASHBOARD.TEAM.INFO.DEPARTMENT.QUERIES.RG]` - Department query buttons
- `[DASHBOARD.PR.REVIEWER.ASSIGNMENT.RG]` - PR reviewer assignment
- `[DASHBOARD.DEVELOPER.WORKSPACE.RG]` - Developer workspace
- `[DASHBOARD.RSS.FEED.SECTION.RG]` - RSS feed section
- `[DASHBOARD.PATCH.TRACKING.SECTION.RG]` - Patch tracking section
- `[DASHBOARD.COMMAND.PALETTE.RG]` - Command palette
- `[DASHBOARD.DEPARTMENT.FILTER.RG]` - Department filter tabs
- `[DASHBOARD.DEPARTMENT.CARDS.RG]` - Department cards section
- `[DASHBOARD.DEPARTMENT.COLORS.RG]` - Department colors reference
- `[DASHBOARD.ONCALL.ROTATION.RG]` - On-call rotation section
- `[DASHBOARD.ONCALL.STATUS.RG]` - On-call status widget
- `[DASHBOARD.POLICY.ENFORCEMENT.RG]` - Policy enforcement section
- `[DASHBOARD.REVIEWER.SPECIALTIES.RG]` - Reviewer specialties section
- `[DASHBOARD.COMMUNICATION.PROTOCOLS.RG]` - Communication protocols section

### JavaScript Functions
- `[DASHBOARD.JAVASCRIPT.COMMAND.PALETTE.RG:IMPLEMENTATION]` - Command palette functions
- `[DASHBOARD.JAVASCRIPT.RENDER.TEAM.CARDS.RG:IMPLEMENTATION]` - Team cards rendering
- `[DASHBOARD.TEAM.INFO.QUERY.FUNCTION.RG:IMPLEMENTATION]` - Team info query function
- `[DASHBOARD.TEAM.INFO.RENDER.RG:IMPLEMENTATION]` - Team info render function
- `[DASHBOARD.PR.REVIEWER.ANALYZE.RG:IMPLEMENTATION]` - PR reviewer analysis
- `[DASHBOARD.PR.REVIEWER.RENDER.RG:IMPLEMENTATION]` - PR reviewer render
- `[DASHBOARD.WORKSPACE.LOAD.STATS.RG:IMPLEMENTATION]` - Workspace stats loading
- `[DASHBOARD.WORKSPACE.RENDER.STATS.RG:IMPLEMENTATION]` - Workspace stats rendering
- `[DASHBOARD.WORKSPACE.LOAD.KEYS.RG:IMPLEMENTATION]` - Workspace keys loading
- `[DASHBOARD.WORKSPACE.RENDER.KEYS.RG:IMPLEMENTATION]` - Workspace keys rendering
- `[DASHBOARD.JAVASCRIPT.PATCH.TRACKING.RG:IMPLEMENTATION]` - Patch tracking functions
- `[DASHBOARD.DEPARTMENT.RENDER.RG:IMPLEMENTATION]` - Department cards rendering
- `[DASHBOARD.DEPARTMENT.FILTER.RG:IMPLEMENTATION]` - Department filtering
- `[DASHBOARD.ONCALL.RENDER.RG:IMPLEMENTATION]` - On-call schedule rendering
- `[DASHBOARD.REVIEWER.SPECIALTIES.RENDER.RG:IMPLEMENTATION]` - Reviewer specialties rendering
- `[DASHBOARD.REVIEWER.SPECIALTY.CLICK.RG:IMPLEMENTATION]` - Reviewer specialty click handler

### API Integrations
- `[DASHBOARD.TEAM.INFO.QUERY.RG:IMPLEMENTATION]` - Team info API integration
- `[DASHBOARD.PR.REVIEWER.ASSIGNMENT.RG:IMPLEMENTATION]` - PR reviewer API integration
- `[DASHBOARD.WORKSPACE.RG:ERROR]` - Workspace error handling

---

## 📚 Related Documentation

- `../docs/MCP-AI-TEAM-INTEGRATION.md` - MCP tools architecture
- `../docs/TEAM-ORGANIZATION-PACKAGE-OWNERSHIP.md` - Team structure details
- `../docs/TEAM-DASHBOARD-API-VERIFICATION.md` - API endpoint verification and testing
- `../docs/BUN-PATCH.md` - Bun patch documentation
- `../docs/24.0.0.0.0.0.0-HUMAN-CAPITAL-ORCHESTRATION.md` - Human Capital Knowledge Graph
- `../src/mcp/tools/ai-team-tools.ts` - MCP tools implementation
- `../src/utils/rss-constants.ts` - Patch tracking constants (PATCHED_DEPENDENCIES)
- `../.github/TEAM.md` - Team structure and contact information (source of truth)
- `../scripts/test-team-dashboard-apis.ts` - API verification test script

---

## 🚀 Usage

### Accessing the Dashboard

1. **Local Development**:
   ```bash
   bun run dev
   ```
   Navigate to: `http://localhost:3001/dashboard/team-organization.html`

2. **Production**:
   Navigate to: `https://your-domain.com/dashboard/team-organization.html`

### Keyboard Shortcuts

- `⌘K` / `Ctrl+K` - Open command palette
- `Escape` - Close modals/palettes
- `Arrow Keys` - Navigate tabs and lists
- `Enter` - Activate selected item

### API Requirements

Ensure the following services are running:
- API server (`bun run dev` on port 3001)
- Registry Dashboard (port 4000, optional)
- Mini-Apps (ports 4001-4003, optional)

---

## 🔧 Technical Details

### Technologies Used
- **HTML5** - Structure
- **CSS3** - Styling with CSS variables
- **JavaScript** - Client-side logic
- **Mermaid.js** - Architecture diagrams
- **Fetch API** - HTTP requests

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Responsive design for mobile/tablet

### Performance
- Lazy loading for RSS feed
- Efficient DOM updates
- Minimal external dependencies

---

## 📝 Maintenance

### Adding New Teams
1. Update `teamData.people` array in JavaScript
2. Add team filter tab if needed
3. Update Mermaid diagram
4. Add RG markers for new sections

### Adding New API Endpoints
1. Implement endpoint in `src/api/routes.ts`
2. Add fetch call in dashboard JavaScript
3. Add error handling
4. Add RG marker for implementation

### Updating RG Markers
All markers follow the pattern: `[SECTION.SUBSECTION.RG]` or `[SECTION.SUBSECTION.RG:IMPLEMENTATION]`

---

**Last Updated**: 2024  
**Version**: 1.0.0  
**Maintainer**: Platform & Tools Team
