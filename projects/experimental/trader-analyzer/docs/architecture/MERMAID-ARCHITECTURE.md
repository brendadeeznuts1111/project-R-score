# Mermaid Architecture Diagram

**Version**: 1.0.0  
**Last Updated**: 2025-01-27

---

## Team Structure & Package Ownership Architecture

```mermaid
C4Component
title Multi-Layer Graph: Team Structure & Package Ownership

Person(sports_lead, "Alex Chen", "Team Lead: Sports Correlation", "Owns @graph/layer4, @graph/layer3")
Person(markets_lead, "Sarah Kumar", "Team Lead: Market Analytics", "Owns @graph/layer2, @graph/layer1")
Person(platform_lead, "Mike Rodriguez", "Team Lead: Platform & Tools", "Owns @graph/algorithms, @graph/storage, @graph/streaming, @graph/utils, @bench/*")

Container_Boundary(private_registry, "Private Registry: npm.internal.yourcompany.com") {
  ContainerDb(registry_db, "Registry DB (PostgreSQL)", 
    "Package metadata, versions, maintainer ACLs, benchmark history")
  
  Container(registry_api, "Registry API (Bun + Elysia)", 
    "npm-compatible endpoint with maintainer auth, version & metadata management")
  
  Container(registry_ui, "Registry UI (Bun + HTMX)", 
    "Package browsing, version timeline, benchmark dashboards, maintainer tools")
}

Container_Boundary(bun_workspace, "Bun Workspace: Local Development") {
  Container(api_gateway, "API Gateway", "@graph/api-gateway", "REST/WebSocket endpoints")
  Container(worker_service, "Worker Service", "@graph/worker", "Background jobs")
  
  Container_Boundary(packages_sports, "@graph/layer4 & @graph/layer3 (Alex's Team)") {
    Component(layer4, "@graph/layer4", "Cross-Sport", "Detects sport correlation anomalies")
    Component(layer3, "@graph/layer3", "Cross-Event", "Detects temporal patterns")
    Component(bench_layer4, "@bench/layer4", "Layer 4 Bench", "Sport correlation property iteration")
  }
  
  Container_Boundary(packages_markets, "@graph/layer2 & @graph/layer1 (Maria's Team)") {
    Component(layer2, "@graph/layer2", "Cross-Market", "Market efficiency detection")
    Component(layer1, "@graph/layer1", "Direct", "Price correlation detection")
    Component(bench_layer2, "@bench/layer2", "Layer 2 Bench", "Market property iteration")
  }
  
  Container_Boundary(packages_infra, "@graph/* Infrastructure (David's Team)") {
    Component(algorithms, "@graph/algorithms", "Detection Core", "Statistical models")
    Component(storage, "@graph/storage", "State Manager", "SQLite + TimescaleDB")
    Component(streaming, "@graph/streaming", "Data Ingestion", "WebSocket adapters")
    Component(utils, "@graph/utils", "Error Wrapper", "Defensive error handling")
  }
  
  Container_Boundary(packages_benchmark, "@bench/* Modular Benchmarks (Sarah's Team)") {
    Component(bench_props, "@bench/property", "Property Iteration", "Fast property testing")
    Component(bench_stress, "@bench/stress", "Stress Tests", "Load testing")
    Component(bench_layer1, "@bench/layer1", "Layer 1 Bench", "Price correlation benchmarks")
    Component(bench_layer3, "@bench/layer3", "Layer 3 Bench", "Event temporal benchmarks")
  }
}

ContainerDb(timescaledb, "TimescaleDB", "Time-series: graphs, benchmarks, version history")
ContainerDb(redis, "Redis", "Job queues, cache, pub/sub")

Rel(sports_lead, registry_ui, "Publish @graph/layer4", "Browser UI")
Rel(markets_lead, registry_ui, "Publish @graph/layer2", "Browser UI")
Rel(platform_lead, registry_ui, "Publish @graph/* & @bench/*", "Browser UI")

Rel(sports_lead, bench_layer4, "Iterate threshold property", "Edit & test")
Rel(markets_lead, bench_layer2, "Iterate spread property", "Edit & test")

Rel(registry_ui, registry_db, "Store package + maintainer info", "SQL")
Rel(registry_api, registry_db, "Query packages", "SQL")
Rel(registry_api, timescaledb, "Archive version history", "SQL")

UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
UpdateElementStyle(sports_lead, $bgColor="#fff3e0", $fontColor="#e65100")
UpdateElementStyle(markets_lead, $bgColor="#e8f5e9", $fontColor="#1b5e20")
UpdateElementStyle(benchmark_lead, $bgColor="#f9f1ff", $fontColor="#4a148c")
```

---

## Team Structure Summary

| Team Lead | Packages | Maintainer(s) | Reviewers | Registry Access |
|-----------|----------|---------------|-----------|-----------------|
| **Alex Chen** | `@graph/layer4`, `@graph/layer3` | Jordan Lee, Priya Patel | Alex, Mike | Full-access |
| **Sarah Kumar** | `@graph/layer2`, `@graph/layer1` | Tom Wilson, Lisa Zhang | Sarah, Mike | Full-access |
| **Mike Rodriguez** | `@graph/algorithms`, `@graph/storage`, `@graph/streaming`, `@graph/utils`, `@bench/*` | David Kim, Emma Brown, Ryan Gupta | Mike | Full-access |

---

## Related Documentation

- [`docs/architecture/TEAM-PACKAGE-ARCHITECTURE.md`](./TEAM-PACKAGE-ARCHITECTURE.md) - Complete architecture
- [`docs/architecture/TEAM-WORKFLOWS.md`](./TEAM-WORKFLOWS.md) - Team workflows
- [`docs/architecture/REGISTRY-DATABASE-SCHEMA.sql`](./REGISTRY-DATABASE-SCHEMA.sql) - Database schema
