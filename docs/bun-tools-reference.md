# 🛠️ Bun Development Tools Reference

A comprehensive toolkit for Bun development, validation, and system introspection.

## 📊 **Available Tools**

### **1. Basic URL Validation** (`validate:bun-urls`)
Validates Bun documentation URLs and constants against live endpoints.

```bash
bun run validate:bun-urls
```

**Features:**
- ✅ 25+ URL validations
- ✅ Colored terminal output
- ✅ Comprehensive status reporting
- ✅ Handles branch names vs commit hashes
- ✅ Validates your `BUN_CONSTANTS_VERSION.json`

### **2. Advanced GitHub Validation** (`validate:github`)
Sophisticated GitHub API checks and documentation deep-link generation.

```bash
bun run validate:github
```

**Features:**
- ✅ Latest commit hash from GitHub API
- ✅ Commit existence verification
- ✅ Raw file content snippets
- ✅ Documentation URL cross-references
- ✅ Text fragment deep-link generation

### **3. Quick System Info** (`quick-info`)
Fast Bun runtime information and basic project status.

```bash
bun run quick-info [filename]
```

**Features:**
- ✅ Bun version, revision, platform
- ✅ Update status (stable vs canary)
- ✅ Git file tracking status
- ✅ Quick action reminders

## 🚀 **One-Liner Commands Tested**

### **Bun Version & Updates:**
```bash
# Check if latest stable
bun -e 'console.log(Bun.revision.slice(0,8) === "b64edcb4" ? "latest stable" : "update available")'

# Version + revision + platform
bun -e 'console.log(`Bun ${Bun.version} (${Bun.revision.slice(0,8)}) | ${process.platform}-${process.arch}`)'

# Upgrade workflow
bun upgrade && bun --revision
```

### **Git Integration:**
```bash
# Check if file is tracked
git ls-files --error-unmatch <filename> && echo "tracked" || echo "untracked"

# Quick status
git status --porcelain | wc -l
```

### **File Content & Analysis:**
```bash
# Raw file snippet from GitHub
bun -e 'console.log((await (await fetch("https://raw.githubusercontent.com/oven-sh/bun/main/packages/bun-types/bun.d.ts")).text()).slice(0,100))'

# Count lines of code
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.mjs" | xargs wc -l | tail -1
```

### **Documentation Validation:**
```bash
# Check docs URL status
bun -e 'console.log((await fetch("https://bun.com/docs/api/utils").then(r=>r.status))===200?"docs live":"404")'

# Generate deep links
bun -e 'console.log("https://bun.com/reference#:~:text=node%3Azlib")'
```

## 📈 **Tool Comparison**

| Tool | Speed | Scope | Use Case |
|------|-------|-------|----------|
| `quick-info` | ⚡ Fast | Runtime info | Daily development checks |
| `validate:bun-urls` | 🐌 Medium | 25 URL checks | Comprehensive validation |
| `validate:github` | 🐌 Slow | GitHub API + docs | Advanced ecosystem monitoring |

## 🛠️ **Integration Examples**

### **CI/CD Pipeline:**
```bash
bun run quick-info && bun run validate:bun-urls
```

### **Pre-commit Hook:**
```bash
bun run validate:bun-urls && bun run validate:github
```

### **Development Workflow:**
```bash
bun run quick-info && bun upgrade && bun run validate:github
```

## 📋 **File Locations**

- `validate-bun-urls.ts` - Basic URL validation
- `bun-github-validation.ts` - Advanced GitHub checks
- `bun-quick-info.ts` - Fast system overview
- `bun-productivity-tips.md` - CLI productivity guide

## 🎯 **Quick Start**

1. **Get system info:** `bun run quick-info`
2. **Validate URLs:** `bun run validate:bun-urls`
3. **Advanced checks:** `bun run validate:github`

## 💡 **Pro Tips**

- Use `quick-info` for daily development status
- Run `validate:bun-urls` before commits
- Use `validate:github` for comprehensive health checks
- All tools support colored output for better readability

---

**🚀 Your Bun development toolkit is complete!** Choose the right tool for your workflow needs.