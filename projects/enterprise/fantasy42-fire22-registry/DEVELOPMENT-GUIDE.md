# 🚀 Fantasy42-Fire22 Development Guide

## 🎯 Quick Start

### **First Time Setup**

```bash
# Clone the repository
git clone git@github.com:brendadeeznuts1111/fantasy42-fire22-registry.git
cd fantasy42-fire22-registry

# Setup development environment
bun run workflow:setup

# Start developing
bun run workflow:dev
```

### **Daily Development**

```bash
# Check status
bun run workflow:status

# Start development
bun run dev

# Run tests
bun run test

# Build project
bun run build
```

---

## 🐰 Bun Integration

### **Package Management**

```bash
# Install dependencies
bun install

# Add packages
bun add lodash
bun add -D @types/lodash

# Remove packages
bun remove lodash

# Update dependencies
bun update
bun update --latest
```

### **Development Server**

```bash
# Start with hot reload
bun run dev

# Start with specific port
PORT=3001 bun run dev

# Start with debug mode
DEBUG=true bun run dev
```

### **Bunx - Zero-Install Tools**

```bash
# Run tools without installing globally
bunx prettier --write src/
bunx eslint src/
bunx typescript --version
bunx jest
bunx webpack

# Create new projects
bunx create-react-app my-app
bunx create-next-app my-app
```

---

## 🔐 Secrets Management

### **Bun Secrets**

```bash
# Set secrets
bun secrets set DATABASE_URL "sqlite://db.sqlite"
bun secrets set API_KEY "your-api-key"

# Get secrets
bun secrets get DATABASE_URL

# List all secrets
bun secrets list

# Remove secret
bun secrets rm API_KEY
```

### **Environment Variables**

```bash
# Local environment file
cp .env.example .env.local
# Edit .env.local with your values

# Environment variables are automatically loaded
# Access in code: process.env.YOUR_VARIABLE
```

---

## 🚀 Development Workflows

### **Available Commands**

```bash
# Development
bun run dev              # Start development server
bun run test             # Run tests
bun run lint             # Run linter
bun run build            # Build project

# Workflows
bun run workflow:dev     # Full development workflow
bun run workflow:test    # Complete testing workflow
bun run workflow:build   # Full build workflow

# Environment
bun run dev:setup        # Setup development environment
bun run dev:clean        # Clean cache and logs
bun run dev:reset        # Full reset and setup
bun run dev:shell        # Load development configuration
```

### **Git Operations**

```bash
# All commits are automatically signed
git add .
git commit -m "feat: your feature"

# Push to private repository
git push origin main
```

---

## ☁️ Enterprise Infrastructure

### **Cloudflare Integration**

```bash
# Check status
bun run enterprise:status

# Deploy infrastructure
bun run enterprise:setup

# Verify deployment
bun run enterprise:verify
```

### **DNS & Email**

```bash
# Setup DNS records
bun run dns:all

# Verify DNS
bun run dns:check

# Configure email routing
bun run dns:email
```

---

## 📁 Project Structure

```
fantasy42-fire22-registry/
├── src/                    # Source code
├── scripts/               # Development scripts
├── enterprise/            # Enterprise features
├── docs/                  # Documentation
├── config/                # Configuration files
├── .env.local            # Local environment (gitignored)
├── .devrc                # Development configuration
├── .bunfig.local.toml    # Bun local config
├── secrets.json          # Secrets template
└── package.json          # Dependencies and scripts
```

---

## 🛠️ Development Tools

### **VS Code Integration**

- Automatic Bun detection
- TypeScript support
- Hot reload debugging
- Source maps enabled
- Prettier integration

### **Git Hooks**

- Pre-commit linting
- Automatic code formatting
- Commit signing verification

### **Testing**

```bash
# Run all tests
bun run test

# Run specific test
bun run test src/component.test.ts

# Watch mode
bun run test --watch

# Coverage report
bun run test --coverage
```

---

## 🔒 Security Features

### **Commit Signing**

- All commits are SSH signed
- GitHub verifies signatures
- Enterprise-grade integrity

### **Private Repository**

- Access controlled
- Enterprise security
- Audit logging

### **Secrets Management**

- Encrypted secrets storage
- Environment-specific configs
- Secure credential management

---

## 🚀 Deployment

### **Development Deployment**

```bash
# Deploy to development
wrangler deploy --env development
```

### **Production Deployment**

```bash
# Deploy to production
wrangler deploy --env production

# Check deployment status
wrangler deployments
```

---

## 📚 Additional Resources

### **Documentation**

- [CLOUDFLARE-SETUP-GUIDE.md](./CLOUDFLARE-SETUP-GUIDE.md)
- [SECURITY-README.md](./SECURITY-README.md)
- [README.md](./README.md)

### **Enterprise Features**

- [DNS-EMAIL-SETUP-GUIDE.md](./infrastructure/DNS-EMAIL-SETUP-GUIDE.md)
- [Enterprise Benchmarks](./enterprise/benchmarking/)
- [Security Documentation](./enterprise/security/)

---

## 🆘 Troubleshooting

### **Common Issues**

#### **Bun Not Found**

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash
```

#### **Environment Variables Not Loading**

```bash
# Check .env.local exists
ls -la .env.local

# Reload environment
source .devrc
```

#### **Git Commit Signing Issues**

```bash
# Check SSH key
ssh-add -l

# Test GitHub connection
ssh -T git@github.com
```

#### **Cloudflare Authentication**

```bash
# Login to Cloudflare
wrangler auth login

# Check authentication
wrangler auth whoami
```

---

## 🎯 Best Practices

### **Development**

- Use `bun run workflow:dev` for full development setup
- Keep environment variables in `.env.local`
- Use Bun secrets for sensitive data
- Commit frequently with descriptive messages

### **Code Quality**

- Run linter before committing
- Write tests for new features
- Use TypeScript for type safety
- Follow existing code patterns

### **Security**

- Never commit secrets to git
- Use SSH for git operations
- Keep dependencies updated
- Review code changes carefully

### **Performance**

- Use Bun's native features
- Optimize bundle size
- Monitor performance metrics
- Use caching appropriately

---

## 📞 Support

### **Getting Help**

- Check this guide first
- Review existing documentation
- Check GitHub issues
- Contact enterprise team

### **Enterprise Resources**

- Internal documentation
- Team chat channels
- Code review guidelines
- Security procedures

---

<div align="center">

**🚀 Happy Developing with Fantasy42-Fire22!**

_Smooth development workflow with Bun, enterprise-grade security, and
comprehensive tooling_

**🐰 Built with Bun • 🔐 Enterprise Security • ☁️ Cloudflare Integration**

</div>
