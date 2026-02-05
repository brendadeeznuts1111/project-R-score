# Project Organization Structure

This document outlines the organized structure of the Windsurf Project CLI and its components.

## 📁 Directory Organization

### **CLI Commands (`cli/`)**

```text
cli/
├── bin/
│   ├── windsurf-cli              # Original CLI
│   ├── windsurf-cli-enhanced     # Enhanced CLI with timeout handling
│   └── ep-cli                    # Empire Pro CLI
├── commands/
│   ├── analytics.ts              # Analytics commands
│   ├── dashboard.ts              # Original dashboard commands
│   ├── dashboard-enhanced.ts     # Enhanced dashboard with mock modes
│   ├── create.ts                 # Creation commands
│   ├── deploy.ts                 # Deployment commands
│   ├── query.ts                  # Query commands
│   ├── bench.ts                  # Benchmark commands
│   ├── secrets.ts                # Secrets management
│   ├── storage.ts                # Storage commands
│   ├── pty.ts                    # PTY commands
│   ├── phone-deploy.ts           # Phone deployment
│   ├── phone-emergency.ts        # Phone emergency procedures
│   └── hyper/                    # Hyper system commands
│       ├── hyper-status.ts       # Status monitoring
│       ├── hyper-matrix.ts       # Matrix browser
│       ├── hyper-stream.ts       # Stream commands
│       ├── hyper-metrics.ts      # Metrics collection
│       ├── hyperlink-formatter.ts # Link formatting
│       ├── hyper-showcase.ts     # Showcase features
│       └── hyper-dashboard.ts    # Dashboard rendering
└── dashboard.routes.ts           # Dashboard routing
```

### **Source Code (`src/`)**

```text
src/
├── cli/                          # CLI-specific source code
│   ├── commands/                 # Command implementations
│   ├── deep-app-cli.ts          # Deep app CLI
│   ├── empire-pro-cli-v4.ts     # Empire Pro CLI v4
│   ├── pattern-cli.ts           # Pattern CLI
│   ├── phone-intelligence-cli.ts # Phone intelligence CLI
│   └── workflow-cli.ts          # Workflow CLI
├── patterns/                     # Pattern implementations
├── integrations/                 # External integrations
├── core/                        # Core functionality
├── storage/                     # Storage implementations
├── utils/                       # Utility functions
├── types/                       # TypeScript definitions
│   └── schemas/                 # JSON schemas
├── filters/                     # Data filters
├── apple-id/                    # Apple ID functionality
├── audit/                       # Audit logging
├── autonomic/                   # Autonomic systems
├── address/                     # Address handling
├── rbac/                        # Role-based access control
└── validation/                  # Validation utilities
```

### **Configuration (`config/`)**

```text
config/
├── application/                 # Application configuration
├── build-artifacts/             # Build artifacts
├── deployment/                  # Deployment configuration
├── environment/                 # Environment variables
└── project/                     # Project-specific config
```

### **Demos (`demos/`)**

```text
demos/
├── cli/                         # CLI demonstrations
│   ├── complete-pipeline-demo.sh
│   ├── demo-pipeline.sh
│   ├── hyper-arsenal-demo.sh
│   ├── mock-results.json
│   ├── phones.txt
│   ├── stream-width-demo.ts
│   └── test-unicode-width.ts
├── analytics/                   # Analytics demos
├── grafana/                     # Grafana dashboards
├── main/                        # Main demos
└── credentials/                 # Credential demos
```

### **Testing (`tests/`)**

```text
tests/
├── core/                        # Core functionality tests
├── email/                       # Email tests
├── filter/                      # Filter tests
├── bench/                       # Benchmark tests
├── dashboard-integration.test.ts # Dashboard integration
└── test-deep-app-integration.test.ts # Deep app integration
```

## 🏗️ Organization Principles

### **1. Separation of Concerns**

- **CLI Commands**: Organized by functionality in `cli/commands/`
- **Source Code**: Core logic in `src/` with proper module separation
- **Configuration**: Environment-specific configs in `config/`
- **Demos**: Example scripts and showcases in `demos/`

### **2. Hyper System Organization**

All hyper-related functionality is grouped under `src/cli/commands/hyper/`:

- Status monitoring and metrics
- Matrix browsing and streaming
- Dashboard rendering and formatting
- Showcase and demonstration features

### **3. Test Organization**

- Integration tests for major components
- Unit tests for core functionality
- Benchmark tests for performance validation
- CLI-specific integration tests

### **4. Configuration Management**

- Environment-specific configurations
- Build and deployment configurations
- Application-level settings
- Project-specific overrides

## 📋 File Naming Conventions

### **CLI Commands**

- `kebab-case.ts` for command files
- Descriptive names indicating functionality
- Enhanced versions suffixed with `-enhanced`

### **Source Files**

- `kebab-case.ts` for implementations
- `camelCase.ts` for classes and utilities
- Descriptive names with clear purpose

### **Configuration**

- `kebab-case.js` for JavaScript configs
- `kebab-case.json` for JSON configs
- Environment-specific suffixes (`.production`, `.example`)

### **Demo Files**

- `kebab-case.sh` for shell scripts
- `kebab-case.ts` for TypeScript demos
- Descriptive names with demo/pipeline indicators

## 🔄 Migration Summary

### **Completed Moves**

- ✅ Demo scripts moved from `config/project/` to `demos/cli/`
- ✅ Hyper commands consolidated under `src/cli/commands/hyper/`
- ✅ Schema types moved to `src/types/schemas/`
- ✅ CLI demo files organized in `demos/cli/`

### **Structure Benefits**

- **Improved Discoverability**: Related files grouped together
- **Better Maintainability**: Clear separation of concerns
- **Enhanced Scalability**: Room for growth in each category
- **Consistent Naming**: Standardized conventions across project

This organization supports the enhanced CLI functionality while maintaining clean code structure and developer experience.
