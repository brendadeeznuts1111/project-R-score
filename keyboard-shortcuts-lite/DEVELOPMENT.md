# 🔗 Development Setup Guide

## Overview

This guide shows how to set up a local development environment for the `keyboard-shortcuts-lite` library using `bun link`. This enables rapid iteration and testing of changes without publishing to npm.

## 🚀 Quick Start

### Step 1: Clone and Link the Library

```bash
# Clone the repository
git clone https://github.com/brendadeeznuts1111/keyboard-shortcuts-lite.git
cd keyboard-shortcuts-lite

# Install dependencies
bun install

# Register the package for local linking
bun link
```

**Expected Output:**

```txt
bun link v1.3.3 (7416672e)
Success! Registered "keyboard-shortcuts-lite"

To use keyboard-shortcuts-lite in a project, run:
  bun link keyboard-shortcuts-lite

Or add it in dependencies in your package.json file:
  "keyboard-shortcuts-lite": "link:keyboard-shortcuts-lite"
```

### Step 2: Use in Your Project

```bash
# Navigate to your project
cd /path/to/your-project

# Link the local library
bun link keyboard-shortcuts-lite

# Or add to package.json with --save flag
bun link keyboard-shortcuts-lite --save
```

**Your package.json will be updated:**

```json
{
  "name": "your-project",
  "version": "1.0.0",
  "dependencies": {
    "keyboard-shortcuts-lite": "link:keyboard-shortcuts-lite"
  }
}
```

## 🛠️ Development Workflow

### **Make Changes to the Library**

```bash
# In the library directory
cd keyboard-shortcuts-lite

# Edit source files
vim src/manager.ts

# Build the library
bun run build

# Changes are instantly available in linked projects!
```

### **Test in Your Project**

```bash
# In your project directory
cd /path/to/your-project

# Import and use the updated library
import { shortcuts } from 'keyboard-shortcuts-lite';

# Test your changes
bun run dev
```

### **Unlink When Done**

```bash
# In the library directory
cd keyboard-shortcuts-lite

# Unregister the package
bun unlink

# Or in your project directory
cd /path/to/your-project
bun unlink keyboard-shortcuts-lite
```

## 📋 Advanced Usage

### **Multiple Projects**

```bash
# Link to multiple projects simultaneously
cd project-a
bun link keyboard-shortcuts-lite

cd ../project-b
bun link keyboard-shortcuts-lite

cd ../project-c
bun link keyboard-shortcuts-lite --save
```

### **Global Development**

```bash
# Install globally for system-wide testing
cd keyboard-shortcuts-lite
bun link --global

# Use in any project
bun link keyboard-shortcuts-lite
```

### **Development with TypeScript**

```bash
# In your project
cd your-project

# Link the library
bun link keyboard-shortcuts-lite

# TypeScript will automatically find types
# No additional configuration needed!
```

## 🧪 Testing Workflow

### **Run Tests While Developing**

```bash
# In the library directory
cd keyboard-shortcuts-lite

# Watch mode for continuous testing
bun test --watch

# Or run specific tests
bun test manager.test.ts
```

### **Integration Testing**

```bash
# In your project
cd your-project

# Create integration test
vim test/integration.test.ts

# Test with linked library
bun test
```

### **Demo Testing**

```bash
# In the library directory
cd keyboard-shortcuts-lite

# Open demo with live reload
open demo.html

# Or serve with local server
bun --hot demo.html
```

## 🔧 Configuration for Development

### **Development bunfig.toml**

```toml
[bunfig.toml]
[install]
# Development-friendly settings
dev = true
minimumReleaseAge = 0  # Allow fresh packages
verbose = true

[install.performance]
# Use symlinks for easier debugging
backend = "symlink"
networkConcurrency = 24

[install.cache]
# Disable cache for development
disableManifest = false
```

### **Development Scripts**

Add to your `package.json`:

```json
{
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "test:watch": "bun test --watch",
    "build:dev": "bun run build --watch",
    "link:local": "bun link && echo 'Library linked successfully!'",
    "unlink:local": "bun unlink && echo 'Library unlinked!'"
  }
}
```

## 🎯 Best Practices

### **1. Use Semantic Versioning**

```bash
# Update version before major changes
bun version patch  # 1.0.0 -> 1.0.1
bun version minor  # 1.0.1 -> 1.1.0
bun version major  # 1.1.0 -> 2.0.0
```

### **2. Test Before Publishing**

```bash
# Full test suite
bun test

# Build verification
bun run build

# Lint check
bun run lint  # if you have linting configured
```

### **3. Clean Development Environment**

```bash
# Clean node_modules
rm -rf node_modules

# Clean cache
bun pm cache rm

# Fresh install
bun install
```

### **4. Use Environment Variables**

```bash
# Development environment
export NODE_ENV=development

# Enable verbose logging
export BUN_DEBUG=1

# Custom cache directory
export BUN_INSTALL_CACHE_DIR="./dev-cache"
```

## 🚨 Troubleshooting

### **Common Issues**

#### **Link Not Working:**
```bash
# Check if package is registered
bun link

# Expected: Shows registered packages

# If not shown, re-register
cd keyboard-shortcuts-lite
bun link
```

#### **TypeScript Errors:**
```bash
# Clear TypeScript cache
rm -rf node_modules/.cache

# Rebuild types
bun run build

# Restart your IDE/TS server
```

#### **Changes Not Reflected:**
```bash
# Check if symlink is correct
ls -la node_modules/keyboard-shortcuts-lite

# Should point to your local directory

# Rebuild the library
cd keyboard-shortcuts-lite
bun run build
```

#### **Permission Issues:**
```bash
# Check permissions
ls -la ~/.bun/install/cache

# Fix if needed
sudo chown -R $USER:$(id -gn) ~/.bun
```

### **Debug Commands**

```bash
# Verbose linking
bun link --verbose

# Check package info
bun pm hash keyboard-shortcuts-lite

# Verify installation
bun install --dry-run
```

## 📊 Performance Benefits

### **Development Speed:**
- ⚡ **Instant updates**: No need to republish
- 🔄 **Hot reloading**: Changes appear immediately
- 🧪 **Fast testing**: Skip npm install delays
- 💾 **Local cache**: No network downloads

### **Workflow Efficiency:**
```bash
# Traditional workflow (slow)
npm publish
cd project
npm install
npm test  # 2-3 minutes

# bun link workflow (fast)
cd library
# Make changes
bun run build
cd project
bun test  # 10-15 seconds
```

## 🎉 Ready to Develop!

You now have a complete development setup for `keyboard-shortcuts-lite`:

- ✅ **Local linking** with `bun link`
- ✅ **Hot reloading** for rapid iteration
- ✅ **TypeScript support** with automatic types
- ✅ **Testing workflow** with watch mode
- ✅ **Integration testing** with real projects

**Start building amazing keyboard shortcuts!** 🚀
