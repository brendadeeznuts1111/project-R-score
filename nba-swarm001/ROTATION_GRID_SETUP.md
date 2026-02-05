# Rotation Grid - Complete Setup Guide

## Quick Start

### 1. Populate Cache with Test Data

```bash
# Generate 100 mock games
bun run grid:populate 100

# Or customize the count
bun run grid:populate 1000
```

### 2. Generate Index

```bash
bun run grid:index
```

### 3. Search Index

```bash
# Search by league
bun run grid:search "NBA"

# Search by date
bun run grid:search "20251104"

# Search by rotation number
bun run grid:search "001"
```

### 4. Export Data

```bash
# Export as JSON
bun run grid:export --format json

# Export as CSV
bun run grid:export --format csv
```

### 5. Start Dashboard

```bash
# Start dashboard server (includes grid WebSocket server)
bun run suite
```

Then access:
- **Dashboard**: http://localhost:3334
- **Rotation Grid**: http://localhost:3334/views/rotation-grid.html

## Complete Workflow

```bash
# Step 1: Populate cache with test data
bun run grid:populate 100

# Step 2: Generate index
bun run grid:index

# Step 3: Verify data
bun run grid:search "NBA" | head -10

# Step 4: Export data
bun run grid:export --format json

# Step 5: Start dashboard
bun run suite
```

## Verification Checklist

✅ **Cache Population**
```bash
bun run grid:populate 100
# Should show: "✅ Populated rotation cache with 100 games"
```

✅ **Index Generation**
```bash
bun run grid:index
# Should show: "Grid index generated {"entries":100}"
```

✅ **Index Search**
```bash
bun run grid:search "NBA"
# Should show matching entries with rotation numbers and heat strings
```

✅ **Data Export**
```bash
bun run grid:export --format json
# Should create grid-export.json with 100 entries
```

✅ **Dashboard Server**
```bash
bun run suite
# Should start servers on ports 3334 (dashboard) and 3003 (grid WS)
```

## Troubleshooting

**Cache is empty after populate:**
- Check that `generateMockGames` is working correctly
- Verify rotation cache import path

**Index file not found:**
- Run `bun run grid:index` first
- Check that cache has data: `bun run grid:populate 10`

**WebSocket connection fails:**
- Verify grid server is running on port 3003
- Check browser console for connection errors
- Ensure dashboard server started grid WebSocket server

**Grid shows no cells:**
- Verify cache has data: `bun run grid:populate 100`
- Check browser console for WebSocket messages
- Verify WebSocket URL in `rotation-grid.html`

## Performance

- **100 games**: ~5ms index generation, ~2KB JSON export
- **1,000 games**: ~50ms index generation, ~20KB JSON export  
- **10,000 games**: ~500ms index generation, ~200KB JSON export

## Next Steps

1. **Connect to Real Data**: Replace `grid:populate` with actual game processing
2. **Add More Views**: Create additional grid visualizations
3. **Implement Clustering**: Add AI-based heat island detection
4. **Add Alerts**: Auto-alert on heat anomalies

---

**Ready to view your empire in one glowing grid!** 🚀✨💎

