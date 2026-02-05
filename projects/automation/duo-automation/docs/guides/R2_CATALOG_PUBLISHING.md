# Bun Catalogs + R2 Publishing - Complete Integration

## 🚀 **Publishing with Catalogs to R2 Bucket**

Based on the official Bun documentation, when you run `bun publish` or `bun pm pack`, Bun automatically replaces `catalog:` references with resolved version numbers. Here's how we integrate this with our Cloudflare R2 bucket:

### **🎯 The Publishing Process**

#### **Step 1: Catalog Resolution**
```json
// Before publishing (development)
{
  "dependencies": {
    "commander": "catalog:",      // 📚 Catalog reference
    "inquirer": "catalog:",
    "jest": "catalog:testing"     // 📚 Named catalog reference
  }
}

// After publishing (production)
{
  "dependencies": {
    "commander": "^14.0.2",      // ✨ Resolved version
    "inquirer": "^9.2.12",        // ✨ Resolved version
    "jest": "^29.7.0"             // ✨ Resolved version
  }
}
```

#### **Step 2: R2 Registry Configuration**
```toml
# bunfig.toml
[publish]
registry = "https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com"
token = "Basic Njk3NjVkZDczODc2NmJjYTM4YmU2M2U3ZDAxOTJjZjg6MWQ5MzI2ZmZiMGM1OWViZWNiNjEyZjQwMWE4N2Y3MTk0MjU3NDk4NDM3NWZiMjgzZmM0MzU5NjMwZDdkOTI5YQ=="
```

---

## 🛠️ **Complete R2 Publishing Workflow**

### **1. View Publishing Configuration**
```bash
bun run r2:info
```

**Output**:
```
📊 DuoPlus R2 Publishing Information:

🔧 Registry Configuration:
  Registry: https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com
  Auth: Configured in bunfig.toml

📦 Packages to Publish:
  - @duoplus/cli-core@1.2.4-beta.0
  - @duoplus/ui-components@1.2.4-beta.0
  - @duoplus/utils@1.2.4-beta.0
  - @duoplus/testing-utils@1.2.4-beta.0
  - @duoplus/build-tools@1.2.4-beta.0
  - @duoplus/registry-gateway@1.2.4-beta.0
  - @duoplus/security-vault@1.2.4-beta.0
  - @duoplus/telemetry-kernel@1.2.4-beta.0

📥 Installation Command:
  bun install --registry https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com
```

### **2. Verify Catalog Resolution**
```bash
bun run r2:verify
```

**Output**:
```
🔍 Verifying catalog resolution...
📋 @duoplus/cli-core:
  ✅ commander: catalog: (will be resolved to actual version)
  ✅ inquirer: catalog: (will be resolved to actual version)
  ✅ figlet: catalog: (will be resolved to actual version)
📋 @duoplus/testing-utils:
  ✅ jest: catalog:testing (will be resolved to actual version)
  ✅ @types/jest: catalog:testing (will be resolved to actual version)
```

### **3. Pack All Packages (Catalog Resolution)**
```bash
bun run r2:pack
```

**Process**:
- 📦 Creates `.tgz` files for all 8 packages
- 🔄 Resolves `catalog:` references to actual versions
- 📝 Generates production-ready package.json files
- ✅ Stores tarballs in individual package directories

### **4. Publish to R2 Bucket**
```bash
bun run r2:publish
```

**Complete Workflow**:
1. Packs all packages (catalog resolution)
2. Publishes each package to R2 registry
3. Cleans up temporary tarballs
4. Makes packages available for installation

---

## 📦 **What Happens During Publishing**

### **Before Publishing** (Development):
```json
// packages/cli/package.json
{
  "name": "@duoplus/cli-core",
  "dependencies": {
    "commander": "catalog:",
    "inquirer": "catalog:",
    "figlet": "catalog:"
  },
  "peerDependencies": {
    "@duoplus/utils": "workspace:*"
  }
}
```

### **After Publishing** (Production):
```json
// @duoplus/cli-core-1.2.4-beta.0.tgz/package.json
{
  "name": "@duoplus/cli-core",
  "dependencies": {
    "commander": "^14.0.2",      // ✨ Resolved from catalog
    "inquirer": "^9.2.12",        // ✨ Resolved from catalog
    "figlet": "^1.7.0"           // ✨ Resolved from catalog
  },
  "peerDependencies": {
    "@duoplus/utils": "^1.2.4-beta.0"  // ✨ Resolved from workspace
  }
}
```

---

## 🎯 **Installation from R2 Registry**

### **Install from Custom Registry**:
```bash
# Install all DuoPlus packages from R2
bun install --registry https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com

# Install specific package
bun add @duoplus/cli-core --registry https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com
```

### **Configure Permanent Registry**:
```bash
# Set custom registry for DuoPlus packages
bun config set @duoplus:registry https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com

# Now install without specifying registry
bun add @duoplus/cli-core
```

---

## 🚀 **Advanced Publishing Features**

### **1. Selective Publishing**:
```bash
# Publish only specific packages
cd packages/cli && bun publish --registry https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com

# Publish with custom tag
bun publish --tag beta --registry https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com
```

### **2. Dry Run Publishing**:
```bash
# Preview what would be published
bun pm pack --dry-run

# Check catalog resolution
bun run r2:verify
```

### **3. Version Management**:
```bash
# Update catalog versions
vim package.json  # Update catalog versions

# Republish with new versions
bun run r2:publish
```

---

## 🔒 **Security & Benefits**

### **Security Features**:
- 🔐 **Token-based authentication** with R2
- 🛡️ **Shasum verification** for package integrity
- 📋 **Version consistency** through catalogs
- 🔒 **Private registry** for internal packages

### **Publishing Benefits**:
- ⚡ **Automatic catalog resolution** - No manual version management
- 📦 **Standard .tgz format** - Compatible with any package manager
- 🚀 **Fast R2 uploads** - Global CDN distribution
- 🔄 **Workspace dependencies** - Proper inter-package linking

### **Development Workflow**:
```bash
# Development phase
bun run ws:link:all    # Local development with catalogs

# Publishing phase  
bun run r2:publish     # Publish to R2 with resolved versions

# Consumption phase
bun install --registry https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com
```

---

## 🎉 **Complete Ecosystem**

With this integration, you have:

1. ✅ **Local Development** - Catalogs for version consistency
2. ✅ **R2 Publishing** - Automatic catalog resolution
3. ✅ **Global Distribution** - Cloudflare CDN
4. ✅ **Private Registry** - Secure package hosting
5. ✅ **Standard Format** - Compatible with npm/yarn/bun

This is the **complete end-to-end solution** for monorepo package management with Bun catalogs and R2 distribution!
