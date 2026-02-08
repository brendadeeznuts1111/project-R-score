# 🚀 Quick Setup - Instant Progressive Debugging

Get started with intelligent depth debugging in seconds! This quick setup provides a simplified version of the full progressive debugging system.

## ⚡ **One-Command Setup**

```bash
./quick-setup.sh
```

That's it! The setup script will:
- ✅ Create `scripts/debug-smart.ts` - Simplified progressive debug script
- ✅ Add `debug:smart` and `debug:quick` scripts to package.json
- ✅ Make everything executable and ready to use

## 🐛 **Usage Examples**

### **Basic Progressive Debugging**
```bash
bun run debug:smart bench.ts
bun run debug:quick test.ts
```

### **Debug Any Command**
```bash
bun run debug:smart "npm test"
bun run debug:smart "bun run build"
bun run debug:smart "node server.js"
```

### **Direct Script Usage**
```bash
bun run scripts/debug-smart.ts your-app.ts
```

## 🔍 **Features**

### **Progressive Depth Escalation**
- **Phase 1**: Quick Scan (depth=1, 2s timeout)
- **Phase 2**: Standard Debug (depth=3, 5s timeout)  
- **Phase 3**: Deep Analysis (depth=5, 10s timeout)

### **Intelligent Detection**
- ✅ **Truncation Detection** - Detects `[Object]`, `[Circular]`, `...`
- ✅ **Error Handling** - Graceful error recovery and reporting
- ✅ **Timeout Protection** - Prevents hanging on complex outputs
- ✅ **Performance Metrics** - Duration and output size tracking

### **Smart Escalation Logic**
- Continues to next phase if:
  - Process exits with error code
  - Output appears truncated
  - Process times out
- Stops when:
  - Process succeeds without truncation
  - All phases are exhausted

## 📊 **Sample Output**

```
🐛 Smart Progressive Debug
========================================

🔍 Phase: Quick Scan (depth=1)
   Duration: 161ms
   Output Size: 261 B
   Exit Code: 0
   ⚠️  Output appears truncated
   ⚠️  Issues detected, continuing to next phase...

🔍 Phase: Standard Debug (depth=3)
   Duration: 159ms
   Output Size: 1.2 KB
   Exit Code: 0
   ✅ Standard Debug completed successfully

🎯 Optimal depth found: 3

📊 Debug Session Summary:
========================================
❌ Quick Scan      depth=1 (161ms)
✅ Standard Debug  depth=3 (159ms)

🎉 Debugging completed successfully!
   Final depth: 3
   Total duration: 320ms
```

## 🎯 **Common Use Cases**

### **Development Debugging**
```bash
# Debug TypeScript files
bun run debug:smart src/app.ts

# Debug test files
bun run debug:smart test/integration.test.ts

# Debug build processes
bun run debug:smart "bun run build"
```

### **Production Issues**
```bash
# Minimal debugging for production
bun run debug:smart "npm start"

# Error investigation
bun run debug:smart "node --trace-warnings server.js"
```

### **Performance Analysis**
```bash
# Compare different approaches
bun run debug:smart "bun run fast-implementation"
bun run debug:smart "bun run slow-implementation"
```

## 🔧 **Configuration**

### **Custom Timeouts**
Edit `scripts/debug-smart.ts` to adjust timeouts:

```typescript
const phases = [
  { depth: 1, name: 'Quick Scan', timeout: 1000 },    // 1 second
  { depth: 3, name: 'Standard Debug', timeout: 3000 }, // 3 seconds
  { depth: 5, name: 'Deep Analysis', timeout: 5000 }   // 5 seconds
];
```

### **Custom Depths**
Adjust depth levels for your specific needs:

```typescript
const phases = [
  { depth: 1, name: 'Surface', timeout: 2000 },
  { depth: 4, name: 'Deep', timeout: 5000 },
  { depth: 8, name: 'Maximum', timeout: 10000 }
];
```

## 🚀 **Upgrade to Full System**

When you're ready for advanced features, upgrade to the full system:

```bash
# Full progressive debugging with streaming
bun run bin/progressive-debug.ts app.ts

# Advanced depth optimization
bun run bin/depth-optimizer.ts debug app.ts --progressive

# Project analysis
bun run analyze:logging

# Configuration optimization
bun run optimize:config
```

### **Full System Features**
- 🌊 **Streaming Support** - Handle large objects (>10MB)
- 🔄 **Circular Reference Analysis** - Deep circular detection
- 📊 **Project Analysis** - Analyze entire codebase
- ⚙️ **Environment Optimization** - Environment-specific configs
- 📈 **Performance Profiling** - Detailed performance analysis
- 💾 **Configuration Management** - Persistent settings

## 🛠️ **Troubleshooting**

### **Script Not Found**
```bash
# Make sure the setup script was run
./quick-setup.sh

# Check if script exists
ls -la scripts/debug-smart.ts
```

### **Permission Issues**
```bash
# Make scripts executable
chmod +x scripts/debug-smart.ts
chmod +x quick-setup.sh
```

### **Package.json Issues**
```bash
# Restore from backup if needed
cp package.json.backup package.json

# Re-run setup
./quick-setup.sh
```

## 📝 **Tips & Best Practices**

### **For Development**
- Use progressive debugging for complex object inspection
- Start with quick debugging for simple issues
- Monitor total duration to avoid long debug sessions

### **For Production**
- Consider using fixed depths for predictable output
- Use timeouts appropriate for your environment
- Focus on error detection over detailed output

### **For Testing**
- Use consistent depths across test runs
- Monitor performance impact on test execution
- Consider using the full system for comprehensive analysis

## 🎊 **Conclusion**

The Quick Setup provides **instant access to intelligent progressive debugging** with minimal configuration. It's perfect for:

- 🚀 **Quick start** - Get debugging in seconds
- 🐛 **Everyday use** - Simple and reliable debugging
- 📦 **Minimal setup** - No complex dependencies
- 🔧 **Easy upgrade** - Path to full advanced system

**Start debugging smarter today!** 🎯

---

**Need more power?** Check out the full Smart Debugging System with advanced features like streaming, circular analysis, and project optimization!
