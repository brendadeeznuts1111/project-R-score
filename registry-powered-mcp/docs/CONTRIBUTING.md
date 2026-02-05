# Contributing to Registry-Powered-MCP

## Overview

The **Registry-Powered-MCP** is a high-performance, hardened infrastructure component that maintains **binary parity** across 300 global Points of Presence. Contributions must preserve the **9.64KB bundle size**, **10.8ms p99 latency**, and **SHA-256 integrity signatures**.

## Federation Update Protocols

### Binary Parity Maintenance
All changes must maintain **deterministic parity** across the 300-node global lattice:

```bash
# Verify binary integrity before commit
bun run build
sha256sum packages/core/dist/registry-node

# Compare against known good signatures
diff <(sha256sum packages/core/dist/registry-node) <(cat .parity/registry-node.sha256)
```

### 300 PoP Synchronization
Changes affecting routing or performance must be validated across all regions:

```bash
# Run global parity test
bun test --parity-check --regions=all

# Validate thermal jitter remains at absolute zero
bun run bench:thermal
```

## Development Workflow

### 1. Environment Setup
```bash
# Clone with submodules for parity verification
git clone --recursive https://github.com/brendadeeznuts1111/registry-powered-mcp

# Install with integrity verification
bun install --verify-integrity

# Validate hardened baseline
bun packages/core/src/examples/hardened-contract-demo.ts
```

### 2. Code Changes
```bash
# Create feature branch from main
git checkout -b feature/your-feature

# Make changes preserving bundle size
# Run tests continuously
bun test --watch

# Validate performance contracts
bun run bench
```

### 3. Testing Requirements
```bash
# Unit tests (must pass)
bun run test:unit

# Integration tests (must pass)
bun run test:integration

# Performance regression tests (must pass, <11ms SLA)
bun run test:performance

# Bundle size validation (must be ≤9.64KB)
bun run build && du -h packages/core/dist/registry-node
```

### 4. Documentation Updates
```bash
# Update API documentation if public interfaces change
vim API.md

# Update changelog for user-facing changes
vim CHANGELOG.md

# Validate cross-linking integrity
bun run docs:link-check
```

## Code Standards

### Performance Contracts
- **Zero bundle bloat**: All changes must maintain ≤9.64KB
- **Sub-millisecond dispatch**: Route resolution <1.000μs
- **Native API usage**: Mandatory Bun-native implementations
- **Memory safety**: No heap pressure increase

### Security Requirements
- **ReDoS protection**: All regex patterns validated
- **CSPRNG compliance**: crypto.randomUUID() only for entropy
- **CHIPS compliance**: Partitioned cookie isolation
- **Audit logging**: All state changes logged

### Type Safety
```typescript
// ✅ CORRECT: Type-safe performance contract
export interface ApiDocumentation {
  readonly api: string;
  readonly benefits: readonly string[];
}

// ❌ VIOLATION: Mutable performance claims
export interface BadApiDocumentation {
  api: string;           // Not readonly
  benefits: string[];    // Not readonly array
}
```

## Commit Message Standards

### Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
- `feat`: New feature (user-facing)
- `fix`: Bug fix
- `perf`: Performance improvement
- `docs`: Documentation change
- `refactor`: Code restructure
- `test`: Testing infrastructure
- `chore`: Maintenance

### Examples
```
feat(lattice): add SIMD-accelerated route matching

Performance improvement: 7x faster prefix filtering via vceqq_u8
Closes #123

BREAKING CHANGE: Changes URLPattern API
```

```
perf(core): optimize heap allocation in Identity-Anchor

-14% memory reduction via zero-copy cookie parsing
Maintains 9.64KB bundle size
```

## Pull Request Process

### 1. Pre-Submission Checklist
- [ ] All tests pass (`bun test`)
- [ ] Performance benchmarks pass (`bun run bench`)
- [ ] Bundle size ≤9.64KB (`bun run build`)
- [ ] Documentation updated
- [ ] CHANGELOG.md updated for user-facing changes
- [ ] Cross-linking validated

### 2. PR Template
```markdown
## Summary
Brief description of changes

## Performance Impact
- Bundle size: [increase/decrease/none]
- Latency: [improvement/regression/none]
- Memory: [improvement/regression/none]

## Security Considerations
- [ ] ReDoS protection maintained
- [ ] CSPRNG usage verified
- [ ] Audit logging complete

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Performance SLA validated

## Breaking Changes
- [ ] None
- [ ] Documented in CHANGELOG.md
```

### 3. Review Process
1. **Automated Checks**: CI validates performance contracts
2. **Code Review**: Maintainers review for architecture compliance
3. **Performance Review**: Benchmarks must show improvement or neutrality
4. **Security Review**: Hardened contract violations flagged

## Release Process

### Version Numbering
Follows [Semantic Versioning](https://semver.org/) with infrastructure considerations:

- **MAJOR**: Breaking changes to public API or performance contracts
- **MINOR**: New features maintaining performance SLAs
- **PATCH**: Bug fixes and documentation updates

### Release Checklist
- [ ] Version bump in package.json
- [ ] CHANGELOG.md updated
- [ ] Performance baselines updated
- [ ] Binary parity signatures regenerated
- [ ] 300 PoP synchronization validated
- [ ] Documentation published

## Infrastructure Maintenance

### Parity Lock Management
```bash
# Update parity signatures after approved changes
bun run parity:update

# Validate against 300 PoP baseline
bun run parity:check --global
```

### Performance Monitoring
```bash
# Continuous performance monitoring
bun run monitor:performance

# Alert on SLA violations
bun run monitor:alerts --threshold=11ms
```

## Getting Help

- **Documentation**: See [README.md](README.md) for overview
- **API Reference**: See [API.md](API.md) for LatticeRouterV3 documentation
- **Performance**: See [HARDENED_CONTRACT_INTEGRATION.md](HARDENED_CONTRACT_INTEGRATION.md) for contract details
- **Testing**: See [TESTING.md](TESTING.md) for SLA validation and performance testing
- **Releases**: See [CHANGELOG.md](CHANGELOG.md) for infrastructure change history

## Recognition

Contributors who maintain the hardened performance contracts and binary parity standards are recognized in CHANGELOG.md and receive infrastructure-level access for future contributions.

---

*The Registry maintains its integrity through collective guardianship. Your contributions strengthen the global lattice.*