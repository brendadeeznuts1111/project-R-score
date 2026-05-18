---
name: tier1380-audit
description: |
  Tier-1380 OMEGA Audit CLI - Col-89 compliance engine with SQLite persistence,
  LightningCSS optimization, RSS monitoring, and real-time HTML dashboard.
  
  Use when: auditing code for Col-89 violations, optimizing CSS, monitoring RSS feeds,
  or running compliance checks across the Tier-1380 infrastructure.
  
  Triggers: "audit", "col-89", "compliance", "lightningcss", "dashboard", "glyph"
---

# Tier-1380 Audit Skill

> **Version:** 1.0.0  
> **Tier:** 1380%  
> **Glyphs:** ▵⟂⥂ ⥂⟂(▵⟜⟳) ⟳⟲⟜(▵⊗⥂) ⊟

## Overview

The Tier-1380 Audit CLI provides comprehensive compliance checking and optimization tools:

- **Col-89 Scanner** - Detect line width violations with SQLite persistence
- **LightningCSS Optimizer** - Minify CSS with sourcemap generation
- **RSS Monitor** - Track Bun news and updates
- **Real-time Dashboard** - Self-updating HTML dashboard on port 1380
- **SQLite Audit Trail** - Persistent violation and audit logging

## Quick Commands

```bash
# Col-89 Compliance
bun run tier1380:audit check README.md     # Scan file for violations
bun run tier1380:audit check src/          # Scan directory
bun run tier1380:audit check              # Default: README.md

# CSS Optimization
bun run tier1380:audit css styles.css     # Minify CSS
bun run tier1380:audit css src/app.css    # With sourcemap

# RSS Monitoring
bun run tier1380:audit rss                # Default: bun.sh/rss.xml
bun run tier1380:audit rss https://example.com/feed.xml

# Security Scan (File Extensions)
bun run tier1380:audit scan               # Default: .exe,.dll,.sh in ./dist
bun run tier1380:audit scan ".exe,.bat"   # Custom extensions
bun run tier1380:audit scan ".exe,.dll" ./build  # Custom dir

# Secure Package Execution (bunx wrapper)
bun run tier1380:exec prisma migrate dev --name init
bun run tier1380:exec --bun vite build
bun run tier1380:exec prettier@2.8.8 --write "src/**/*.ts"
bun run tier1380:exec -p @angular/cli@15.0.0 ng new my-app

# Execution Audit
bun run tier1380:exec:stats               # Show execution statistics
bun run tier1380:exec:log                 # Show recent executions
bun run tier1380:exec:packages            # Show package history

# System Information
bun run tier1380:sysinfo                  # Full system summary

# Dashboard
bun run tier1380:audit dashboard          # Launch http://localhost:1380

# Database
bun run tier1380:audit db                 # View recent violations
bun run tier1380:audit clean              # Clear all data
```

## One-Liners

```bash
# Col-89 gate (returns exit code 1 on violation)
bun -e 'const f=Bun.argv[1]||"README.md";const s=await Bun.file(f).text();const v=s.split("\n").filter(l=>Bun.stringWidth(l,{countAnsiEscapeCodes:false})>89).length;console.log(`${v} violations`);process.exit(v>0?1:0)'

# CRC32 throughput benchmark
bun -e 'const b=Buffer.alloc(1<<20),t=performance.now();for(let i=0;i<100;i++)Bun.hash.crc32(b);console.log(`Throughput: ${(100/(performance.now()-t)*1000).toFixed(0)} MB/s`)'

# SQLite violation count
bun -e 'import{Database}from"bun:sqlite";console.log((new Database("./data/tier1380.db").query("SELECT COUNT(*) as c FROM violations").get()as any).c)'

# LightningCSS size diff
bun -e 'import{transform}from"lightningcss";const c=await Bun.file("app.css").text();const r=transform({code:Buffer.from(c),minify:true});console.log(((1-r.code.length/c.length)*100).toFixed(1)+"% saved")'

# Security scan for bad extensions
bun -e 'const bad=new Set([".exe",".dll",".sh"]);const d="./dist";for await(const f of new Bun.Glob("**/*").scan(d)){const e=f.slice(f.lastIndexOf("."));if(bad.has(e))console.log(`⚠️ Illegal: ${f}`)}'

# Package integrity check (Wyhash)
bun -e 'const pkg=process.argv[3];const h=Bun.hash.wyhash(Buffer.from(pkg)).toString(16);console.log(`Package: ${pkg}\nAudit: ${h}`)' -- prisma

# View recent executions
bun -e 'import{Database}from"bun:sqlite";const d=new Database("./data/tier1380.db");console.table(d.query("SELECT * FROM executions ORDER BY ts DESC LIMIT 5").all())'
```

## Dashboard API

The dashboard exposes these endpoints:

| Endpoint | Description |
|----------|-------------|
| `/` | HTML dashboard (auto-refresh 30s) |
| `/api/stats` | Violation count + recent audits (JSON) |
| `/api/rss` | Latest RSS feed data (JSON) |
| `/api/health` | Health check endpoint (JSON) |

## SQLite Schema

```sql
-- Violations table
CREATE TABLE violations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER DEFAULT (unixepoch()),
  file TEXT,
  line INTEGER,
  width INTEGER,
  preview TEXT,
  glyph TEXT DEFAULT '▵⟂⥂'
);

-- Audits table
CREATE TABLE audits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER DEFAULT (unixepoch()),
  command TEXT,
  duration_ms REAL,
  result TEXT
);

-- Executions table (tier1380-exec)
CREATE TABLE executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER DEFAULT (unixepoch()),
  cmd TEXT,
  args TEXT,
  hash TEXT,
  exit INTEGER,
  duration_ms REAL
);

-- Packages table (tier1380-exec)
CREATE TABLE packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER DEFAULT (unixepoch()),
  name TEXT,
  version TEXT,
  hash TEXT,
  reputation TEXT,
  cached INTEGER
);
```

## Glyph Reference

| Glyph | Meaning | Usage |
|-------|---------|-------|
| ▵⟂⥂ | Structural Drift | Default state, violations found |
| ⥂⟂(▵⟜⟳) | Dependency Coherence | RSS/network operations |
| ⟳⟲⟜(▵⊗⥂) | Phase Locked | Optimization complete |
| ⊟ | Audit | Violation marker |

## Dependencies

Optional dependencies for full functionality:

```bash
# LightningCSS support
bun add lightningcss

# XML parsing for RSS (fallback to regex if not installed)
bun add linkedom
```

## Integration

### With MCP
```bash
{ "tool": "shell_execute", "args": { "command": "bun run tier1380:audit check src/" } }
```

### With OpenClaw
```bash
# Check compliance before deploy
bun run tier1380:audit check && bun run omega:deploy:staging
```

### With Commit Flow
```bash
# Pre-commit hook
/commit "[AUDIT][COL89][TIER:1380] Fix line width violations"
```

## Files

- `cli/tier1380-audit.ts` - Main audit CLI
- `data/tier1380.db` - SQLite database (auto-created)

---

*Updated: 2026-01-31 | Tier-1380 Audit v1.0.0*
