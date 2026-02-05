## Brief overview
This rule set establishes guidelines for configuring and managing the VSCode Project Manager configuration for the Nebula Flow fraud detection system. It defines standards for project structure, dual-tag system implementation, severity levels, validation processes, and Bun-native tooling.

## Configuration Architecture
- The primary configuration file is located at `projects.json` in VSCode's global storage: `~/Library/Application Support/Code/User/globalStorage/alefragnani.project-manager/projects.json`
- Each project entry represents a distinct component or subsystem of the Nebula Flow architecture
- Projects are grouped by functionality and assigned specific profiles and severity levels

## Dual-Tag System
### Readable Tags
- Format: `[NEBULA][CATEGORY][ENVIRONMENT][ID][VERSION][STATUS]`
- Examples:
  - `[NEBULA][CORE][PROD][NEB-CORE-001][v1.4][ACTIVE]`
  - `[NEBULA][AI][DEV][NEB-AI-002][v1.2][ACTIVE]`

### Grepable Tags
- Same information as readable tags but in lowercase without brackets for easy searching
- Format: `nebula-[category]-[environment]-[id]-[version]-[status]`
- Examples:
  - `nebula-core-prod-neb-core-001-v1.4-active`
  - `nebula-ai-dev-neb-ai-002-v1.2-active`

### Tag Generation Rules
1. **Category**: Extracted from profile name (core, ai, cli, sec, web, ops, test, doc, demo, fin)
2. **Environment**: Determined from profile type (production = PROD, development = DEV)
3. **ID**: Generated as NEB-<CATEGORY>-<3-digit-index>
4. **Version**: Extracted from profile or default to v1.0
5. **Status**: Always ACTIVE for configured projects

## Project Structure Requirements
### Required Fields
- `name`: Human-readable project name with emoji prefix (e.g., 🌌 Nebula-Flow™ Core (Primary))
- `readableTag`: GOV-style readable tag for documentation
- `grepTag`: Lowercase tag for fast searching
- `rootPath`: Absolute path to project root (must exist)
- `tags`: Array of descriptive tags for categorization
- `group`: Project group classification
- `profile`: Deployment profile identifier

### Optional Fields
- `paths`: Additional directories or files to include in the project
- `enabled`: Boolean flag indicating if project is active
- `ui`: UI configuration including severity and status colors
- `description`: Detailed project description
- `customConfig`: Custom configuration for specific project needs

## Severity Levels and Colors
### Severity Classification
- `critical-infrastructure`: Green (#2ecc71) - Core fraud detection system
- `high-compliance`: Yellow (#f1c40f) - GDPR/security compliance
- `financial-critical`: Yellow (#f1c40f) - Financial optimization
- `devops-critical`: Cyan (#1abc9c) - Build/deployment systems
- `frontend-production`: Gray (#95a5a6) - Web dashboard
- `tooling-development`: Purple (#9b59b6) - CLI tools
- `testing-quality`: Purple (#9b59b6) - Testing framework
- `research-experimental`: Blue (#3498db) - AI/ML research
- `demo-educational`: Purple (#9b59b6) - Demonstration projects
- `information-reference`: Gray (#95a5a6) - Documentation

### Color Validation
- All projects must have valid UI status colors
- Colors are defined in HSL and HEX formats for compatibility
- CSS variables are automatically generated for dashboard integration

## Validation Process
### Configuration Validation
1. Check all required fields are present
2. Validate tag format and structure
3. Verify root path exists
4. Validate severity level classification
5. Check for duplicate projects
6. Extract and validate URLPattern candidates

### Validation Command
```bash
bun run nebula-flow:validate
```

## Tags Index
- Generated automatically with `bun run nebula-flow:index`
- File location: `~/.nebula-tags.index`
- Optimized for fast grep-based searching
- Contains project metadata for quick lookups

## Bun-Native Configuration Manager
### Core Features
- **Fast Validation**: <20ms validation time on modern hardware
- **URLPattern Extraction**: Detects dynamic patterns in configuration
- **Tags Index Generation**: Creates optimized search index
- **URLPattern Observability**: Scans for pattern-like content
- **Pure Bun Primitives**: Uses Bun.file(), Bun.write(), Bun.spawn()

### Available Commands
```bash
# Validate configuration
bun run nebula-flow:validate

# Generate tags index
bun run nebula-flow:index

# Export to TOML (future support)
bun run nebula-flow:export-toml

# Interactive PTY mode (future support)
bun run nebula-flow:interactive --feature=INTERACTIVE
```

## Project Groups and Profiles
### Project Groups
- Production Systems: Core fraud detection and security
- AI/ML Systems: Machine learning and inference
- Development Tools: CLI and debugging tools
- Security Systems: Compliance and GDPR
- Frontend Systems: Web interface
- DevOps Systems: Build and deployment
- Quality Assurance: Testing framework
- Documentation: Guides and references
- Learning Resources: Examples and demonstrations
- Financial Systems: Yield optimization

### Valid Profiles
```typescript
const VALID_PROFILES = [
  'nebula-production',    // Production core system
  'ai-development',      // AI/ML research
  'cli-development',     // CLI tools development
  'compliance-production', // Security compliance
  'web-production',      // Web dashboard
  'deployment-production', // DevOps
  'testing-development', // Testing
  'documentation',       // Documentation
  'demo-showcase',       // Demonstrations
  'finance-production'   // Financial optimization
];
```

## Configuration Management Best Practices
### Adding New Projects
1. Use `bun run nebula-flow:generate --profile <profile> --name "<name>"` to create a stub
2. Verify all required fields are completed
3. Add appropriate tags and group classification
4. Validate with `bun run nebula-flow:validate`
5. Regenerate index with `bun run nebula-flow:index`

### Updating Projects
1. Modify `projects.json` file directly
2. Validate changes with `bun run nebula-flow:validate`
3. Regenerate tags index
4. Verify with `rg` searches on the new index

### Performance Optimization
- Keep `projects.json` file size reasonable (<100KB)
- Use short, descriptive tags
- Avoid duplicate or redundant entries
- Regenerate index after every change for optimal search performance

## URLPattern Observability
### Pattern Detection
- Dynamic patterns: `${VARIABLE}` format
- Static patterns: `https://*`, `/api/*` formats
- Detection command: `bun run nebula-flow:validate` shows all patterns

### Usage in Security
- Patterns are fed into tension-field / matrix pipeline
- Dynamic patterns indicate external dependencies
- Static patterns suggest API endpoints or services

## Future Enhancements
### TOML Migration
- Planned support for TOML format with dual-format bridge
- TOML offers better readability for complex configurations

### PTY Interactive Mode
- Full-screen terminal editor with real-time validation
- :validate, :optimize, :save, :quit commands
- ANSI color support for visual feedback

### Distributed Configuration
- Support for remote configuration storage
- Version control integration
- Change history tracking

## Compliance and Governance
### Audit Trail
- Every validation run creates a log entry
- Tags index includes creation and modification timestamps
- Git integration for complete version history

### Security
- Configuration file permissions set to read-only by default
- No sensitive data stored in configuration (use environment variables)
- Environment variable expansion with `${VARIABLE}` syntax

### GDPR Compliance
- Configuration includes compliance settings
- No PII stored in project definitions
- Role-based access control possible through VSCode settings

This comprehensive rule set ensures that the Nebula Flow configuration remains consistent, valid, and easily searchable. The dual-tag system provides both human-readable documentation and fast grep-based searching, while the Bun-native tools ensure optimal performance.
