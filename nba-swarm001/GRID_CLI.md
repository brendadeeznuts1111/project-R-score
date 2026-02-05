# Rotation Grid CLI Usage

## Quick Start

```bash
# Generate grid index
bun run grid:index

# Search grid index
bun run grid:search "NBA-20251103"

# Export grid data
bun run grid:export --format json
bun run grid:export --format csv
```

## Commands

### `bun run grid:index`
Generates the `.rotgrid.index` file from cached games in the rotation cache.

**Prerequisites:** Games must be loaded into the rotation cache (via `SwarmRadar.processGames()`).

**Output:** Creates `.rotgrid.index` file with tab-separated values:
```
game-id<TAB>rotation-number<TAB>heat-string<TAB>fingerprint
```

### `bun run grid:search <pattern>`
Searches the grid index for entries matching the pattern.

**Examples:**
```bash
bun run grid:search "NBA-20251103"     # Search by date
bun run grid:search "NBA"              # Search by league
bun run grid:search "█"                # Find high-heat games
```

**Output:** Displays matching entries with rotation number, heat string, and fingerprint.

### `bun run grid:export [--format <format>]`
Exports grid data to JSON or CSV format.

**Formats:**
- `json` (default) - JSON array of grid entries
- `csv` - CSV format with headers
- `png` - Not yet implemented

**Examples:**
```bash
bun run grid:export                    # JSON export (default)
bun run grid:export --format json      # Explicit JSON
bun run grid:export --format csv       # CSV export
```

**Output Files:**
- `grid-export.json` - JSON format
- `grid-export.csv` - CSV format

## Integration with Dashboard

The grid index is automatically updated when games are processed through `SwarmRadar`. To generate a fresh index:

1. Start the dashboard (populates cache):
   ```bash
   bun run suite
   ```

2. In another terminal, generate index:
   ```bash
   bun run grid:index
   ```

3. Search or export as needed:
   ```bash
   bun run grid:search "NBA"
   bun run grid:export --format json
   ```

## Troubleshooting

**"Grid index not found"**
- Run `bun run grid:index` first to generate the index
- Ensure games are loaded into the rotation cache

**"No matches found"**
- Check that the pattern matches your game IDs
- Verify the index file exists and contains data

**Empty cache**
- Games must be processed through `SwarmRadar.processGames()` to populate the cache
- Start the radar server to begin processing games

