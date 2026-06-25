# 🔧 Analysis & Utility Tools

Tools for analyzing, processing, and viewing exported data and system metrics.

## Available Tools

### Dashboard Export Analyzer
**File**: `analyze-dashboard-export.ts`

Analyze exported dashboard data and generate reports.

```bash
bun run analyze-export
```

**Functions**:
- Parse exported JSON/CSV files
- Generate statistical summaries
- Create performance reports
- Identify trends and anomalies

### Enhanced Dashboard Schema
**File**: `enhanced-dashboard-schema.ts`

Process and enhance dashboard data schemas.

```bash
bun run enhanced-schema
```

**Features**:
- Schema validation
- Data transformation
- Format conversion
- Schema optimization

### System Health Analysis
**File**: `system-health-analysis.ts`

Analyze system health and generate diagnostics.

```bash
bun run health-analysis
```

**Analyzes**:
- Node health metrics
- Channel status
- Database integrity
- Performance indicators

### Export Viewer
**File**: `view-export.ts`

View exported data in browser with interactive UI.

```bash
bun run view-export
```

**Features**:
- Web-based viewer
- Interactive charts
- Data filtering
- Export functionality

## Usage Examples

### Analyze Dashboard Export
```bash
bun run analyze-export
# Generates: exports/reports/analysis.json
```

### View Export in Browser
```bash
bun run view-export
# Opens: http://localhost:3001
```

### Check System Health
```bash
bun run health-analysis
# Generates: exports/reports/health-report.json
```

### Process Schema
```bash
bun run enhanced-schema
# Generates: exports/data/enhanced-schema.json
```

## Output Files

Tools generate reports in:
- `exports/reports/` - Analysis reports
- `exports/data/` - Processed data
- `logs/` - Detailed logs

## Creating New Tools

### Template
```typescript
// tools/my-tool.ts
import { readFile, writeFile } from 'fs/promises';

async function main() {
  console.log('🔧 My Tool');
  
  // Tool logic here
  
  console.log('✅ Complete');
}

main().catch(console.error);
```

### Add to package.json
```json
{
  "scripts": {
    "my-tool": "bun run tools/my-tool.ts"
  }
}
```

## Data Processing

### Input Formats
- JSON files
- CSV exports
- JSONL logs
- Database dumps

### Output Formats
- JSON reports
- CSV exports
- HTML dashboards
- Text summaries

## Performance

- Efficient data processing
- Streaming for large files
- Minimal memory usage
- Fast analysis

## Integration

Tools integrate with:
- Dashboard exports
- System logs
- Database queries
- API responses

## Troubleshooting

### Tool Fails
```bash
# Check input files
ls -la exports/data/

# Run with verbose output
bun run analyze-export --verbose

# Check logs
tail -f logs/*.jsonl
```

### Missing Data
- Ensure exports exist
- Run dashboard first
- Check file permissions
- Verify data format

## Best Practices

1. **Regular Analysis** - Run tools periodically
2. **Archive Reports** - Keep historical data
3. **Monitor Trends** - Track metrics over time
4. **Validate Data** - Check data integrity
5. **Document Findings** - Record insights

## Advanced Usage

### Batch Processing
```bash
for file in exports/data/*.json; do
  bun run analyze-export "$file"
done
```

### Scheduled Analysis
```bash
# Add to crontab
0 * * * * cd /path/to/project && bun run analyze-export
```

### Custom Reports
Modify tools to generate custom reports for your needs.

---

**Version**: 3.5.0

