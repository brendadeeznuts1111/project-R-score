# 🔧 Fire22 Dashboard Editor Integration

## 🚀 **Overview**

The Fire22 Dashboard now includes comprehensive editor integration using Bun's
native `Bun.openInEditor()` functionality. This system provides seamless access
to all project files and directories directly from the command line, with
support for line and column positioning.

## ✨ **Features**

- **Smart File Opening**: Open any file in your default editor
- **Line & Column Support**: Jump to specific positions in files
- **Directory Navigation**: Open entire project directories
- **Configuration Management**: Quick access to all config files
- **Project Structure**: Visual overview of project organization
- **Editor Detection**: Automatic editor detection and fallback
- **Bunfig Integration**: Editor preferences in bunfig.toml

## 🛠️ **Installation & Setup**

### **1. Automatic Setup**

The editor integration is automatically available with your Fire22 Dashboard
installation. No additional setup required.

### **2. Editor Configuration**

Set your preferred editor in `bunfig.toml`:

```toml
[debug]
editor = "code"  # VSCode
# editor = "subl"  # Sublime Text
# editor = "vim"   # Vim
# editor = "nano"  # Nano
```

### **3. Environment Variables**

Set your default editor via environment variables:

```bash
export VISUAL="code"      # Primary editor
export EDITOR="code"      # Fallback editor
```

## 📋 **Available Commands**

### **Core Commands**

| Command                    | Description                    | Example                    |
| -------------------------- | ------------------------------ | -------------------------- |
| `bun run editor:open`      | Open current working directory | `bun run editor:open`      |
| `bun run editor:config`    | Open all configuration files   | `bun run editor:config`    |
| `bun run editor:src`       | Open source code directory     | `bun run editor:src`       |
| `bun run editor:docs`      | Open documentation directory   | `bun run editor:docs`      |
| `bun run editor:scripts`   | Open scripts directory         | `bun run editor:scripts`   |
| `bun run editor:help`      | Show help and usage            | `bun run editor:help`      |
| `bun run editor:structure` | Show project structure         | `bun run editor:structure` |

### **File-Specific Commands**

| Command                                      | Description        | Example                                  |
| -------------------------------------------- | ------------------ | ---------------------------------------- |
| `bun run editor:open <file>`                 | Open specific file | `bun run editor:open src/index.ts`       |
| `bun run editor:open <file>:<line>`          | Open file at line  | `bun run editor:open src/index.ts:100`   |
| `bun run editor:open <file>:<line>,<column>` | Open at position   | `bun run editor:open src/index.ts:100:5` |

## 🔍 **Usage Examples**

### **Basic File Operations**

```bash
# Open main source file
bun run editor:open src/index.ts

# Open documentation
bun run editor:open docs/packages.html

# Open configuration
bun run editor:open package.json
bun run editor:open bunfig.toml
```

### **Line and Column Positioning**

```bash
# Open at specific line
bun run editor:open src/index.ts:100

# Open at specific line and column
bun run editor:open src/index.ts:100:5

# Alternative syntax
bun run editor:open "src/index.ts:100,5"
```

### **Directory Operations**

```bash
# Open source directory
bun run editor:src

# Open documentation directory
bun run editor:docs

# Open scripts directory
bun run editor:scripts

# Open project root
bun run editor:open
```

### **Configuration Management**

```bash
# Open all configuration files
bun run editor:config

# This opens:
# - package.json
# - bunfig.toml
# - tsconfig.json
# - wrangler.toml
# - .env
# - .env.example
```

## 🏗️ **Project Structure**

The editor integration provides a comprehensive view of your project structure:

```
📁 Directories:
  Root:     /Users/nolarose/ff/dashboard-worker
  Source:   /Users/nolarose/ff/dashboard-worker/src
  Docs:     /Users/nolarose/ff/dashboard-worker/docs
  Scripts:  /Users/nolarose/ff/dashboard-worker/scripts
  Config:   /Users/nolarose/ff/dashboard-worker/config
  Tests:    /Users/nolarose/ff/dashboard-worker/tests
  Build:    /Users/nolarose/ff/dashboard-worker/build

📄 Key Source Files:
  Index:    /Users/nolarose/ff/dashboard-worker/src/index.ts
  Types:    /Users/nolarose/ff/dashboard-worker/src/types.ts
  Dashboard: /Users/nolarose/ff/dashboard-worker/src/dashboard.html
  Telegram: /Users/nolarose/ff/dashboard-worker/src/telegram-bot.ts
  Queue:    /Users/nolarose/ff/dashboard-worker/src/queue-system.ts
  Business: /Users/nolarose/ff/dashboard-worker/src/business-management.ts
  Live Casino: /Users/nolarose/ff/dashboard-worker/src/live-casino-management.ts
  Sports:   /Users/nolarose/ff/dashboard-worker/src/sports-betting-management.ts

📚 Documentation Files:
  Packages: /Users/nolarose/ff/dashboard-worker/docs/packages.html
  API Integration: /Users/nolarose/ff/dashboard-worker/docs/api-integrations-index.html
  Fire22 API: /Users/nolarose/ff/dashboard-worker/docs/fire22-api-integration.html
  Dashboard Config: /Users/nolarose/ff/dashboard-worker/docs/fire22-dashboard-config.html
  Telegram Bot: /Users/nolarose/ff/dashboard-worker/docs/telegram-bot-integration.html
  Environment: /Users/nolarose/ff/dashboard-worker/docs/environment-variables.html
  API Packages: /Users/nolarose/ff/dashboard-worker/docs/api-packages.html

🔧 Script Files:
  Version Manager: /Users/nolarose/ff/dashboard-worker/scripts/version-manager.ts
  Version Integration: /Users/nolarose/ff/dashboard-worker/scripts/version-integration.ts
  Telegram Integration: /Users/nolarose/ff/dashboard-worker/scripts/telegram-integration.ts
  Business Demo: /Users/nolarose/ff/dashboard-worker/scripts/business-management-demo.ts
  Live Casino Demo: /Users/nolarose/ff/dashboard-worker/scripts/live-casino-demo.ts
  Sports Demo: /Users/nolarose/ff/dashboard-worker/scripts/sports-betting-demo.ts
  Payment Demo: /Users/nolarose/ff/dashboard-worker/scripts/payment-reference-demo.ts
  Diagram Tooling: /Users/nolarose/ff/dashboard-worker/scripts/diagram-tooling.ts
  Version Diagram: /Users/nolarose/ff/dashboard-worker/scripts/version-diagram-generator.ts
```

## ⚙️ **Configuration Options**

### **bunfig.toml Settings**

```toml
[debug]
# Primary editor setting
editor = "code"

[editor]
# Editor-specific settings
default = "code"
show_line_numbers = true
syntax_highlighting = true
auto_completion = true
error_highlighting = true

[commands]
# Quick access commands
open = "bun run editor:open"
src = "bun run editor:src"
docs = "bun run editor:docs"
scripts = "bun run editor:scripts"
config = "bun run editor:config"
structure = "bun run editor:structure"
help = "bun run editor:help"

[quick_access]
# Common file shortcuts
package_json = "package.json"
bunfig_toml = "bunfig.toml"
tsconfig_json = "tsconfig.json"
src_index = "src/index.ts"
docs_packages = "docs/packages.html"
scripts_version = "scripts/version-manager.ts"
```

### **Environment Variables**

```bash
# Set your preferred editor
export VISUAL="code"      # Primary editor
export EDITOR="code"      # Fallback editor

# Editor-specific settings
export VSCODE_EXTENSIONS_DIR="$HOME/.vscode/extensions"
export SUBLIME_CONFIG_DIR="$HOME/Library/Application Support/Sublime Text 3"
```

## 🔧 **Advanced Usage**

### **Custom Editor Integration**

You can extend the editor integration with custom commands:

```bash
# Add to package.json scripts
"editor:custom": "bun run scripts/editor-integration.ts custom",
"editor:debug": "bun run scripts/editor-integration.ts debug",
"editor:test": "bun run scripts/editor-integration.ts test"
```

### **Batch Operations**

```bash
# Open multiple related files
bun run editor:open src/index.ts src/types.ts src/dashboard.html

# Open all TypeScript files in src
find src -name "*.ts" -exec bun run editor:open {} \;
```

### **Integration with Other Tools**

```bash
# Combine with git operations
git diff --name-only | xargs -I {} bun run editor:open {}

# Combine with search results
grep -l "error" src/**/*.ts | xargs -I {} bun run editor:open {}
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. Editor Not Found**

```bash
❌ Failed to open file: Editor not found

# Solution: Set editor in bunfig.toml
[debug]
editor = "code"  # or "subl", "vim", "nano"
```

#### **2. Permission Denied**

```bash
❌ Failed to open file: Permission denied

# Solution: Check file permissions
chmod 644 src/index.ts
```

#### **3. Editor Already Running**

```bash
❌ Failed to open file: Editor already running

# Solution: Use existing editor instance
# Most editors handle this automatically
```

### **Debug Mode**

Enable debug mode for troubleshooting:

```bash
# Set debug environment variable
export DEBUG_EDITOR=true

# Run with verbose output
bun run editor:open src/index.ts --debug
```

### **Fallback Options**

The system includes automatic fallback:

1. **Primary Editor**: From bunfig.toml
2. **Environment Variable**: $VISUAL or $EDITOR
3. **System Default**: OS default application
4. **Manual Override**: Command line parameter

## 📚 **Integration with Development Workflow**

### **Development Commands**

```bash
# Quick development workflow
bun run editor:src          # Open source code
bun run test:quick          # Run tests
bun run editor:docs         # Open documentation
bun run build:quick         # Build project
```

### **Testing Integration**

```bash
# Open test files
bun run editor:open test/index.test.ts
bun run editor:open test/integration.test.ts

# Run tests and open results
bun test && bun run editor:open test-results.html
```

### **Documentation Workflow**

```bash
# Open documentation for editing
bun run editor:docs

# Open specific documentation
bun run editor:open docs/packages.html
bun run editor:open docs/api-integrations-index.html
```

## 🔗 **Related Commands**

### **Version Management**

```bash
bun run version:status      # Check version
bun run version:patch       # Bump patch version
bun run version:minor       # Bump minor version
bun run version:major       # Bump major version
```

### **Build System**

```bash
bun run build:quick         # Quick build
bun run build:standard      # Standard build
bun run build:production    # Production build
bun run build:packages      # Package build
```

### **Testing & Health**

```bash
bun run test:quick          # Quick tests
bun run test:checklist      # Full test suite
bun run health:comprehensive # Health check
bun run env:validate        # Environment validation
```

## 🎯 **Best Practices**

### **1. Use Descriptive Commands**

```bash
# Good
bun run editor:src
bun run editor:config

# Avoid
bun run editor:open src
bun run editor:open config
```

### **2. Leverage Line Positioning**

```bash
# Jump to specific errors
bun run editor:open src/index.ts:150:10

# Open at function definitions
bun run editor:open src/types.ts:25
```

### **3. Combine with Other Tools**

```bash
# Open files with errors
grep -n "error" src/**/*.ts | cut -d: -f1,2 | xargs -I {} bun run editor:open {}

# Open modified files
git diff --name-only | xargs -I {} bun run editor:open {}
```

### **4. Use Project Structure**

```bash
# Get overview first
bun run editor:structure

# Then navigate efficiently
bun run editor:src
bun run editor:docs
```

## 🚀 **Future Enhancements**

### **Planned Features**

- **Smart File Search**: Fuzzy search for file names
- **Recent Files**: Quick access to recently opened files
- **Project Templates**: Pre-configured editor settings
- **Collaboration**: Shared editor preferences for teams
- **Integration**: IDE and editor plugin support

### **Community Contributions**

We welcome contributions to enhance the editor integration:

- **New Editor Support**: Add support for additional editors
- **Enhanced Navigation**: Improve file discovery and navigation
- **Custom Commands**: Add project-specific editor commands
- **Performance**: Optimize file opening and navigation

## 📞 **Support & Feedback**

### **Getting Help**

```bash
# Show help
bun run editor:help

# Show project structure
bun run editor:structure

# Check configuration
bun run editor:config
```

### **Reporting Issues**

If you encounter issues with the editor integration:

1. **Check Configuration**: Verify bunfig.toml settings
2. **Environment Variables**: Confirm $VISUAL/$EDITOR settings
3. **Editor Installation**: Ensure editor is properly installed
4. **File Permissions**: Check file and directory permissions
5. **Debug Mode**: Enable debug output for troubleshooting

### **Feature Requests**

To request new features or improvements:

1. **Use Case**: Describe your specific use case
2. **Workflow**: Explain how it fits into your workflow
3. **Examples**: Provide concrete examples
4. **Priority**: Indicate importance level

## 🎉 **Conclusion**

The Fire22 Dashboard Editor Integration provides a powerful, seamless way to
navigate and edit your project files. With support for multiple editors, line
positioning, and comprehensive project navigation, it enhances your development
workflow and productivity.

**Key Benefits:**

- ⚡ **Fast Navigation**: Quick access to any file or directory
- 🎯 **Precise Positioning**: Jump to exact line and column positions
- 🔧 **Smart Integration**: Works with your preferred editor
- 📁 **Project Overview**: Complete project structure visibility
- 🚀 **Workflow Enhancement**: Seamless integration with development tools

**Get Started:**

```bash
# Show available commands
bun run editor:help

# Explore project structure
bun run editor:structure

# Open source code
bun run editor:src

# Open configuration
bun run editor:config
```

---

_Built with ❤️ for the Fire22 Development Team_ _Editor Integration v1.0.0 | Bun
Runtime v1.2.21_
