# 🖥️ Systems Dashboard Template

Professional systems monitoring dashboard template with Bun, React, and TypeScript.

## 🚀 Quick Start

### For Team Members

```bash
# Install template (one-time setup)
curl -fsSL https://raw.githubusercontent.com/brendadeeznuts1111/bun-table-demo/main/systems-dashboard/setup-team.sh | bash

# Create new project
bun create @systems-dashboard/template my-monitoring-dashboard

# Start development
cd my-monitoring-dashboard
systems-dashboard dev --open
```

### Manual Installation

```bash
# Create template directory
mkdir -p ~/.bun-create/@systems-dashboard

# Clone template
git clone https://github.com/brendadeeznuts1111/bun-table-demo.git ~/.bun-create/@systems-dashboard/template

# Copy systems dashboard files
cp -r ~/.bun-create/@systems-dashboard/template/systems-dashboard/* ~/.bun-create/@systems-dashboard/template/

# Make scripts executable
chmod +x ~/.bun-create/@systems-dashboard/template/setup.js
chmod +x ~/.bun-create/@systems-dashboard/template/cli.js
```

## 📋 Template Options

### Dashboard Types

| Type | Description | Features |
|------|-------------|----------|
| **Full** | Complete monitoring solution | React UI, CLI tools, server monitoring |
| **Server** | Server monitoring focus | Backend metrics, performance tracking |
| **CLI** | Command-line interface only | Terminal tools, no UI |
| **Analytics** | Data visualization focus | Charts, graphs, analytics |

### Configuration Options

```bash
# Interactive creation
bun create @systems-dashboard/template my-project

# With options
bun create @systems-dashboard/template my-project \
  --template=server \
  --no-git \
  --no-install
```

## 🎯 Features Included

### **Professional CLI Tools**
- Rich command-line interface with help system
- Progress indicators and colored output
- Multiple commands: dev, build, preview, type-check, lint, format
- Auto-browser opening and network access

### **Development Tools**
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **ESLint** and **Prettier** for code quality
- **Hot Module Replacement** for development

### **Monitoring Capabilities**
- Real-time server metrics
- CPU, memory, and connection tracking
- Beautiful table visualization with Bun's `inspect.table()`
- Multiple export formats (JSON, CSV, HTML)
- Live data updates

### **Production Ready**
- Optimized builds with bundle analysis
- Environment configuration
- Docker support (optional)
- CI/CD templates (optional)

## 🛠️ Available Commands

```bash
# Development
systems-dashboard dev --open --port 3000
systems-dashboard dev --host --https

# Building
systems-dashboard build --analyze
systems-dashboard preview --host

# Code Quality
systems-dashboard type-check --watch
systems-dashboard lint --fix
systems-dashboard format --check

# Project Info
systems-dashboard info
systems-dashboard --help
```

## 📁 Project Structure

```
my-project/
├── cli.js                 # Professional CLI tool
├── SystemsDashboard.tsx   # React dashboard component
├── index.html            # Entry point
├── package.json          # Dependencies and scripts
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
├── bunfig.toml          # Bun configuration
├── setup.js             # Post-create setup script
├── .env.example         # Environment variables
├── .gitignore           # Git ignore rules
└── README.md            # Project documentation
```

## 🔧 Customization

### Environment Variables

```bash
# Copy environment template
cp .env.example .env

# Configure
PORT=3000
HOST=localhost
ENABLE_LIVE_UPDATES=true
ENABLE_EXPORT=true
```

### Dashboard Customization

Edit `SystemsDashboard.tsx` to:
- Add new data sources
- Customize metrics display
- Modify UI components
- Add export formats

### CLI Extensions

Extend `cli.js` to:
- Add custom commands
- Integrate with external APIs
- Add authentication
- Custom output formats

## 🚀 Deployment

### Build for Production

```bash
# Build optimized bundle
systems-dashboard build --analyze

# Preview production build
systems-dashboard preview --host
```

### Docker Deployment

```dockerfile
FROM oven/bun:1.3.5
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
RUN bun run build
EXPOSE 3000
CMD ["bun", "run", "preview"]
```

### Static Hosting

```bash
# Build and deploy to static hosting
systems-dashboard build
# Deploy dist/ folder to Netlify, Vercel, etc.
```

## 🧪 Testing

```bash
# Run tests
bun test

# Watch mode
bun test --watch

# Coverage
bun test --coverage
```

## 📚 Documentation

- **CLI Reference**: `systems-dashboard --help`
- **Project Info**: `systems-dashboard info`
- **TypeScript Docs**: Full IntelliSense support
- **API Documentation**: Built-in with JSDoc comments

## 🔄 Updates

### Update Template

```bash
# Update to latest template
cd ~/.bun-create/@systems-dashboard/template
git pull origin main
```

### Update Existing Project

```bash
# Merge latest changes
git remote add template https://github.com/brendadeeznuts1111/bun-table-demo.git
git fetch template
git merge template/main/systems-dashboard
```

## 🤝 Contributing

1. Fork the template repository
2. Create feature branch
3. Test changes thoroughly
4. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

---

**Built with ❤️ using [Bun](https://bun.sh) and React**
