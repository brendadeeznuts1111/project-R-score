# Directory Structure

This monorepo is organized with clear separation of concerns:

## 📁 Root Directory Structure

### Core Directories
- **projects/** - All project implementations organized by category
- **lib/** - Shared libraries and utilities used across projects
- **shared/** - Shared configuration and tools
- **tools/** - Standalone development tools
- **utils/** - Utility scripts
- **deployment/** - Deployment scripts and configurations
- **docs/** - Documentation organized by type
- **docs/archives/** - Historical reports (read-only)
- **docs/data/** - Diagnostic data and reports
- **scripts/** - Shell scripts and maintenance tasks

### Configuration Files
- **package.json** - Root package configuration
- **tsconfig.json** - TypeScript configuration
- **bun.lock** - Bun lock file
- **.gitignore** - Git ignore rules

### Project Categories (under projects/)
- **games/** - Game implementations
- **automation/** - Automation frameworks
- **analysis/** - Analysis and security tools
- **utilities/** - Utility projects
- **enterprise/** - Enterprise applications
- **apps/** - Application projects
- **dashboards/** - Dashboard interfaces
- **development/** - Development tools
- **experimental/** - Experimental projects
- **experiments/** - Testing experiments
- **tools/** - Development tools

## 🏗️ Architecture

```
${BUN_PLATFORM_HOME:-$HOME/Projects}/
├── projects/          # All projects (46+)
│   ├── games/        # Games (2048)
│   ├── automation/   # Automation frameworks
│   ├── analysis/     # Analysis tools
│   ├── utilities/    # Utility projects
│   ├── enterprise/   # Enterprise apps
│   ├── apps/         # Applications
│   ├── dashboards/   # Dashboards
│   ├── development/  # Dev tools
│   ├── experimental/ # Experimental
│   ├── experiments/  # Tests
│   └── tools/        # Tools
├── lib/              # Shared libraries (78 files)
├── shared/           # Shared configs/tools
├── tools/            # Dev tools (20+ files)
├── utils/            # Utility scripts (8 files)
├── deployment/       # Deployment scripts
├── docs/             # Documentation
├── docs/archives/    # Historical reports (read-only)
├── docs/data/        # Diagnostic data and reports
├── examples/         # Example files
├── scripts/          # Shell scripts and maintenance
├── tests/            # Test files
└── [config files]    # Root configurations
```

## 📚 Why This Structure?

1. **lib/** stays in root - Shared across all projects
2. **shared/** stays in root - Common configurations
3. **projects/** organized by purpose - Easy navigation
4. **tools/** and **utils/** in root - Global utilities
5. **scripts/** in root - Maintenance and manual test scripts
6. **docs/** organized - Better documentation management
7. **docs/archives/** - Historical reports only (no new reports)

This structure provides:
- ✅ Clear separation of concerns
- ✅ Easy project discovery
- ✅ Shared code reusability
- ✅ Scalable organization
