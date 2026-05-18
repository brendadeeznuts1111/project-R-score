# Updating Catalog Versions - DuoPlus Implementation

## 🎯 **How Version Updates Work**

Based on the official Bun documentation, updating catalog versions is incredibly simple:

### **Step 1: Update Root package.json**
```json
// Before
{
  "workspaces": {
    "catalog": {
      "commander": "^14.0.2",
      "elysia": "^1.4.21"
    },
    "catalogs": {
      "testing": {
        "jest": "^29.7.0"
      }
    }
  }
}

// After - Update versions in ONE place
{
  "workspaces": {
    "catalog": {
      "commander": "^15.0.0",  // Updated from ^14.0.2
      "elysia": "^1.5.0"       // Updated from ^1.4.21
    },
    "catalogs": {
      "testing": {
        "jest": "^30.0.0"      // Updated from ^29.7.0
      }
    }
  }
}
```

### **Step 2: Run bun install**
```bash
bun install
```

That's it! **All workspace packages automatically get the new versions.**

---

## 🚀 **DuoPlus Real-World Example**

### **Current Catalog Configuration**:
```json
{
  "workspaces": {
    "catalog": {
      "commander": "^14.0.2",
      "elysia": "^1.4.21",
      "figlet": "^1.7.0",
      "inquirer": "^9.2.12",
      "typescript": "^5.9.3"
    },
    "catalogs": {
      "testing": {
        "jest": "^29.7.0",
        "@types/jest": "^29.5.5"
      },
      "build": {
        "vite": "^5.0.0",
        "@vitejs/plugin-react": "^4.0.0"
      }
    }
  }
}
```

### **Workspace Packages Using Catalogs**:
```json
// packages/cli/package.json
{
  "dependencies": {
    "commander": "catalog:",      // Gets ^14.0.2
    "inquirer": "catalog:",       // Gets ^9.2.12
    "figlet": "catalog:"          // Gets ^1.7.0
  }
}

// packages/testing/package.json
{
  "devDependencies": {
    "jest": "catalog:testing",     // Gets ^29.7.0
    "@types/jest": "catalog:testing", // Gets ^29.5.5
    "typescript": "catalog:"       // Gets ^5.9.3
  }
}
```

---

## 🔄 **Update Scenario: Major Version Upgrade**

Let's say we want to upgrade to the latest versions:

### **Step 1: Update Catalog**:
```json
{
  "workspaces": {
    "catalog": {
      "commander": "^15.1.0",     // ✨ NEW VERSION
      "elysia": "^1.6.0",         // ✨ NEW VERSION
      "figlet": "^1.8.0",         // ✨ NEW VERSION
      "inquirer": "^10.0.0",      // ✨ NEW VERSION
      "typescript": "^5.8.2"      // ✨ NEW VERSION
    },
    "catalogs": {
      "testing": {
        "jest": "^30.2.0",        // ✨ NEW VERSION
        "@types/jest": "^30.0.0"   // ✨ NEW VERSION
      },
      "build": {
        "vite": "^6.0.0",         // ✨ NEW VERSION
        "@vitejs/plugin-react": "^4.2.0" // ✨ NEW VERSION
      }
    }
  }
}
```

### **Step 2: Apply Updates**:
```bash
bun install
```

### **Result: All Packages Updated Automatically**:
- ✅ `packages/cli` now uses commander ^15.1.0, inquirer ^10.0.0
- ✅ `packages/testing` now uses jest ^30.2.0, typescript ^5.8.2
- ✅ `packages/build` now uses vite ^6.0.0
- ✅ **Zero changes needed** in individual package.json files!

---

## 🎯 **Practical Update Commands**

### **Quick Update Script**:
```bash
#!/bin/bash
# update-catalog.sh - Easy catalog updates

echo "🔄 Updating DuoPlus catalog versions..."

# Update main catalog dependencies
npm update commander elysia figlet inquirer typescript

# Update testing catalog
npm update jest @types/jest

# Update build catalog  
npm update vite @vitejs/plugin-react

# Apply to all workspaces
bun install

echo "✅ All workspace packages updated!"
```

### **Manual Update Process**:
```bash
# 1. Edit package.json catalog versions
vim package.json

# 2. Apply updates
bun install

# 3. Verify updates
bun run pm:ls
```

### **Check What Uses a Catalog Item**:
```bash
# Find all packages using commander from catalog
grep -r "commander.*catalog:" packages/

# Find all packages using testing catalog
grep -r "catalog:testing" packages/
```

---

## 📊 **Benefits in Action**

### **Before Catalogs** (Old Way):
```bash
# Had to update each package individually
cd packages/cli && npm update commander
cd packages/components && npm update commander  
cd packages/utils && npm update commander
cd packages/testing && npm update commander
# ... 20+ packages later
```

### **After Catalogs** (New Way):
```bash
# Update in ONE place
vim package.json  # Change commander version once

# Apply everywhere
bun install

# ✅ Done! All 20+ packages updated
```

---

## 🚨 **Update Best Practices**

### **1. Test Updates**:
```bash
# Dry run first
bun install --dry-run

# Check for breaking changes
bun run ws:test
```

### **2. Incremental Updates**:
```bash
# Update one catalog at a time
# 1. Update main catalog
bun install && bun test

# 2. Update testing catalog  
bun install && bun test

# 3. Update build catalog
bun install && bun test
```

### **3. Lockfile Management**:
```bash
# Commit lockfile after updates
git add bun.lock package.json
git commit -m "feat: update catalog versions"
```

---

## 🎉 **The Magic Result**

With catalogs, updating dependencies across your entire monorepo is as simple as:

1. **Edit one file** (`package.json`)
2. **Run one command** (`bun install`)
3. **All packages updated** automatically

This is the power of Bun's catalog system - **maximum consistency with minimum effort**!
