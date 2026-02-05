# **Documentation Audit System - Quick Reference**

**Quick start guide for the Bun Child Process Integration audit system.**

---

## **Quick Start**

```bash
# Basic audit
bun run audit orphans          # Find orphaned docs
bun run audit undocumented     # Find undocumented code
bun run audit validate         # Fast validation

# Real-time features
bun run audit:watch           # Watch mode (auto-audit on changes)
bun run audit:real-time       # Streaming audit
bun run audit:parallel        # Parallel scanning

# Comprehensive
bun run audit full            # Full audit (internal + external)
bun run audit ci              # CI/CD optimized
bun run audit fix             # Auto-fix issues
```

---

## **Common Workflows**

### **Development**

```bash
# Start watch mode in background
bun run audit:watch &

# Or use dev mode
bun run dev:audit
```

### **Pre-Commit**

```bash
# Fast validation before commit
bun run audit:validate
```

### **Pre-Push**

```bash
# Full audit before push
bun run audit:all
```

### **CI/CD**

```bash
# JSON output for automation
bun run audit ci --json > audit-results.json
```

---

## **External Tools**

```bash
# Run specific tool
bun run audit tools eslint
bun run audit tools prettier
bun run audit tools markdown
bun run audit tools spellcheck
bun run audit tools links
```

---

## **Environment Variables**

```bash
# Use Workers API (faster)
AUDIT_USE_WORKERS=true bun run audit:parallel

# Increase concurrency
AUDIT_MAX_WORKERS=8 bun run audit:parallel

# Set timeout
AUDIT_TIMEOUT=60000 bun run audit:real-time

# JSON output
AUDIT_OUTPUT_FORMAT=json bun run audit full

# Verbose logging
AUDIT_VERBOSE=true bun run audit full
```

---

## **Performance Tips**

1. **Use Workers API** for CPU-intensive tasks: `AUDIT_USE_WORKERS=true`
2. **Increase concurrency** for large codebases: `AUDIT_MAX_WORKERS=8`
3. **Use watch mode** during development for instant feedback
4. **Use CI mode** for pipelines: `bun run audit ci`

---

## **Troubleshooting**

```bash
# Check if ripgrep is installed
which rg

# Test basic functionality
bun run audit:validate

# Check for issues
bun run audit orphans
bun run audit undocumented

# Fix formatting
bun run audit fix
```

---

## **File Locations**

- **CLI**: `src/cli/audit.ts`
- **Enhanced CLI**: `scripts/audit-enhanced.ts`
- **Worker Script**: `scripts/audit-real-time.ts`
- **Process Manager**: `src/audit/real-time-process-manager.ts`
- **Orchestrator**: `src/audit/main-audit-orchestrator.ts`
- **Shell Integration**: `src/audit/shell-integration.ts`
- **Bunx Integration**: `src/audit/bunx-integration.ts`

---

## **Cross-References**

- **Full Documentation**: `docs/AUDIT-SYSTEM-INTEGRATION.md`
- **Registry System**: `docs/REGISTRY-SYSTEM.md`
- **Bun.spawn API**: See Bun documentation

---

**Last Updated:** 2024
