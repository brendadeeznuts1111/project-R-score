# Team Organization Dashboard - Complete Feature Documentation

**File**: `dashboard/team-organization.html`  
**RG Marker**: `[DASHBOARD.TEAM.ORGANIZATION.RG:OVERVIEW]`  
**Last Updated**: 2025-01-10

---

## 📊 Dashboard Overview

The Team Organization Dashboard is a comprehensive, real-time web interface that provides AI-powered insights into Hyper-Bun's organizational structure, team coordination, and human capital orchestration. It integrates multiple subsystems including the Human Capital Knowledge Graph (`TEAM.md`), ML-driven PR reviewer assignment, Developer Workspace management, and MCP AI tooling.

---

## 🏢 Dashboard Sections (15 Total)

### 1. Statistics Grid `[DASHBOARD.STATISTICS.RG:UI]`

**Location**: Top of dashboard  
**Features**:
- **Teams Count**: Total number of active teams (Sports, Markets, Platform)
- **Team Members Count**: Total active team members across all departments
- **Packages Count**: Total packages in the monorepo

**Visual**: Color-coded cards with icons (📊, 👥, 📦)

---

### 2. Metadata Standards `[DASHBOARD.METADATA.STANDARDS.RG:UI]`

**Location**: Below statistics  
**Features**:
- **REF Tags Format**: Documentation reference tag structure (`v-1.3.4.COMP.TESTSTATUS.PLAT.1.0.A.1.1.DOC.1.1`)
- **Package Types**: 
  - `COMP` - Components
  - `MCPT` - MCP Tools
  - `SCRP` - Scripts
  - `UTIL` - Utilities
  - `SERV` - Services
- **Properties Categorization**: Standardized property metadata

**Visual**: Collapsible section with code examples

---

### 3. Team Filter Tabs `[DASHBOARD.TEAM.FILTER.RG:UI]`

**Location**: Below metadata standards  
**Features**:
- **All Teams**: Shows all team members
- **Sports**: Filters to Sports Correlation team
- **Markets**: Filters to Market Analytics team
- **Platform**: Filters to Platform & Tools team

**Visual**: Tab buttons with active state highlighting

---

### 4. Mermaid C4Component Architecture Diagram `[DASHBOARD.MERMAID.DIAGRAM.RG:UI]`

**Location**: Main content area  
**Features**:
- **Visual Team Structure**: Interactive C4Component diagram showing:
  - Team leads and developers
  - Package ownership relationships
  - Person-to-package mappings
  - Container boundaries (Private Registry, Bun Workspace)
  - Database relationships (TimescaleDB, Redis)
- **MCP Integration Diagram** `[DASHBOARD.MCP.ARCHITECTURE.DIAGRAM.RG:UI]`:
  - MCP Server components (LSP Bridge, Benchmark Tool, RSS Monitor, Team Coordinator)
  - AI Client integrations
  - Telegram communication flows
  - Bun Workspace interactions

**Visual**: Mermaid-rendered C4Component diagrams with color-coded boundaries

---

### 5. Quick Actions `[DASHBOARD.QUICK.ACTIONS.RG:UI]`

**Location**: Below team filters  
**Features**:
- **Registry Dashboard**: Link to package registry (`http://localhost:4000/packages`)
- **Create RFC**: Link to RFC submission (`http://localhost:4000/rfcs/new`)
- **Mini-App Links**:
  - Markets Mini-App
  - Team Organization Mini-App
  - MCP Dashboard Mini-App

**Visual**: Grid of clickable cards with icons

---

### 6. MCP AI Team Tools Overview `[DASHBOARD.MCP.AI.TOOLS.RG:UI]`

**Location**: Below quick actions  
**Features**:
- **LSP Bridge** `[MCP.LSP.BRIDGE.RG:IMPLEMENTATION]`: AI-powered code suggestions with context awareness
- **Benchmark Tool** `[MCP.BENCHMARK.TOOL.RG:IMPLEMENTATION]`: AI-driven property optimization
- **RSS Monitor** `[MCP.RSS.MONITOR.RG:IMPLEMENTATION]`: AI-summarized team updates
- **Team Coordinator** `[MCP.TEAM.COORDINATOR.RG:IMPLEMENTATION]`: AI-assigned reviews and notifications
- **Component Scaffold** `[MCP.COMPONENT.SCAFFOLD.RG:IMPLEMENTATION]`: Auto-generate component stubs
- **Sitemap Generator** `[MCP.SITEMAP.GENERATOR.RG:IMPLEMENTATION]`: Dynamic component sitemap generation
- **Telegram Alerts** `[MCP.TELEGRAM.ALERTS.RG:IMPLEMENTATION]`: Team notification system

**Visual**: Grid of tool cards with descriptions and tool names

---

### 7. Team Info Query (Human Capital Knowledge Graph) `[DASHBOARD.TEAM.INFO.QUERY.RG:IMPLEMENTATION]`

**Location**: Below MCP tools  
**Features**:
- **Dynamic TEAM.md Queries**: Query the Human Capital Knowledge Graph using natural language
- **Department/Role Searches**: Search by department, role, or protocol
- **Contact Extraction**: Automatically extracts team member contacts (`@username`)
- **Related Markers Discovery**: Finds related RG markers in `TEAM.md`
- **Query Suggestions**: Pre-populated query buttons for common searches

**API**: `POST /api/team/info`  
**Functions**: `queryTeamInfo()`, `renderTeamInfoResults()`, `setTeamQuery()`  
**RG Markers**: 
- `[DASHBOARD.TEAM.INFO.QUERY.RG:IMPLEMENTATION]`
- `[DASHBOARD.TEAM.INFO.QUERY.EXECUTE.RG:IMPLEMENTATION]`
- `[DASHBOARD.TEAM.INFO.RENDER.RG:IMPLEMENTATION]`

**Visual**: Input field, query buttons, collapsible results section

---

### 8. ML-Driven PR Reviewer Assignment `[DASHBOARD.PR.REVIEWER.ASSIGNMENT.RG:IMPLEMENTATION]`

**Location**: Below team info query  
**Features**:
- **PR Analysis Interface**: Input fields for PR number and base branch
- **AI-Powered Reviewer Suggestions**: ML model suggests optimal reviewers based on:
  - Code diff analysis (`[TEAM.ML.REVIEWER.CODE.DIFF.RG:IMPLEMENTATION]`)
  - Departmental expertise (`[TEAM.ML.REVIEWER.DEPARTMENT.EXPERTISE.RG:IMPLEMENTATION]`)
  - Niche specializations (`[TEAM.ML.REVIEWER.SPECIALTIES.RG:IMPLEMENTATION]`)
  - Developer availability (`[TEAM.ML.REVIEWER.AVAILABILITY.RG:IMPLEMENTATION]`)
  - Load profiling (`[TEAM.ML.REVIEWER.AVAILABILITY.PRS.RG:IMPLEMENTATION]`)
- **Confidence Scoring Visualization**: Color-coded confidence scores (0.0-1.0)
- **Availability & Load Metrics**: Real-time developer capacity indicators
- **Ranked Suggestions**: Top reviewers displayed with reasons and expertise tags

**API**: `POST /api/pr/reviewers`  
**Functions**: `analyzePRReviewers()`, `renderPRReviewerResults()`  
**RG Markers**:
- `[DASHBOARD.PR.REVIEWER.ASSIGNMENT.RG:IMPLEMENTATION]`
- `[DASHBOARD.PR.REVIEWER.ANALYZE.RG:IMPLEMENTATION]`
- `[DASHBOARD.PR.REVIEWER.RENDER.RG:IMPLEMENTATION]`

**Visual**: Input form, ranked reviewer cards with color-coded metrics

---

### 9. Developer Workspace `[DASHBOARD.DEVELOPER.WORKSPACE.RG:IMPLEMENTATION]`

**Location**: Below PR reviewer assignment  
**Features**:
- **Active Keys Statistics**: Total active workspace keys
- **Onboarding/Interview Tracking**: Counts for onboarding and interview keys
- **Workspace Keys List**: Table showing:
  - Email addresses
  - Purpose (onboarding, interview, active)
  - Expiration dates
  - Request counts (24h)
- **Request Count Monitoring**: Real-time tracking of API usage

**APIs**: 
- `GET /api/registry/workspace` (statistics)
- `GET /api/workspace/keys` (key list)

**Functions**: `loadWorkspaceStats()`, `renderWorkspaceStats()`, `loadWorkspaceKeys()`, `renderWorkspaceKeys()`  
**RG Markers**:
- `[DASHBOARD.DEVELOPER.WORKSPACE.RG:IMPLEMENTATION]`
- `[DASHBOARD.WORKSPACE.LOAD.STATS.RG:IMPLEMENTATION]`
- `[DASHBOARD.WORKSPACE.RENDER.STATS.RG:IMPLEMENTATION]`
- `[DASHBOARD.WORKSPACE.LOAD.KEYS.RG:IMPLEMENTATION]`
- `[DASHBOARD.WORKSPACE.RENDER.KEYS.RG:IMPLEMENTATION]`

**Visual**: Statistics cards, table with workspace keys, refresh button

---

### 10. RSS Feed Integration `[DASHBOARD.RSS.FEED.RG:IMPLEMENTATION]`

**Location**: Below developer workspace  
**Features**:
- **Team Updates Display**: Latest RSS feed entries
- **Patch Tracking**: Dependency patch notifications
- **Real-time Refresh**: Manual refresh button

**API**: `GET /api/rss.xml`  
**Visual**: RSS feed entries with timestamps

---

### 11. Team Cards Grid `[DASHBOARD.TEAM.CARDS.RG:UI]`

**Location**: Main sidebar (right side)  
**Features**:
- **Sports Correlation Team**: Team lead, developers, package ownership
- **Market Analytics Team**: Team lead, developers, package ownership
- **Platform & Tools Team**: Team lead, developers, package ownership

**Visual**: Collapsible cards with team member details

---

### 12. Package Ownership Table `[DASHBOARD.PACKAGE.OWNERSHIP.RG:UI]`

**Location**: Below team cards  
**Features**:
- **Review Responsibilities**: Who reviews each package
- **Version Bumping**: Version management workflows
- **Publishing Workflows**: Package publishing processes
- **Benchmark Review**: Benchmark result review assignments

**Visual**: Table with package names, owners, and responsibilities

---

### 13. Command Palette (⌘K) `[DASHBOARD.COMMAND.PALETTE.RG:IMPLEMENTATION]`

**Location**: Global keyboard shortcut  
**Features**:
- **Search Team Members**: Quick search by name or username
- **Search Packages**: Quick search by package name
- **Quick Navigation**: Jump to sections or team members

**Functions**: `openCommandPalette()`, `handleCommandPaletteSearch()`  
**RG Marker**: `[DASHBOARD.COMMAND.PALETTE.RG:IMPLEMENTATION]`

**Visual**: Modal overlay with search input

---

### 14. Interactive Filtering `[DASHBOARD.FILTER.INTERACTIVE.RG:IMPLEMENTATION]`

**Location**: Throughout dashboard  
**Features**:
- **Team-Based Filtering**: Filter by team (Sports, Markets, Platform)
- **Package Search**: Search packages by name
- **Person Search**: Search team members by name

**Functions**: `filterTeam()`, `searchPackages()`, `searchPersons()`  
**RG Marker**: `[DASHBOARD.FILTER.INTERACTIVE.RG:IMPLEMENTATION]`

**Visual**: Filter buttons, search inputs

---

### 15. Patch Tracking `[DASHBOARD.PATCH.TRACKING.RG:IMPLEMENTATION]`

**Location**: RSS feed section  
**Features**:
- **Dependency Patches**: Track patched dependencies
- **RSS Constants Integration**: RSS feed integration for patch notifications

**RG Marker**: `[DASHBOARD.PATCH.TRACKING.RG:IMPLEMENTATION]`

**Visual**: Patch list with timestamps

---

## 🔗 API Integrations

### Team Info Query
- **Endpoint**: `POST /api/team/info`
- **Purpose**: Query Human Capital Knowledge Graph (`TEAM.md`)
- **Parameters**: `{ query: string }`
- **Returns**: `{ query, section, content, contacts, relatedMarkers }`

### PR Reviewer Assignment
- **Endpoint**: `POST /api/pr/reviewers`
- **Purpose**: ML-driven PR reviewer suggestions
- **Parameters**: `{ prNumber: string, baseBranch: string }`
- **Returns**: `PRReviewerAssignment` with ranked `ReviewerSuggestion[]`

### Workspace Statistics
- **Endpoint**: `GET /api/registry/workspace`
- **Purpose**: Developer workspace metrics
- **Returns**: `{ activeKeys, onboarding, interviews, requests24h }`

### Workspace Keys
- **Endpoint**: `GET /api/workspace/keys`
- **Purpose**: List all workspace keys
- **Returns**: `WorkspaceKey[]` with email, purpose, expiration, requestCount

### RSS Feed
- **Endpoint**: `GET /api/rss.xml`
- **Purpose**: Team updates and patch notifications
- **Returns**: RSS XML feed

---

## 🎨 Visual Features

### Color Scheme
- **Blue** (`--accent-blue`): Primary actions, links, MCP tools
- **Purple** (`--accent-purple`): Architecture diagrams, benchmarks
- **Green** (`--accent-green`): RSS feeds, success states
- **Orange** (`--accent-orange`): Team coordination, alerts

### Layout
- **Responsive Grid**: Auto-adjusting columns based on screen size
- **Card-Based UI**: Consistent card styling throughout
- **Hover Effects**: Interactive feedback on clickable elements

### States
- **Loading States**: Spinner animations during API calls
- **Error Handling**: User-friendly error messages
- **Empty States**: Helpful messages when no data available

---

## 🔍 RG Markers (25+ Total)

### Dashboard Sections
- `[DASHBOARD.TEAM.ORGANIZATION.RG:OVERVIEW]`
- `[DASHBOARD.STATISTICS.RG:UI]`
- `[DASHBOARD.METADATA.STANDARDS.RG:UI]`
- `[DASHBOARD.TEAM.FILTER.RG:UI]`
- `[DASHBOARD.MERMAID.DIAGRAM.RG:UI]`
- `[DASHBOARD.QUICK.ACTIONS.RG:UI]`
- `[DASHBOARD.MCP.AI.TOOLS.RG:UI]`
- `[DASHBOARD.MCP.ARCHITECTURE.DIAGRAM.RG:UI]`
- `[DASHBOARD.TEAM.CARDS.RG:UI]`
- `[DASHBOARD.PACKAGE.OWNERSHIP.RG:UI]`

### JavaScript Functions
- `[DASHBOARD.TEAM.INFO.QUERY.RG:IMPLEMENTATION]`
- `[DASHBOARD.TEAM.INFO.QUERY.EXECUTE.RG:IMPLEMENTATION]`
- `[DASHBOARD.TEAM.INFO.RENDER.RG:IMPLEMENTATION]`
- `[DASHBOARD.PR.REVIEWER.ASSIGNMENT.RG:IMPLEMENTATION]`
- `[DASHBOARD.PR.REVIEWER.ANALYZE.RG:IMPLEMENTATION]`
- `[DASHBOARD.PR.REVIEWER.RENDER.RG:IMPLEMENTATION]`
- `[DASHBOARD.DEVELOPER.WORKSPACE.RG:IMPLEMENTATION]`
- `[DASHBOARD.WORKSPACE.LOAD.STATS.RG:IMPLEMENTATION]`
- `[DASHBOARD.WORKSPACE.RENDER.STATS.RG:IMPLEMENTATION]`
- `[DASHBOARD.WORKSPACE.LOAD.KEYS.RG:IMPLEMENTATION]`
- `[DASHBOARD.WORKSPACE.RENDER.KEYS.RG:IMPLEMENTATION]`
- `[DASHBOARD.COMMAND.PALETTE.RG:IMPLEMENTATION]`
- `[DASHBOARD.FILTER.INTERACTIVE.RG:IMPLEMENTATION]`
- `[DASHBOARD.RSS.FEED.RG:IMPLEMENTATION]`
- `[DASHBOARD.PATCH.TRACKING.RG:IMPLEMENTATION]`

---

## 🚀 Usage

### Accessing the Dashboard
```bash
# Start the API server
bun run dev

# Open in browser
open http://localhost:3000/dashboard/team-organization.html
```

### Querying Team Info
1. Enter a query in the "Team Info Query" section (e.g., `department:arbitrage`, `role:lead`)
2. Click "Query" or press Enter
3. View results with contacts and related markers

### Analyzing PR Reviewers
1. Enter PR number and base branch
2. Click "Analyze PR Reviewers"
3. Review ranked suggestions with confidence scores

### Viewing Workspace Stats
1. Navigate to "Developer Workspace" section
2. Click "Refresh Stats" to update metrics
3. View active keys list below statistics

---

## 📚 Related Documentation

- **Human Capital Orchestration**: `docs/24.0.0.0.0.0.0-HUMAN-CAPITAL-ORCHESTRATION.md`
- **Cross-Subsystem Integration**: `docs/26.0.0.0.0.0.0-CROSS-SUBSYSTEM-INTEGRATION-ORCHESTRATION.md`
- **MCP AI Team Integration**: `docs/MCP-AI-TEAM-INTEGRATION.md`
- **Team Organization Patterns**: `docs/TEAM-ORGANIZATION-IMPLEMENTATION-PATTERNS.md`

---

## 🔧 Technical Details

### Technologies
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Styling**: CSS Variables for theming
- **Diagrams**: Mermaid.js (C4Component)
- **API**: Hono REST API
- **Backend**: Bun runtime

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Mermaid.js for diagram rendering

---

## 📝 Changelog

### 2025-01-10
- ✅ Added MCP Integration Architecture Diagram (`[DASHBOARD.MCP.ARCHITECTURE.DIAGRAM.RG:UI]`)
- ✅ Enhanced MCP AI Team Tools section with visual architecture
- ✅ Standardized RG markers across all dashboard sections

### Previous Updates
- ML-Driven PR Reviewer Assignment integration
- Developer Workspace metrics integration
- Team Info Query (Human Capital Knowledge Graph) integration
- Command Palette (⌘K) implementation
- Interactive filtering system

---

**RG Marker**: `[DASHBOARD.TEAM.ORGANIZATION.DOCUMENTATION.RG:META]`



