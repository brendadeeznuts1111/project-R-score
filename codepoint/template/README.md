# 🖥️ Systems Dashboard Template

Professional systems monitoring dashboard template for Bun with React, TypeScript, and CLI tools.

## 🚀 Quick Installation

### One-Command Setup

```bash
# Install template locally
curl -fsSL https://raw.githubusercontent.com/brendadeeznuts1111/bun-table-demo/main/template/setup-template.sh | bash

# Create new project
bun create @systems-dashboard/template my-monitoring-dashboard

# Start development
cd my-monitoring-dashboard
systems-dashboard dev --open
```

### Manual Setup

```bash
# Clone repository
git clone https://github.com/brendadeeznuts1111/bun-table-demo.git
cd bun-table-demo

# Install template
./template/setup-template.sh

# Create project
bun create @systems-dashboard/template my-project
```

## 📋 Template Features

### **🎯 Dashboard Types**

- **Full** - Complete monitoring solution with React UI
- **Server** - Server monitoring focus with backend metrics
- **CLI** - Command-line interface only, no UI
- **Analytics** - Data visualization and analytics focus

### **🛠️ Professional CLI Tools**

- Rich command-line interface with help system
- Progress indicators and colored terminal output
- Multiple commands: dev, build, preview, type-check, lint, format
- Auto-browser opening and network access options

### **⚡ Development Experience**

- **React 18** with TypeScript for type safety
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for utility-first styling
- **Hot Module Replacement** for instant updates
- **ESLint** and **Prettier** for code quality

### **📊 Monitoring Capabilities**

- Real-time server metrics visualization
- CPU, memory, and connection tracking
- Beautiful table displays with Bun's `inspect.table()`
- Multiple export formats (JSON, CSV, HTML)
- Live data updates and streaming

### **🚀 Production Ready**

- Optimized production builds with bundle analysis
- Environment configuration support
- Docker deployment templates
- CI/CD integration examples

## 🎮 Usage Examples

### **Create New Project**

```bash
# Interactive creation with all options
bun create @systems-dashboard/template my-dashboard

# Specific template type
bun create @systems-dashboard/template api-monitor --template=server

# CLI-only project
bun create @systems-dashboard/template cli-tool --template=cli --no-git
```

### **Development Workflow**

```bash
cd my-dashboard

# Start development with auto-open
systems-dashboard dev --open

# Development with custom port and HTTPS
systems-dashboard dev --port 8080 --host --https

# Type checking with watch mode
systems-dashboard type-check --watch

# Build and analyze bundle size
systems-dashboard build --analyze

# Preview production build
systems-dashboard preview --host
```

### **Code Quality**

```bash
# Lint and auto-fix issues
systems-dashboard lint --fix

# Format code with Prettier
systems-dashboard format

# Check formatting without changes
systems-dashboard format --check
```

## 📁 Project Structure

```text
my-project/
├── cli.js                 # Professional CLI tool
├── SystemsDashboard.tsx   # React dashboard component
├── index.html            # Entry point
├── package.json          # Dependencies and scripts
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
├── bunfig.toml          # Bun runtime configuration
├── setup.js             # Post-create setup script
├── .env.example         # Environment variables template
├── .gitignore           # Git ignore rules
└── README.md            # Project documentation
```

## 🔧 Configuration

### **Environment Variables**

```bash
# Copy and customize environment
cp .env.example .env

# Configuration options
PORT=3000                    # Development server port
HOST=localhost               # Server host
HTTPS=false                  # Enable HTTPS
ENABLE_LIVE_UPDATES=true     # Real-time data updates
ENABLE_EXPORT=true          # Export functionality
ENABLE_ANALYTICS=false      # Analytics tracking
```

### **Bun Configuration**

```toml
# bunfig.toml
[install]
cache = true
frozenLockfile = true

[dev]
port = 3000
hot = true
sourcemap = true

[build]
target = "bun"
minify = true
outdir = "dist"
```

## 🎨 Customization

### **Dashboard Customization**

Edit `SystemsDashboard.tsx` to:

- Add new data sources and metrics
- Customize visualization components
- Modify UI layout and styling
- Add new export formats

### **CLI Extensions**

Extend `cli.js` to:

- Add custom commands and options
- Integrate with external APIs
- Add authentication and security
- Create custom output formats

### **Template Variants**

Create specialized templates by:

1. Copying the base template
2. Modifying `package.json` and dependencies
3. Customizing setup script
4. Adding template-specific files

## 🚀 Deployment

### **Production Build**

```bash
# Build optimized bundle
systems-dashboard build --analyze

# Preview production build
systems-dashboard preview --host

# Build outputs to dist/ directory
```

### **Docker Deployment**

```dockerfile
FROM oven/bun:1.3.5
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
RUN bun run build
EXPOSE 3000
CMD ["bun", "run", "preview"]
```

### **Static Hosting**

```bash
# Build for static hosting
systems-dashboard build

# Deploy dist/ folder to:
# - Netlify
# - Vercel
# - GitHub Pages
# - AWS S3 + CloudFront
```

## 🧪 Testing

```bash
# Run test suite
bun test

# Watch mode for development
bun test --watch

# Generate coverage report
bun test --coverage

# Type checking
systems-dashboard type-check
```

## 📚 Documentation

### **Built-in Help**

```bash
# Show all available commands
systems-dashboard --help

# Project information
systems-dashboard info

# Command-specific help
systems-dashboard dev --help
```

### **Code Documentation**

- Full TypeScript IntelliSense support
- JSDoc comments throughout codebase
- Comprehensive README in generated projects
- Interactive CLI help system

## 🔄 Updates and Maintenance

### **Update Template**

```bash
# Update to latest template version
cd /path/to/bun-table-demo
git pull origin main
./template/setup-template.sh
```

### **Update Existing Project**

```bash
# In your project directory
git remote add template https://github.com/brendadeeznuts1111/bun-table-demo.git
git fetch template
git merge template/main/systems-dashboard
```

## 🤝 Team Collaboration

### **Share Template with Team**

```bash
# Team setup script
curl -fsSL https://raw.githubusercontent.com/brendadeeznuts1111/bun-table-demo/main/template/@systems-dashboard/setup-team.sh | bash

# Each team member can then:
bun create @systems-dashboard/template team-project
```

### **Custom Team Templates**

1. Fork the template repository
2. Customize for your team's needs
3. Update team setup script
4. Distribute to team members

## 📄 Enterprise Features

### **Security**

- No external registry dependencies
- Local template distribution
- Secure development practices
- Environment variable management

### **Compliance**

- MIT License for commercial use
- No data tracking or telemetry
- Self-hosted template system
- Full source code access

### **Scalability**

- Works for teams of any size
- Multiple template variants
- Custom configuration options
- Integration with existing workflows

---

**Built with ❤️ using [Bun](https://bun.sh), React, and TypeScript**

For more information, visit the [main repository](https://github.com/brendadeeznuts1111/bun-table-demo).
