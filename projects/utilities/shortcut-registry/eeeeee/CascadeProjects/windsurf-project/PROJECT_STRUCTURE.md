# Project Structure Organization

This document outlines the organized structure of the windsurf project root directory.

## Root Directory Structure

```text
windsurf-project/
├── README.md                           # Main project documentation
├── LICENSE                             # Project license
├── package.json                        # Node.js package configuration
├── bun.lock                            # Bun lock file
├── .gitignore                          # Git ignore rules
├── .npmrc                              # NPM configuration
├── .env.example                        # Environment variables template
├── .env                                # Local environment variables
├── .env.development                    # Development environment
├── .env.production                     # Production environment
├── PROJECT_STRUCTURE.md                # This file
│
├── project-config/                     # Project configuration files
│   ├── .config-freeze.json           # Configuration freeze settings
│   ├── bun.config.ts                 # Bun configuration
│   ├── bunfig.toml                   # Bun configuration file
│   ├── tsconfig.json                 # TypeScript configuration
│   ├── global-rules.yaml             # Global project rules
│   └── hosts-config.txt              # Host configuration
│
├── components/                         # React/UI components
│   ├── approval-workflow.tsx         # Approval workflow component
│   ├── cloud-number-recovery.tsx     # Cloud number recovery component
│   ├── cross-family-network-dashboard.tsx # Network dashboard
│   ├── family-controls-component.tsx # Family controls component
│   ├── feature-gated-components.tsx  # Feature-gated components
│   ├── guardian-portal.tsx           # Guardian portal component
│   ├── guardian-risk-dashboard.tsx   # Risk dashboard component
│   └── MfaPanel.tsx                  # Real-time 2FA dashboard component
│
├── styles/                            # CSS stylesheets
│   ├── cash-app-priority-styles.css  # Cash App priority styles
│   ├── cross-family-network-styles.css # Network styles
│   ├── duoplus-integration-styles.css # DuoPlus integration styles
│   ├── family-controls-styles.css    # Family controls styles
│   └── suspension-risk-styles.css    # Risk dashboard styles
│
├── pages/                             # HTML pages
│   ├── citadel-dashboard.html        # Citadel dashboard page
│   └── landing.html                  # Landing page
│
├── databases/                         # Database files
│   ├── enterprise-dashboard.db       # Enterprise dashboard database
│   ├── identity_fortress.db          # Identity fortress database
│   ├── results.sqlite               # Results database
│   └── secure_vault.db              # Secure vault database
│
├── scripts/                           # Utility scripts and tools
│   ├── cli-dashboard                 # Enhanced CLI dashboard wrapper
│   ├── minimal-feature-api.ts        # Minimal feature API
│   ├── simple-test-api.ts            # Simple test API
│   ├── test-feature-status.ts        # Feature status test
│   ├── smol-comparison.sh            # Comparison script
│   └── test-depths.sh                # Depth testing script
│
├── data/                              # Data files
│   ├── exports/                     # Export files and data dumps
│   ├── fuzz-corpus.json            # Fuzz testing corpus
│   ├── patterns.ndjson              # Pattern data file
│   └── temp-dashboard-data.json     # Temporary dashboard data
│
├── workflows/                          # Workflow automation files
│   ├── citadel-dashboard-workflow.ts  # Citadel dashboard workflow
│   └── citadel-workflow.sh            # Citadel workflow script
│
├── docs/                              # Documentation directory
├── config/                            # Configuration directory
├── cli/                               # Command-line tools
├── ai/                                # AI/ML module
│   ├── fraud/                       # Fraud detection and privacy
├── src/                               # Source code
├── tests/                             # Test files
├── utilities/                         # Shared utility modules
└── [other project directories...]
```

## Directory Categories

### **Project Configuration (`project-config/`)**
Contains all project-level configuration files:
- Build system configurations (Bun, TypeScript)
- Global rules and settings
- Host and environment configurations

### **Components (`components/`)**
React and UI components:
- Dashboard components
- Family control interfaces
- Risk management components
- Feature-gated components

### **Styles (`styles/`)**
CSS stylesheets organized by feature:
- Payment system styles
- Network visualization styles
- Family control styles
- Risk dashboard styles

### **Pages (`pages/`)**
Static HTML pages:
- Dashboard pages
- Landing pages
- Administrative interfaces

### **Databases (`databases/`)**
Database files and data stores:
- SQLite databases
- Application data stores
- Secure vault storage
- Metrics and analytics databases (consolidated from data/)

### **Scripts (`scripts/`)**
Utility scripts and tools:
- API testing scripts
- Feature status utilities
- Comparison and testing scripts
- CLI dashboard wrapper
- Deployment scripts (consolidated from deployment/)

### **Data (`data/`)**
Static data files:
- Pattern data
- Configuration data
- Reference datasets
- Export files and data dumps (in exports/ subdirectory)
- Fuzz testing corpus and temporary data

### **Workflows (`workflows/`)**
Workflow automation and orchestration files:
- Citadel dashboard workflows
- Automated deployment scripts
- Process automation tools

### **Utilities (`utilities/`)**
Shared utility modules and helpers:
- OAuth authentication handlers
- Plaid integration verifiers
- Routing and validation engines
- Logging systems

## Benefits of This Organization

1. **Clear Separation**: Each type of file has its own dedicated directory
2. **Easy Navigation**: Related files are grouped together logically
3. **Maintainability**: Easy to find and update specific types of files
4. **Scalability**: New files can be easily organized into existing categories
5. **Documentation**: Clear structure makes the project easier to understand

## Usage Guidelines

- Add new components to the `components/` directory
- Place styles in the `styles/` directory with descriptive names
- Store database files in `databases/` directory
- Keep utility scripts in `scripts/` directory
- Place shared utility modules in `utilities/` directory
- Place workflow automation files in `workflows/` directory
- Use `project-config/` for build and project configuration
- Reference data files should go in `data/`
- Export files and data dumps go in `data/exports/`
- Reports and metrics files go in `reports/` directory

## Migration Notes

Files have been moved from the root directory to their appropriate subdirectories. Update any import paths or references accordingly:

- Component imports: `./components/...`
- Style imports: `./styles/...`
- Database paths: `./databases/...`
- Script execution: `./scripts/...`
- Utility modules: `./utilities/...`
- AI modules: `./ai/...` (including fraud detection in `./ai/fraud/...`)
- Configuration files: `./project-config/...`
