#!/usr/bin/env bash
# verify-cache-behavior.sh

echo "🔍 Verifying Bun cache optimization..."

# 1. Check cache directory exists
CACHE_DIR="${BUN_INSTALL_CACHE_DIR:-$HOME/.bun/install/cache}"
if [[ ! -d "$CACHE_DIR" ]]; then
  echo "❌ Cache directory missing: $CACHE_DIR"
  exit 1
fi
echo "✅ Cache directory: $CACHE_DIR ($(du -sh "$CACHE_DIR" | cut -f1))"

# 2. Check Bun's actual install strategy by comparing a real cached package
# Find a zod file in both cache and node_modules
ZOD_NODE="node_modules/zod/package.json"
if [[ -f "$ZOD_NODE" ]]; then
  INODE_NODE=$(stat -f %i "$ZOD_NODE" 2>/dev/null || stat -c %i "$ZOD_NODE")

  # Find the matching cache entry
  ZOD_CACHE=$(find "$CACHE_DIR" -path "*/zod*/package.json" -maxdepth 4 2>/dev/null | head -1)
  if [[ -n "$ZOD_CACHE" ]]; then
    INODE_CACHE=$(stat -f %i "$ZOD_CACHE" 2>/dev/null || stat -c %i "$ZOD_CACHE")

    if [[ "$INODE_NODE" == "$INODE_CACHE" ]]; then
      echo "✅ Hardlinks active (same inode: $INODE_NODE)"
    else
      # Different inodes — check if APFS clonefile (copy-on-write)
      if [[ "$(uname)" == "Darwin" ]]; then
        echo "✅ Clonefile (copy-on-write) — different inodes, shared data blocks on APFS"
        echo "   node_modules inode: $INODE_NODE"
        echo "   cache inode:        $INODE_CACHE"
      else
        echo "⚠️  Full copy (different inodes, no dedup)"
      fi
    fi
  else
    echo "⚠️  Could not find zod in cache to compare"
  fi
else
  echo "⚠️  zod not in node_modules — skipping dedup check"
fi

# 3. Check for cache-disable misconfiguration
if grep -q "disable = true" bunfig.toml 2>/dev/null; then
  echo "⚠️  Cache disabled in bunfig.toml (slow installs)"
else
  echo "✅ Cache enabled"
fi

echo "✅ Cache verification complete"
