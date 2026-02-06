# Dashboard Navigation Guide

**Last Updated**: 2025-12-08  
**Status**: ✅ Complete Deep Linking System

---

## Quick Access

All dashboards can be opened directly using `file://` protocol:

```bash
# macOS
open dashboard/multi-layer-graph.html
open dashboard/index.html
open dashboard/mlgs-developer-dashboard.html

# Linux
xdg-open dashboard/multi-layer-graph.html

# Windows
start dashboard/multi-layer-graph.html
```

---

## Dashboard Directory

| Dashboard | File | Purpose | Documentation |
|-----------|------|---------|---------------|
| **Multi-Layer Graph** | `multi-layer-graph.html` | Interactive correlation visualization | [Multi-Layer Graph README](./dashboard/MULTI-LAYER-GRAPH-README.md) |
| **Main Dashboard** | `index.html` | System health, API status, Telegram | [Dashboard README](./dashboard/README.md) |
| **MLGS Developer** | `mlgs-developer-dashboard.html` | MarketDataRouter17 monitoring | [Market Router Docs](./MARKET-DATA-ROUTER-17-COMPLETE.md) |
| **NEXUS Registry** | `17.14.0-nexus-dashboard.html` | Registry system dashboard | [Registry System](./17.14.0.0.0.0.0-NEXUS-REGISTRY-SYSTEM.md) |
| **Registry Browser** | `registry.html` | Component registry browser | [Registry System](./17.14.0.0.0.0.0-NEXUS-REGISTRY-SYSTEM.md) |
| **Workspace** | `workspace.html` | Workspace management | [Bun Workspaces](./BUN-WORKSPACES.md) |
| **Examples** | `examples.html` | Code examples browser | [Examples README](./examples/README.md) |
| **Correlation Graph** | `correlation-graph.html` | Correlation analysis | [Market Router Docs](./MARKET-DATA-ROUTER-17-COMPLETE.md) |

---

## Deep Links

### From Documentation to Dashboards

All documentation files include deep links to relevant dashboards:

```markdown
**📊 Related Dashboard**: [Multi-Layer Graph](./../dashboard/multi-layer-graph.html)
```

### From Dashboards to Documentation

All dashboards include header links to:
- Documentation Index
- Relevant feature guides
- Related dashboards

---

## Navigation Patterns

### Feature-Based Navigation

1. **Proxy Management**
   - Documentation: [Custom Proxy Headers](./BUN-1.3.51.1-CUSTOM-PROXY-HEADERS-INTEGRATION.md)
   - Dashboard: [Multi-Layer Graph](./../dashboard/multi-layer-graph.html) (shows proxy health)

2. **Structured Logging**
   - Documentation: [Standalone & Logging](./BUN-1.3.51.1-STANDALONE-AND-LOGGING-INTEGRATION.md)
   - Dashboard: [MLGS Developer](./../dashboard/mlgs-developer-dashboard.html) (shows structured logs)

3. **System Health**
   - Documentation: [Runtime Fixes](./BUN-1.3.51.1-RUNTIME-FIXES-AND-IMPROVEMENTS.md)
   - Dashboard: [Main Dashboard](./../dashboard/index.html) (shows system health)

4. **Correlation Analysis**
   - Documentation: [Market Router](./MARKET-DATA-ROUTER-17-COMPLETE.md)
   - Dashboards: [Correlation Graph](./../dashboard/correlation-graph.html), [Multi-Layer Graph](./../dashboard/multi-layer-graph.html)

5. **Registry System**
   - Documentation: [NEXUS Registry](./17.14.0.0.0.0.0-NEXUS-REGISTRY-SYSTEM.md)
   - Dashboards: [NEXUS Registry](./../dashboard/17.14.0-nexus-dashboard.html), [Registry Browser](./../dashboard/registry.html)

---

## File Paths

### Absolute Paths (file://)

```text
file:///Users/nolarose/Projects/trader-analyzer/dashboard/multi-layer-graph.html
file:///Users/nolarose/Projects/trader-analyzer/dashboard/index.html
file:///Users/nolarose/Projects/trader-analyzer/dashboard/mlgs-developer-dashboard.html
file:///Users/nolarose/Projects/trader-analyzer/dashboard/17.14.0-nexus-dashboard.html
file:///Users/nolarose/Projects/trader-analyzer/dashboard/registry.html
file:///Users/nolarose/Projects/trader-analyzer/dashboard/workspace.html
file:///Users/nolarose/Projects/trader-analyzer/dashboard/examples.html
file:///Users/nolarose/Projects/trader-analyzer/dashboard/correlation-graph.html
```

### Relative Paths (from docs/)

```markdown
[Multi-Layer Graph](./../dashboard/multi-layer-graph.html)
[Main Dashboard](./../dashboard/index.html)
[MLGS Developer](./../dashboard/mlgs-developer-dashboard.html)
```

---

## Integration Points

### Documentation → Dashboard Flow

1. **Read Documentation** → Understand feature
2. **Click Dashboard Link** → Open interactive visualization
3. **Explore Dashboard** → See live data
4. **Click Back to Docs** → Return to documentation

### Dashboard → Documentation Flow

1. **Open Dashboard** → See visualization
2. **Click Docs Link** → Read detailed documentation
3. **Understand Feature** → Learn implementation details
4. **Return to Dashboard** → Apply knowledge

---

## Cross-Reference Matrix

| Documentation | Primary Dashboard | Secondary Dashboard |
|---------------|-------------------|---------------------|
| Custom Proxy Headers | Multi-Layer Graph | Main Dashboard |
| Standalone & Logging | MLGS Developer | Main Dashboard |
| Runtime Fixes | Main Dashboard | MLGS Developer |
| Market Router | MLGS Developer | Correlation Graph |
| NEXUS Registry | NEXUS Registry | Registry Browser |
| Bun Workspaces | Workspace | Main Dashboard |
| Examples | Examples | - |

---

## Quick Reference

### Open All Dashboards

```bash
# macOS - Open all dashboards
open dashboard/*.html

# Or individually
open dashboard/multi-layer-graph.html
open dashboard/index.html
open dashboard/mlgs-developer-dashboard.html
open dashboard/17.14.0-nexus-dashboard.html
open dashboard/registry.html
open dashboard/workspace.html
open dashboard/examples.html
open dashboard/correlation-graph.html
```

### Documentation Index

- [Documentation Index](./DOCUMENTATION-INDEX.md) - Complete navigation hub

---

**Last Updated**: 2025-12-08  
**Maintained By**: NEXUS Team
