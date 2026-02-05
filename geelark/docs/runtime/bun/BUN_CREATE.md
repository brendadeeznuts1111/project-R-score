# `bun create` - Project Scaffolding

## Overview

`bun create` is Bun's fast project scaffolding tool, similar to `npm create` or `yarn create`.

## Syntax

```bash
# From GitHub
bun create <user>/<repo> <directory>

# Full GitHub URL
bun create github.com/<user>/<repo> <directory>

# From local template
bun create ./path/to/template <directory>

# From a branch
bun create <user>/<repo>#<branch> <directory>
```

## Examples

```bash
# Create a new React app
bun create react ./my-app

# Create a new Next.js app
bun create next-app ./my-blog

# Create a new project from GitHub
bun create github.com/buntdlearn/bun-app mydir

# Create from a specific branch
bun create user/repo#v1.0.0 mydir
```

## Geelark Upload System Template

You can now scaffold a new project with the Geelark upload system:

```bash
# Create new project with Geelark upload system
bun create geelark/nova my-new-app

# Or from the repository
bun create github.com/geelark/nova my-new-app
```

## Creating Your Own Template

To make your project template work with `bun create`:

### 1. Package.json Requirements

```json
{
  "name": "your-template",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "your-template": "./create-template.js"
  }
}
```

### 2. Create Template Script

**`create-template.js`:**
```javascript
#!/usr/bin/env bun
import { spawn } from "bun";

const projectPath = process.argv[2] || ".";

console.log(`Creating template in ${projectPath}...`);

// Copy template files
await Bun.write(`${projectPath}/package.json`, JSON.stringify({
  name: "my-app",
  version: "1.0.0",
  scripts: {
    dev: "bun run src/index.ts",
  }
}, null, 2));

// Create directory structure
Bun.spawn(["mkdir", "-p", `${projectPath}/src`]);

console.log("✅ Template created successfully!");
console.log(`\nNext steps:`);
console.log(`  1. cd ${projectPath}`);
console.log(`  2. bun install`);
console.log(`  3. bun run dev`);
```

### 3. Template Configuration

**`template.json` (optional):**
```json
{
  "placeholders": {
    "PROJECT_NAME": {
      "type": "string",
      "default": "my-app"
    },
    "AUTHOR_NAME": {
      "type": "string",
      "default": "Your Name"
    }
  }
}
```

## Geelark Upload Template

Let's create a template for the upload system:

### Template Structure

```
geelark-upload-template/
├── package.json
├── create-upload-app.js
├── template/
│   ├── src/
│   │   ├── server/
│   │   │   ├── UploadService.ts
│   │   │   └── ServerConstants.ts
│   │   └── index.ts
│   ├── env.d.ts
│   ├── meta.json
│   ├── bunfig.toml
│   └── .env.upload.template
└── README.md
```

### Usage

```bash
# Create new app with upload system
bun create geelark/upload-app my-new-app

# The template will include:
# - UploadService with S3/R2 support
# - Feature flag configuration
# - Environment setup
# - CLI argument parsing
# - WebSocket progress tracking
```

## Official Templates

Bun provides several official templates:

```bash
# Bun app template
bun create bun-app ./my-app

# React template
bun create react ./my-react-app

# Next.js template
bun create next-app ./my-next-app

# Hono (web framework)
bun create hono ./my-hono-app

# Elysia (web framework)
bun create elysia ./my-elysia-app
```

## Advanced Usage

### From a Subdirectory

```bash
# Create from a monorepo subdirectory
bun create user/monorepo#packages/template my-app
```

### With Custom Variables

```bash
# Pass variables to template
bun create user/repo my-app --name "My App" --author "John Doe"
```

### Non-Interactive Mode

```bash
# Skip all prompts (use defaults)
bun create react my-app --yes
```

### Force Overwrite

```bash
# Overwrite existing files in target directory
bun create react my-app --force

# Useful when updating an existing project
bun create user/repo my-existing-app --force
```

## Creating an Upload-Enabled App Template

Here's a complete example template:

**`package.json` (for the template):**
```json
{
  "name": "@geelark/create-upload-app",
  "version": "1.0.0",
  "description": "Create a new app with Geelark upload system",
  "type": "module",
  "bin": "./create-upload-app.js",
  "repository": {
    "type": "git",
    "url": "https://github.com/geelark/create-upload-app"
  },
  "files": [
    "create-upload-app.js",
    "template/"
  ],
  "keywords": [
    "bun",
    "template",
    "upload",
    "s3",
    "r2",
    "file-upload"
  ],
  "license": "MIT"
}
```

**`create-upload-app.js`:**
```javascript
#!/usr/bin/env bun
/**
 * Geelark Upload App Creator
 *
 * Usage: bun create @geelark/create-upload-app <directory>
 */

import * as fs from "fs";
import * as path from "path";

const TEMPLATE_DIR = new URL("./template", import.meta.url).pathname;
const TARGET_DIR = process.argv[2] || ".";

async function createApp() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   🚀 Geelark Upload System App Creator                          ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
  `);

  const targetPath = path.resolve(TARGET_DIR);

  // Check if directory exists
  if (fs.existsSync(targetPath)) {
    const files = fs.readdirSync(targetPath);
    if (files.length > 0) {
      console.error(`❌ Error: Directory ${targetPath} is not empty`);
      process.exit(1);
    }
  } else {
    fs.mkdirSync(targetPath, { recursive: true });
  }

  console.log(`📁 Creating app in: ${targetPath}`);

  // Copy template files
  const copyFile = (file) => {
    const src = path.join(TEMPLATE_DIR, file);
    const dest = path.join(targetPath, file);

    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    let content = fs.readFileSync(src, "utf-8");

    // Replace placeholders
    content = content
      .replace(/\{\{PROJECT_NAME\}\}/g, path.basename(targetPath))
      .replace(/\{\{AUTHOR\}\}/g, process.env.USER || "Your Name");

    fs.writeFileSync(dest, content);
    console.log(`  ✅ ${file}`);
  };

  // List of files to copy
  const files = [
    "package.json",
    "tsconfig.json",
    "src/index.ts",
    "src/server/UploadService.ts",
    "src/server/ServerConstants.ts",
    "env.d.ts",
    "meta.json",
    "bunfig.toml",
    ".env.upload.template",
    ".gitignore",
    "README.md",
  ];

  // Copy all files
  for (const file of files) {
    const srcPath = path.join(TEMPLATE_DIR, file);
    if (fs.existsSync(srcPath)) {
      copyFile(file);
    }
  }

  console.log(`
✅ App created successfully!

📦 Next steps:

  1. cd ${path.basename(targetPath)}
  2. bun install
  3. cp .env.upload.template .env.upload
  4. nano .env.upload  # Add your S3/R2 credentials
  5. bun run dev

📚 Documentation:
  - Upload System: https://github.com/geelark/upload-system
  - Bun Docs: https://bun.sh/docs

💡 Need help?
  - GitHub Issues: https://github.com/geelark/upload-system/issues
  - Discord: https://discord.gg/bun
`);
}

createApp().catch(console.error);
```

## Publishing Your Template

```bash
# 1. Build your template
bun build create-upload-app.js --outfile ./dist/create.js --target bun

# 2. Publish to npm
bun publish

# 3. Users can now use it
bun create @your-org/create-upload-app my-app
```

## Best Practices

### 1. Keep Templates Minimal
```bash
# ✅ Good - Essential files only
template/
├── package.json
├── tsconfig.json
├── src/
│   └── index.ts
└── README.md

# ❌ Bad - Unnecessary files
template/
├── node_modules/  # Don't include!
├── .git/          # Don't include!
├── dist/          # Don't include!
└── *.log          # Don't include!
```

### 2. Use Placeholders
```json
// package.json (template)
{
  "name": "{{PROJECT_NAME}}",
  "author": "{{AUTHOR}}",
  "version": "1.0.0"
}
```

### 3. Provide Clear Instructions
```markdown
# Quick Start

\`\`\`bash
# Install dependencies
bun install

# Configure environment
cp .env.upload.template .env.upload

# Start development server
bun run dev
\`\`\`
```

### 4. Include `.gitignore`
```
node_modules/
dist/
.env.upload
*.log
.DS_Store
```

## Troubleshooting

### Issue: "Command not found"
```bash
# Make sure the bin file is executable
chmod +x create-upload-app.js

# Or run with bun
bun run create-upload-app.js my-app
```

### Issue: "Template not found"
```bash
# Use full GitHub URL
bun create github.com/user/repo my-app

# Or specify branch
bun create user/repo#main my-app
```

### Issue: "Permission denied"
```bash
# Don't use sudo
# Instead, fix npm permissions or use a user-managed install
```

## Further Reading

- [Bun Create Documentation](https://bun.sh/docs/cli/create)
- [Creating Templates](https://bun.sh/docs/cli/create#creating-a-template)
- [Template Best Practices](https://bun.sh/docs/cli/create#best-practices)
