---
title: Bun documentation index
type: reference
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-15
category: reference
description: Documentation for Bun Documentation Index
acceptEncoding: ""
acceptLanguage: ""
asn: ""
author: Sports Analytics Team
browser: ""
cacheControl: ""
canvas: []
city: ""
connectionType: ""
cookies: {}
cookiesRaw: ""
countryCode: ""
countryName: ""
deprecated: false
dns: ""
e_tag: ""
etag: ""
feed_integration: false
ip: ""
ip4: ""
ip6: ""
ipv4: ""
ipv6: ""
isGeoBlocked: false
isp: ""
latitude: ""
longitude: ""
os: ""
referer: ""
referrer: ""
regionCode: ""
regionName: ""
replaces: ""
requestId: ""
requestMethod: GET
requestPath: ""
tags: []
timezone: ""
usage: ""
user_agent: ""
userAgentRaw: ""
VIZ-06: []
xff: []
xForwardedFor: []
zipCode: ""
---
# Bun Documentation Index

> Complete index of all Bun server documentation and guides

**Last Updated**: 2025-11-14

---

## 📚 Quick Start

New to Bun servers? Start here:
1. **[Quick Reference](./BUN_QUICK_REFERENCE.md)** - Common patterns and snippets
2. **[Server Optimization Summary](./BUN_SERVER_OPTIMIZATION_SUMMARY.md)** - What we've optimized
3. **[Implementation Guide](./BUN_FEATURES_IMPLEMENTATION_GUIDE.md)** - Step-by-step implementation

---

## 🎯 Core Documentation

### Server Features

| Document | Description | Key Topics |
|----------|-------------|------------|
| **[Server Metrics](./BUN_SERVER_METRICS.md)** | Monitor server activity | `pendingRequests`, `pendingWebSockets`, `subscriberCount()` |
| **[Lifecycle Methods](./BUN_SERVER_LIFECYCLE.md)** | Control server lifecycle | `stop()`, `ref()`, `unref()`, `idleTimeout` |
| **[Error Handling](./BUN_ERROR_HANDLING.md)** | Handle errors gracefully | Development mode, error handlers, error pages |
| **[Hot Route Reloading](./BUN_HOT_ROUTE_RELOADING.md)** | Update routes without restart | `server.reload()`, zero-downtime deployments |
| **[TLS Configuration](./BUN_TLS_CONFIGURATION.md)** | Secure connections | SNI, certificates, TLS options |

### Implementation Guides

| Document | Description | Key Topics |
|----------|-------------|------------|
| **[MCP Documentation Review](./BUN_MCP_DOCUMENTATION_REVIEW.md)** | Features found via MCP | Already implemented, opportunities, references |
| **[Features Implementation Guide](./BUN_FEATURES_IMPLEMENTATION_GUIDE.md)** | Step-by-step guide | Code examples, priority matrix, recommendations |
| **[Optimization Summary](./BUN_SERVER_OPTIMIZATION_SUMMARY.md)** | Complete optimization summary | All optimizations, statistics, performance impact |

### Quick References

| Document | Description | Use Case |
|----------|-------------|----------|
| **[Quick Reference](./BUN_QUICK_REFERENCE.md)** | Common patterns | Copy-paste snippets, quick lookups |

---

## 🚀 Feature Categories

### Routing & Performance

- **Type-Safe Routes** - TypeScript-aware route parameters
  - See: [Quick Reference](./BUN_QUICK_REFERENCE.md#-type-safe-routes)
  - Implementation: [Optimization Summary](./BUN_SERVER_OPTIMIZATION_SUMMARY.md#1-type-safe-route-parameters)

- **Static Routes** - Zero-allocation dispatch
  - See: [Quick Reference](./BUN_QUICK_REFERENCE.md#-server-setup)
  - Implementation: [Optimization Summary](./BUN_SERVER_OPTIMIZATION_SUMMARY.md#2-static-routes-optimization)

- **Hot Route Reloading** - Zero-downtime updates
  - See: [Hot Route Reloading](./BUN_HOT_ROUTE_RELOADING.md)
  - Example: [Quick Reference](./BUN_QUICK_REFERENCE.md#-hot-route-reloading)

### Development & Debugging

- **Development Mode** - HMR + console echo
  - See: [Error Handling](./BUN_ERROR_HANDLING.md#development-mode-error-pages)
  - Configuration: [Quick Reference](./BUN_QUICK_REFERENCE.md#-development-mode)

- **Error Handling** - Graceful error responses
  - See: [Error Handling](./BUN_ERROR_HANDLING.md)
  - Patterns: [Quick Reference](./BUN_QUICK_REFERENCE.md#-error-handling)

### Monitoring & Lifecycle

- **Server Metrics** - Built-in monitoring
  - See: [Server Metrics](./BUN_SERVER_METRICS.md)
  - Usage: [Quick Reference](./BUN_QUICK_REFERENCE.md#-server-metrics)

- **Lifecycle Methods** - Server control
  - See: [Lifecycle Methods](./BUN_SERVER_LIFECYCLE.md)
  - Examples: [Quick Reference](./BUN_QUICK_REFERENCE.md#-graceful-shutdown)

### Security & Configuration

- **TLS Configuration** - Secure connections
  - See: [TLS Configuration](./BUN_TLS_CONFIGURATION.md)
  - SNI: [Quick Reference](./BUN_QUICK_REFERENCE.md#-tls-configuration)

- **Idle Timeout** - Connection management
  - See: [Lifecycle Methods](./BUN_SERVER_LIFECYCLE.md#idletimeout)
  - Configuration: [Quick Reference](./BUN_QUICK_REFERENCE.md#-idle-timeout)

---

## 📖 Documentation by Use Case

### "I want to..."

#### ...set up a new server
→ **[Quick Reference](./BUN_QUICK_REFERENCE.md#-server-setup)**  
→ **[Implementation Guide](./BUN_FEATURES_IMPLEMENTATION_GUIDE.md)**

#### ...add type-safe routes
→ **[Quick Reference](./BUN_QUICK_REFERENCE.md#-type-safe-routes)**  
→ **[Optimization Summary](./BUN_SERVER_OPTIMIZATION_SUMMARY.md#1-type-safe-route-parameters)**

#### ...handle errors gracefully
→ **[Error Handling](./BUN_ERROR_HANDLING.md)**  
→ **[Quick Reference](./BUN_QUICK_REFERENCE.md#-error-handling)**

#### ...monitor server performance
→ **[Server Metrics](./BUN_SERVER_METRICS.md)**  
→ **[Quick Reference](./BUN_QUICK_REFERENCE.md#-server-metrics)**

#### ...reload routes without restart
→ **[Hot Route Reloading](./BUN_HOT_ROUTE_RELOADING.md)**  
→ **[Quick Reference](./BUN_QUICK_REFERENCE.md#-hot-route-reloading)**

#### ...configure TLS/SSL
→ **[TLS Configuration](./BUN_TLS_CONFIGURATION.md)**  
→ **[Quick Reference](./BUN_QUICK_REFERENCE.md#-tls-configuration)**

#### ...shutdown gracefully
→ **[Lifecycle Methods](./BUN_SERVER_LIFECYCLE.md#graceful-shutdown-pattern)**  
→ **[Quick Reference](./BUN_QUICK_REFERENCE.md#-graceful-shutdown)**

#### ...enable hot reloading
→ **[Error Handling](./BUN_ERROR_HANDLING.md#development-mode-configuration)**  
→ **[Quick Reference](./BUN_QUICK_REFERENCE.md#-development-mode)**

---

## 🔍 Feature Status

### ✅ Implemented

- Type-safe route parameters
- Static routes optimization
- Development mode (HMR + console)
- Error handlers
- Server metrics integration
- Graceful shutdown
- DNS caching & prefetching
- HTML imports
- WebSocket support

### 📋 Documented

- Server metrics (`pendingRequests`, `pendingWebSockets`)
- Lifecycle methods (`stop()`, `ref()`, `unref()`)
- Hot route reloading (`server.reload()`)
- TLS configuration (SNI, certificates)
- Error handling (development mode, custom handlers)
- Idle timeout configuration
- TCP buffering
- WebSocket API (pub-sub, compression)

### 🚀 Ready to Implement

- WebSocket pub-sub (topic-based messaging)
- Server reload in production (zero-downtime deployments)
- TLS for production (HTTPS support)
- Rate limiting (using `pendingRequests`)
- Request timeout (using `server.timeout()`)

---

## 📊 Server Status

| Server | Type-Safe | Static Routes | Dev Mode | Error Handler | Metrics | Status |
|--------|-----------|---------------|----------|---------------|---------|--------|
| `api-server.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Complete |
| `dashboard-registry.ts` | ✅ | ✅ | ✅ | ✅ | - | ✅ Complete |
| `obsidian-status.ts` | - | ✅ | ✅ | ✅ | - | ✅ Complete |
| `obsidian-proxy.ts` | ✅ | ✅ | ✅ | ✅ | - | ✅ Complete |

---

## 🔗 External References

### Official Bun Documentation

- [Bun Server API](https://bun.com/docs/runtime/http/server)
- [Bun Routes](https://bun.com/docs/runtime/http/routing)
- [Bun WebSocket](https://bun.com/docs/guides/websocket)
- [Bun Fullstack](https://bun.com/docs/bundler/fullstack)
- [Bun Debugger](https://bun.com/docs/runtime/debugger)

### Related Documentation

- [DNS Caching](./BUN_MCP_DOCUMENTATION_REVIEW.md#dns-caching)
- [Dashboard Features](./DASHBOARDS_JSON_BUN_FEATURES.md)
- [Environment Setup](../config/ENV-SETUP.md)

---

## 📝 Quick Links

- **[All Bun Docs](./)** - Browse all documentation
- **[CHANGELOG](../CHANGELOG.md)** - See what's changed
- **[Implementation Guide](./BUN_FEATURES_IMPLEMENTATION_GUIDE.md)** - Step-by-step guide

---

**Documentation Index** | **Last Updated**: 2025-11-14  
**Total Documents**: 8  
**Status**: ✅ Complete

