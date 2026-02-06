# Exports Directory

Generated exports and reports from the Nebula-Flow™ system.

## Structure

```text
exports/
├── data/              # Exported data files
│   ├── *.json        # JSON exports
│   ├── *.csv         # CSV exports
│   ├── *.html        # HTML dashboards
│   └── .gitkeep      # Directory marker
│
└── reports/           # Generated reports
    ├── *.json        # Report data
    ├── *.html        # Report visualizations
    └── .gitkeep      # Directory marker
```

## Contents

### Data Exports (`data/`)
- Dashboard snapshots
- Device inventory exports
- Transaction records
- Metrics summaries

### Reports (`reports/`)
- System health analysis
- Performance reports
- Compliance summaries
- Financial reconciliation

## Usage

```bash
# View available exports
ls -lh exports/data/
ls -lh exports/reports/

# Open HTML reports
open exports/reports/*.html

# Parse JSON exports
cat exports/data/*.json | jq '.'
```

## Notes

- All exports are generated files (ignored by git)
- Safe to delete and regenerate
- Use `bun run analyze-export` to process exports
- Use `bun run view-export` to view exports

