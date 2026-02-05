# Project Organization Guide

## 📁 Directory Structure

This document outlines the organized structure of the Windsurf Project for better maintainability and scalability.

### **Root Level Files**

```text
├── .env                    # Environment variables (gitignored)
├── .gitignore             # Git ignore rules
├── LICENSE                # MIT License
├── README.md              # Main project documentation
├── bun.lock               # Bun lockfile
├── bunfig.toml            # Bun configuration
├── package.json           # Node.js dependencies and scripts
└── tsconfig.json          # TypeScript configuration
```

### **📂 Core Directories**

#### **`/scripts/`** - Operational Scripts

```text
scripts/
├── query/                 # Query and data analysis scripts
│   └── query-r2-pattern.ts # R2 storage query tool
├── apple-id/              # Apple ID creation scripts
├── cashapp/               # Cash App automation scripts
├── maintenance/           # System maintenance scripts
├── music/                 # Apple Music setup scripts
└── ...                    # Other operational scripts
```

#### **`/src/`** - Core Application Logic

```text
src/
├── apple-id/              # Apple ID management
├── cashapp/               # Cash App integration
├── common/                # Shared utilities
├── storage/               # R2 storage managers
└── ...                    # Core system components
```

#### **`/data/`** - Data Storage

```text
data/
├── batches/               # Batch processing files
│   ├── bulk-apple-batch.csv
│   └── bulk-apple-batch.json
├── performance/           # Performance metrics
│   └── performance-report.json
└── ...                    # Other data files
```

#### **`/config/`** - Configuration Files

```text
config/
├── credentials/           # Sensitive credentials
│   └── presigns.json
├── cloudflare-r2.js       # R2 storage config
├── config.json            # Main configuration
└── ...                    # Other config files
```

#### **`/docs/`** - Documentation

```text
docs/
├── planning/              # Project planning docs
│   └── implementation_plan.md
├── R2_SETUP.md           # R2 storage setup guide
├── QUICK_START.md        # Quick start guide
├── apple-id/             # Apple ID documentation
├── cashapp/              # Cash App documentation
└── ...                   # Other documentation
```

#### **`/logs/`** - Log Files

```text
logs/
└── dashboard.log          # Application logs
```

### **🔧 Supporting Directories**

#### **`/dashboards/`** - Web Dashboards**

- Storage monitoring interfaces
- Analytics dashboards
- Real-time data visualization

#### **`/bench/`** - Performance Testing**

- Benchmark scripts
- Performance measurement tools
- Load testing utilities

#### **`/workers/`** - Cloudflare Workers**

- API routing workers
- Analytics processors
- Status monitors

#### **`/tests/`** - Testing Suite**

- Unit tests
- Integration tests
- End-to-end tests

#### **`/utils/`** - Utility Functions**

- Helper functions
- Common utilities
- Shared tools

## 🚀 Usage Patterns

### **Running Query Scripts**

```bash
# R2 storage queries
bun scripts/query/query-r2-pattern.ts --filter success=true country=US

# Apple ID creation
bun scripts/apple-id/create-batch.js --count 10

# Cash App automation
bun scripts/cashapp/cashapp-signup.js
```

### **Accessing Configuration**

```bash
# Main configuration
cat config/config.json

# R2 credentials
cat config/credentials/presigns.json

# Environment variables
cat .env
```

### **Viewing Data**

```bash
# Batch data
ls data/batches/

# Performance reports
ls data/performance/

# Application logs
tail logs/dashboard.log
```

## 📋 Organization Benefits

### **✅ Improved Maintainability**

- Clear separation of concerns
- Logical grouping of related files
- Easy navigation and discovery

### **✅ Better Scalability**

- Modular structure supports growth
- Clear patterns for adding new features
- Consistent organization across modules

### **✅ Enhanced Security**

- Sensitive credentials isolated
- Clear access patterns
- Better gitignore coverage

### **✅ Developer Experience**

- Intuitive file locations
- Clear documentation structure
- Consistent naming conventions

## 🔄 Migration Notes

### **Moved Files**

- `query-r2-pattern.ts` → `scripts/query/`
- `bulk-apple-batch.*` → `data/batches/`
- `dashboard.log` → `logs/`
- `performance-report.json` → `data/performance/`
- `presigns.json` → `config/credentials/`
- `implementation_plan.md` → `docs/planning/`

### **Updated Scripts**

Update any script references to use new paths:

```bash
# Old
bun query-r2-pattern.ts

# New
bun scripts/query/query-r2-pattern.ts
```

## 📝 Adding New Components

When adding new components, follow these patterns:

### **New Scripts**

- Place in appropriate `/scripts/` subdirectory
- Use descriptive naming
- Include documentation

### **New Data Files**

- Place in `/data/` with appropriate subdirectory
- Use clear naming conventions
- Include README if complex

### **New Configuration**

- Place in `/config/` or `/config/credentials/`
- Use environment variables for sensitive data
- Document configuration options

### **New Documentation**

- Place in `/docs/` with appropriate subdirectory
- Link from main README.md
- Follow markdown standards

---

## 🎯 Next Steps

1. Update any script references to use new paths
2. Review and update documentation links
3. Consider adding more specific subdirectories as needed
4. Establish coding standards for the organized structure

This organization provides a solid foundation for project growth and maintainability.
