# 🔍 **Bun Dependency Resolution Priority Guide**

## 📋 **Priority Order**

Bun resolves package versions with this priority hierarchy:

```
1️⃣ devDependencies     (highest priority)
2️⃣ optionalDependencies
3️⃣ dependencies
4️⃣ peerDependencies    (lowest priority)
```

## 🎯 **How It Works**

When the same package appears in multiple dependency groups, Bun installs the
version from the **highest priority** group.

### **Example Scenario:**

```json
{
  "dependencies": {
    "semver": "^7.3.0"
  },
  "devDependencies": {
    "semver": "^7.6.0"
  },
  "optionalDependencies": {
    "semver": "^7.4.0"
  },
  "peerDependencies": {
    "semver": "^7.5.0"
  }
}
```

**Result:** Bun installs `semver ^7.6.0` (from devDependencies)

## 💡 **Practical Examples for Fire22**

### **1. TypeScript Development**

```json
{
  "dependencies": {
    "typescript": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

**→ Installs:** `typescript ^5.3.0` (devDependencies wins) **Benefit:**
Development gets latest TypeScript features

### **2. React Version Management**

```json
{
  "dependencies": {
    "react": "18.2.0"
  },
  "devDependencies": {
    "react": "18.3.0"
  },
  "peerDependencies": {
    "react": "^18.0.0"
  }
}
```

**→ Installs:** `react 18.3.0` (devDependencies wins) **Benefit:** Development
tools get latest React features

### **3. Build Tools Priority**

```json
{
  "dependencies": {
    "webpack": "^5.80.0"
  },
  "devDependencies": {
    "webpack": "^5.89.0"
  },
  "optionalDependencies": {
    "webpack": "^5.85.0"
  }
}
```

**→ Installs:** `webpack ^5.89.0` (devDependencies wins) **Benefit:** Latest
build optimizations in development

## 🏗️ **Fire22 Project Integration**

### **Recommended Dependency Organization:**

#### **📦 dependencies (Runtime)**

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "drizzle-orm": "^0.29.0",
    "express": "^5.1.0",
    "uuid": "^9.0.0",
    "yaml": "^2.3.0"
  }
}
```

#### **🔧 devDependencies (Development Tools)**

```json
{
  "devDependencies": {
    "@types/bun": "^1.2.21",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "prettier": "^3.2.5",
    "webpack": "^5.89.0",
    "tailwindcss": "^3.4.0"
  }
}
```

#### **🔌 optionalDependencies (Platform-Specific)**

```json
{
  "optionalDependencies": {
    "fsevents": "^2.3.3"
  }
}
```

#### **🤝 peerDependencies (Extensions/Plugins)**

```json
{
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

## 🚀 **Usage Commands**

### **Check Current Dependencies**

```bash
# View all dependency groups
bun pm pkg get dependencies devDependencies optionalDependencies peerDependencies

# Analyze specific package
bun why axios

# Quick dependency overview
bun run deps:analyze
```

### **Add Dependencies with Priority in Mind**

```bash
# Runtime dependencies (lower priority)
bun pm pkg set dependencies.axios="^1.6.0"

# Development tools (highest priority)
bun pm pkg set devDependencies.typescript="^5.3.0"

# Platform-specific (medium priority)
bun pm pkg set optionalDependencies.fsevents="^2.3.3"

# Plugins/extensions (lowest priority)
bun pm pkg set peerDependencies.react="^18.0.0"
```

## 🎯 **Benefits for Enterprise Projects**

### **✅ Predictable Behavior**

- Same package versions across all environments
- No surprises from dependency resolution conflicts
- Consistent development and production builds

### **✅ Development-First Approach**

- Development tools always get priority
- Latest features available during development
- Better debugging and development experience

### **✅ Version Conflict Resolution**

- Automatic resolution of version conflicts
- No manual dependency management needed
- Follows industry-standard priority rules

### **✅ CI/CD Consistency**

- Same dependency resolution in CI/CD pipelines
- Predictable builds across different environments
- No "works on my machine" issues

## 📊 **Current Fire22 Project Status**

```
📦 Dependencies: 12 packages
🔧 DevDependencies: 13 packages
🔌 OptionalDependencies: 0 packages
🤝 PeerDependencies: 0 packages
```

### **Analysis:**

- **Strength:** Good balance between runtime and development dependencies
- **Opportunity:** Could benefit from optionalDependencies for platform-specific
  packages
- **Status:** Well-organized dependency management structure

## 🛠️ **Best Practices**

### **1. Development Tools in devDependencies**

```bash
bun pm pkg set devDependencies.typescript="^5.3.0"
bun pm pkg set devDependencies.prettier="^3.2.5"
bun pm pkg set devDependencies.webpack="^5.89.0"
```

### **2. Runtime Libraries in dependencies**

```bash
bun pm pkg set dependencies.axios="^1.6.0"
bun pm pkg set dependencies.drizzle-orm="^0.29.0"
bun pm pkg set dependencies.express="^5.1.0"
```

### **3. Platform-Specific in optionalDependencies**

```bash
bun pm pkg set optionalDependencies.fsevents="^2.3.3"
bun pm pkg set optionalDependencies["@azure/identity"]="^3.4.1"
```

### **4. Plugins/Extensions in peerDependencies**

```bash
bun pm pkg set peerDependencies.react="^18.0.0"
bun pm pkg set peerDependencies["@types/react"]="^18.2.0"
```

## 🔧 **Quick Commands**

```bash
# Run dependency resolution demo
bun run deps:priority-demo

# Analyze current dependencies
bun run deps:analyze

# Check package resolution
bun why <package-name>

# Add development dependency (highest priority)
bun pm pkg set devDependencies.<package>="<version>"

# Add runtime dependency (lower priority)
bun pm pkg set dependencies.<package>="<version>"
```

## 🎉 **Summary**

Bun's dependency resolution priority ensures:

- **Development tools** get the latest versions (highest priority)
- **Runtime dependencies** are stable and predictable
- **Optional dependencies** don't override development tools
- **Peer dependencies** have the lowest priority (as expected)
- **Enterprise projects** benefit from consistent, predictable behavior

This approach eliminates version conflicts and ensures your Fire22 project
builds consistently across all environments! 🚀
