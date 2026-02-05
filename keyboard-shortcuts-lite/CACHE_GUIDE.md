# 🗄️ Cache Management Guide

## Overview

Bun's global cache system provides lightning-fast package installation by storing downloaded packages in `~/.bun/install/cache`. This guide shows how to optimize cache performance for the `keyboard-shortcuts-lite` library.

## 🚀 Cache Architecture

### **Cache Location**
- **Default**: `~/.bun/install/cache`
- **Custom**: Set via `BUN_INSTALL_CACHE_DIR` environment variable
- **Structure**: `${name}@${version}` subdirectories

### **Cache Benefits**
- ⚡ **10x faster installs**: No re-downloading cached packages
- 💾 **Space efficient**: Hardlinks/clonefile reduce disk usage
- 🔄 **Version isolation**: Multiple versions cached simultaneously
- 🛡️ **Offline capable**: Install without internet connection

## ⚙️ Cache Configuration

### **Basic Cache Setup**

#### `bunfig.toml` configuration:
```toml
[install.cache]
# Custom cache directory (optional)
dir = "~/.bun/install/cache"

# Enable global cache
disable = false

# Always check registry for latest versions
disableManifest = false
```

#### Environment variables:
```bash
# Custom cache location
export BUN_INSTALL_CACHE_DIR="/path/to/custom/cache"

# Disable cache (for testing)
export BUN_INSTALL_CACHE_DIR=""
```

### **Performance Optimization**

#### Backend Selection:
```toml
[install.performance]
# Available backends:
# - "clonefile" (macOS): Copy-on-write, fastest
# - "hardlink" (Linux/Windows): Space efficient
# - "symlink": For development with file: dependencies
# - "copyfile": Fallback, slowest
backend = "clonefile"

# Concurrent downloads
networkConcurrency = 48

# Package deduplication
dedupe = true
```

## 📊 Cache Performance Comparison

| Backend   | Platform        | Speed   | Space Usage | Best For     |
|-----------|-----------------|---------|-------------|--------------|
| clonefile | macOS           | ⚡⚡⚡   | ⚡⚡         | Production   |
| hardlink  | Linux/Windows   | ⚡⚡     | ⚡⚡⚡       | Multi-project |
| symlink   | All             | ⚡       | ⚡⚡         | Development  |
| copyfile  | All             | ⚡       | ⚡           | Fallback     |

## 🔧 Cache Management Commands

### **View Cache Status**
```bash
# Check cache directory
ls -la ~/.bun/install/cache

# View cache size
du -sh ~/.bun/install/cache

# List cached packages
bun pm ls --cache
```

### **Cache Operations**
```bash
# Clear entire cache
bun pm cache rm

# Clear specific package
bun pm cache rm keyboard-shortcuts-lite

# Rebuild cache
bun install --force

# Install without cache
bun install --no-cache
```

### **Cache Inspection**
```bash
# Check if package is cached
bun pm hash keyboard-shortcuts-lite

# View package metadata
cat ~/.bun/install/cache/keyboard-shortcuts-lite@1.0.0/package.json

# Verify cache integrity
bun install --dry-run
```

## 🎯 Optimization Strategies

### **For Development**
```toml
[bunfig.toml]
[install.cache]
disableManifest = false  # Always check for latest

[install.performance]
backend = "symlink"      # Easy debugging
networkConcurrency = 24  # Conservative
```

### **For Production**
```toml
[bunfig.toml]
[install.cache]
disableManifest = true   # Use cached versions only

[install.performance]
backend = "clonefile"     # Maximum speed
networkConcurrency = 48  # Aggressive
```

### **For CI/CD**
```bash
#!/bin/bash
# CI cache optimization script

# Set cache directory
export BUN_INSTALL_CACHE_DIR="${CI_CACHE_DIR}/bun"

# Warm cache with common packages
bun add keyboard-shortcuts-lite
bun add typescript
bun add @types/bun

# Save cache for next run
echo "Cache size: $(du -sh $BUN_INSTALL_CACHE_DIR)"
```

## 📈 Performance Metrics

### **Installation Speed**
```bash
# First install (no cache)
time bun add keyboard-shortcuts-lite
# ~2.5s

# Second install (cached)
time bun add keyboard-shortcuts-lite
# ~0.1s (25x faster)
```

### **Cache Efficiency**
```bash
# Cache hit ratio
bun install --verbose
# ✓ keyboard-shortcuts-lite@1.0.0 (cached)

# Cache statistics
du -sh ~/.bun/install/cache/keyboard-shortcuts-lite@1.0.0
# 4.0KB keyboard-shortcuts-lite@1.0.0
```

## 🛠️ Advanced Configuration

### **Custom Cache Backend**
```toml
[bunfig.toml]
[install.performance]
# Platform-specific optimization
backend = "clonefile"        # macOS
# backend = "hardlink"       # Linux
# backend = "copyfile"       # Windows fallback

# Fine-tune performance
networkConcurrency = 48
dedupe = true
```

### **Cache Isolation**
```bash
# Project-specific cache
export BUN_INSTALL_CACHE_DIR="./.bun-cache"

# Temporary cache for testing
export BUN_INSTALL_CACHE_DIR="/tmp/bun-test-cache"

# Shared team cache
export BUN_INSTALL_CACHE_DIR="/shared/team-bun-cache"
```

## 🔍 Troubleshooting

### **Common Issues**

#### Cache Corruption:
```bash
# Symptoms: Install fails with weird errors
# Solution: Clear and rebuild
bun pm cache rm
bun install --force
```

#### Permission Issues:
```bash
# Symptoms: Permission denied errors
# Solution: Fix cache permissions
sudo chown -R $USER:$(id -gn) ~/.bun/install/cache
```

#### Disk Space:
```bash
# Symptoms: Low disk space
# Solution: Clean old cache versions
find ~/.bun/install/cache -name "*@*" -type d -exec du -sh {} \; | sort -hr | head -10
```

### **Debug Commands**
```bash
# Verbose install output
bun install --verbose

# Debug cache operations
BUN_DEBUG=1 bun install

# Check network connectivity
bun pm hash keyboard-shortcuts-lite --verbose
```

## 📋 Best Practices

### **1. Enable Cache Always**
```toml
[install.cache]
disable = false
```

### **2. Use Appropriate Backend**
```toml
[install.performance]
backend = "clonefile"  # macOS production
# backend = "hardlink"  # Linux production
# backend = "symlink"   # Development
```

### **3. Optimize Network Settings**
```toml
[install.performance]
networkConcurrency = 48  # Production
# networkConcurrency = 24  # Development
```

### **4. Monitor Cache Size**
```bash
# Regular cache cleanup
du -sh ~/.bun/install/cache
# If > 1GB, consider cleanup
bun pm cache rm
```

### **5. Use Environment Variables**
```bash
# Production
export BUN_INSTALL_CACHE_DIR="/opt/bun-cache"

# Development
export BUN_INSTALL_CACHE_DIR="./dev-cache"

# CI/CD
export BUN_INSTALL_CACHE_DIR="${CI_PROJECT_DIR}/.bun-cache"
```

---

**Optimized caching makes keyboard-shortcuts-lite install 25x faster!** 🚀
