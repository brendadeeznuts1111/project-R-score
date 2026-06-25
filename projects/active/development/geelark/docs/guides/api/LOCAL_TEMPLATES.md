# Local Bun Templates - Complete Guide

## Overview

Bun's templater supports custom templates from your local file system, allowing you to create and manage your own project templates.

## Template Locations

### Global Templates (System-wide)
```text
$HOME/.bun-create/<name>/
```

### Project-Specific Templates
```text
<project root>/.bun-create/<name>/
```

### Custom Global Path (via environment variable)
```bash
export BUN_CREATE_DIR=/path/to/templates
# Templates will be in: $BUN_CREATE_DIR/<name>/
```

## Priority Order

```text
1. Project-specific (.bun-create/)
2. Global ($HOME/.bun-create/)
3. Custom path ($BUN_CREATE_DIR/)
4. Remote (GitHub, npm)
```

## Creating a Local Template

### Step 1: Create Template Directory

```bash
# Navigate to global templates directory
cd ~/.bun-create

# Create a new template
mkdir geelark-upload
cd geelark-upload
```

### Step 2: Add Template Files

```bash
# Minimum required files
touch package.json
touch README.md

# Optional: template configuration
touch template.json
```

### Step 3: Use Your Template

```bash
# From anywhere on your system
bun create geelark-upload my-new-app

# Or with force flag
bun create geelark-upload my-existing-app --force
```

## Geelark Upload Template

I've created a complete template at `~/.bun-create/geelark-upload/`:

### Template Structure

```text
~/.bun-create/geelark-upload/
├── package.json          # Template package.json with placeholders
├── README.md             # Template README with placeholders
├── template.json         # Template configuration
└── (optional source files)
```

### Usage

```bash
# Create new app from local template
bun create geelark-upload my-upload-app

# With force overwrite
bun create geelark-upload my-existing-app --force

# From current directory
bun create geelark-upload .
```

## Template Placeholders

### Supported Placeholders

| Placeholder | Description | Default |
|-------------|-------------|---------|
| `{{PROJECT_NAME}}` | Project name | `my-upload-app` |
| `{{PROJECT_SLUG}}` | URL-safe name | `my-upload-app` |
| `{{AUTHOR}}` | Author name | `$USER` or "Your Name" |
| `{{DESCRIPTION}}` | Project description | Auto-generated |
| `{{VERSION}}` | Version | `1.0.0` |

### Using Placeholders

**In package.json:**
```json
{
  "name": "{{PROJECT_NAME}}",
  "author": "{{AUTHOR}}",
  "description": "{{DESCRIPTION}}"
}
```

**In README.md:**
```markdown
# {{PROJECT_NAME}}

By {{AUTHOR}}

## Description
{{DESCRIPTION}}
```

**In source code:**
```typescript
const PROJECT_NAME = "{{PROJECT_NAME}}";
const AUTHOR = "{{AUTHOR}}";
```

## Advanced Template Configuration

### template.json Options

```json
{
  "name": "Template Display Name",
  "description": "Template description",
  "placeholders": {
    "CUSTOM_VAR": {
      "type": "string",
      "default": "default-value",
      "description": "Variable description"
    }
  },
  "files": [
    "package.json",
    "README.md",
    "src/**/*"
  ],
  "postcreate": "script-to-run-after-creation.sh"
}
```

### Post-Creation Scripts

**template.json:**
```json
{
  "postcreate": [
    "#!/bin/bash",
    "echo 'Installing dependencies...'",
    "bun install",
    "echo 'Running setup...'",
    "bun run setup"
  ]
}
```

**Or as a file:**
```bash
# postcreate.sh
#!/bin/bash
set -e
echo "🚀 Setting up {{PROJECT_NAME}}..."
bun install
echo "✅ Ready to start!"
echo "Run: bun run dev"
```

## Project-Specific Templates

### Creating Project Templates

```bash
# In your project root
mkdir .bun-create
cd .bun-create

# Create a template for microservices
mkdir microservice
cd microservice

# Add template files
cat > package.json << 'EOF'
{
  "name": "{{PROJECT_NAME}}",
  "version": "1.0.0",
  "scripts": {
    "dev": "bun run src/index.ts"
  }
}
EOF
```

### Using Project Template

```bash
# From within your project
cd /path/to/your-project

# Use project-specific template
bun create microservice service-a
```

## Custom Template Directory

### Setting Custom Path

```bash
# Set custom template directory
export BUN_CREATE_DIR=/opt/bun-templates

# Or in ~/.bashrc or ~/.zshrc
echo 'export BUN_CREATE_DIR=/opt/bun-templates' >> ~/.bashrc
source ~/.bashrc
```

### Using Custom Path

```bash
# Create templates in custom directory
mkdir -p $BUN_CREATE_DIR/my-template
cd $BUN_CREATE_DIR/my-template

# Add template files
# ...

# Use from anywhere
bun create my-template my-app
```

## Template Best Practices

### 1. Keep Templates Minimal
```text
✅ Include:
  - package.json
  - tsconfig.json
  - Source files (.ts, .tsx)
  - Configuration files
  - README.md

❌ Exclude:
  - node_modules/
  - dist/
  - .git/
  - *.log
  - .env files
```

### 2. Use Placeholders Generously
```json
// package.json
{
  "name": "{{PROJECT_NAME}}",
  "description": "{{PROJECT_NAME}} - {{DESCRIPTION}}",
  "author": "{{AUTHOR}} <{{AUTHOR_EMAIL}}>",
  "repository": "https://github.com/{{AUTHOR}}/{{PROJECT_SLUG}}"
}
```

### 3. Provide Good Documentation
```markdown
# {{PROJECT_NAME}}

{{DESCRIPTION}}

## Quick Start

\`\`\`bash
bun install
bun run dev
\`\`\`

## Features

- Feature 1
- Feature 2

## Configuration

See [docs/CONFIGURATION.md](docs/CONFIGURATION.md)
```

### 4. Use Post-Creation Scripts
```json
{
  "postcreate": [
    "#!/bin/bash",
    "# Install dependencies",
    "bun install",
    "",
    "# Setup environment",
    "cp .env.template .env",
    "",
    "# Show next steps",
    "cat << 'EOF'",
    "✅ App created!",
    "",
    "Next steps:",
    "  1. Edit .env with your credentials",
    "  2. bun run dev",
    "EOF"
  ]
}
```

## Template Examples

### Example 1: Minimal TypeScript App

**~/.bun-create/ts-app/package.json:**
```json
{
  "name": "{{PROJECT_NAME}}",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun run src/index.ts",
    "build": "bun build src/index.ts --outdir=./dist"
  },
  "devDependencies": {
    "@types/bun": "latest"
  }
}
```

**Usage:**
```bash
bun create ts-app my-app
```

### Example 2: Full-Stack App

**~/.bun-create/fullstack/template.json:**
```json
{
  "name": "Full-Stack App Template",
  "placeholders": {
    "DB_NAME": {
      "type": "string",
      "default": "{{PROJECT_SLUG}}_db"
    },
    "SERVER_PORT": {
      "type": "number",
      "default": 3000
    }
  }
}
```

**Usage:**
```bash
bun create fullstack my-app
# Will prompt for DB_NAME and SERVER_PORT
```

### Example 3: Microservice Template

**~/.bun-create/microservice/package.json:**
```json
{
  "name": "{{PROJECT_NAME}}",
  "version": "{{VERSION}}",
  "description": "{{PROJECT_NAME}} microservice",
  "scripts": {
    "dev": "bun --watch run src/index.ts",
    "start": "bun run src/index.ts",
    "test": "bun test"
  },
  "dependencies": {
    "hono": "^4.0.0"
  }
}
```

**Usage:**
```bash
bun create microservice user-service
bun create microservice order-service
bun create microservice payment-service
```

## Managing Templates

### List Available Templates

```bash
# List global templates
ls ~/.bun-create/

# List project-specific templates
ls .bun-create/

# List custom path templates
ls $BUN_CREATE_DIR/
```

### Update Template

```bash
# Navigate to template directory
cd ~/.bun-create/geelark-upload

# Edit template files
nano package.json
nano README.md

# Changes apply to next `bun create` call
```

### Delete Template

```bash
# Remove template directory
rm -rf ~/.bun-create/old-template

# Or project-specific
rm -rf .bun-create/old-template
```

### Export Template

```bash
# Share your template with others
cd ~/.bun-create/geelark-upload
tar -czf geelark-upload.tar.gz .

# Others can import it
mkdir ~/.bun-create/geelark-upload
cd ~/.bun-create/geelark-upload
tar -xzf /path/to/geelark-upload.tar.gz
```

## Troubleshooting

### Template Not Found

```bash
# Check template exists
ls ~/.bun-create/geelark-upload

# Check custom path
echo $BUN_CREATE_DIR

# List all templates
find ~/.bun-create -maxdepth 1 -type d
```

### Placeholders Not Replaced

```bash
# Ensure placeholder syntax is correct
# ✅ {{PROJECT_NAME}}
# ❌ {PROJECT_NAME}
# ❌ {{ PROJECT_NAME }}

# Check template.json has placeholder defined
cat ~/.bun-create/geelark-upload/template.json | grep PROJECT_NAME
```

### Permission Issues

```bash
# Fix template directory permissions
chmod -R 755 ~/.bun-create
```

## Summary

| Aspect | Global | Project-Specific | Custom Path |
|--------|--------|------------------|-------------|
| **Location** | `~/.bun-create/` | `.bun-create/` | `$BUN_CREATE_DIR/` |
| **Scope** | All projects | Current project only | Custom location |
| **Priority** | 2 | 1 | 3 |
| **Use Case** | Reusable templates | Project-specific | Custom organization |

---

**Ready to use:**
```bash
# Create new app with Geelark upload system
bun create geelark-upload my-new-app

# With force
bun create geelark-upload my-existing-app --force
```

**Documentation:**
- [Bun Create Docs](./BUN_CREATE.md)
- [Force Flag Guide](./BUN_CREATE_FORCE.md)
- [Environment Config](./ENV_CONFIGURATION.md)
