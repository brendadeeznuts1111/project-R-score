# Installation Guide

This guide will walk you through installing and setting up the RSS Feed Optimization project on your local machine.

## Prerequisites

Before installing, ensure you have the following:

### Required Software

- **Bun** v1.3.7 or later
- **Git** (for cloning the repository)
- **Node.js** 18+ (for compatibility with some tools)

### Optional (for R2 Storage)

- **Cloudflare R2 account** (if using R2 storage)
- **Wrangler CLI** (for R2 bucket management)

## Installing Bun

### Option 1: Using the Official Installer (Recommended)

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version
```

### Option 2: Using npm

```bash
# Install Bun globally
npm install -g bun

# Verify installation
bun --version
```

### Option 3: Using Homebrew (macOS)

```bash
# Install Bun
brew install bun

# Verify installation
bun --version
```

## Cloning the Repository

```bash
# Clone the repository
git clone https://github.com/brendadeeznuts1111/rss-feed-optimization.git

# Navigate to project directory
cd rss-feed-optimization
```

## Installing Dependencies

```bash
# Install all dependencies
bun install
```

This will install all the necessary packages listed in `package.json`.

## Verifying Installation

After installation, verify everything is working:

```bash
# Check Bun version
bun --version

# Check if dependencies are installed
bun list

# Run a quick test
bun test
```

## Optional: Setting Up R2 Storage

If you plan to use Cloudflare R2 for storage:

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Create R2 Bucket

```bash
# Create a new R2 bucket
wrangler r2 bucket create your-blog-bucket-name
```

### 4. Set Up Credentials

Create a `.env` file and add your R2 credentials:

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your R2 credentials
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-blog-bucket-name
```

## Platform-Specific Setup

### macOS

No additional setup required. Bun works out of the box on macOS.

### Linux

Ensure you have the required system dependencies:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y build-essential

# CentOS/RHEL
sudo yum groupinstall "Development Tools"
```

### Windows

Bun has limited Windows support. For best results:

1. Use **Windows Subsystem for Linux (WSL)**
2. Install Bun within WSL
3. Follow the Linux installation instructions

## Troubleshooting Installation

### Common Issues

#### 1. Bun Installation Fails

**Problem**: Bun fails to install or isn't recognized.

**Solution**:
```bash
# Check if Bun is in your PATH
echo $PATH

# Add Bun to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$HOME/.bun/bin:$PATH"
```

#### 2. Permission Errors

**Problem**: Permission denied errors during installation.

**Solution**:
```bash
# Use sudo for global installation
sudo npm install -g bun

# Or fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

#### 3. Dependency Installation Fails

**Problem**: `bun install` fails with dependency errors.

**Solution**:
```bash
# Clear Bun cache
bun install --force

# Or try with verbose output
bun install --verbose
```

#### 4. Port Already in Use

**Problem**: Development server fails to start due to port conflict.

**Solution**:
```bash
# Change the port in .env
echo "PORT=3001" >> .env

# Or find and kill the process using the port
lsof -ti:3000 | xargs kill -9
```

### Getting Help

If you encounter issues during installation:

1. **Check Bun Documentation**: [https://bun.sh/docs](https://bun.sh/docs)
2. **Check System Requirements**: Ensure your system meets the minimum requirements
3. **Create an Issue**: [GitHub Issues](https://github.com/brendadeeznuts1111/rss-feed-optimization/issues)
4. **Check Logs**: Run commands with `--verbose` flag for more detailed output

## Next Steps

After successful installation:

1. **Configure Environment**: Set up your `.env` file
2. **Run the Application**: Start with `bun run dev`
3. **Explore the Codebase**: Familiarize yourself with the project structure
4. **Read the Documentation**: Check out the [Quick Start Guide](./quick-start.md)

## Development Environment Setup

For development, you might want to install additional tools:

```bash
# Code formatting and linting
bun add --dev @biomejs/biome

# Testing utilities
bun add --dev @bun:test

# Development tools
bun add --dev @types/node
```

## IDE Configuration

### VS Code

For the best development experience with VS Code:

1. Install the **Bun extension** from the marketplace
2. Configure your `settings.json`:

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll": true
  }
}
```

### Other Editors

Most modern editors work well with Bun. Ensure you have:

- **JavaScript/TypeScript support**
- **ESLint integration** (if using)
- **Prettier integration** (if using)

## Verification Checklist

- [ ] Bun is installed and accessible from command line
- [ ] Repository is cloned successfully
- [ ] Dependencies are installed without errors
- [ ] Tests pass (`bun test`)
- [ ] Development server starts (`bun run dev`)
- [ ] Application is accessible in browser

Once you've completed these steps, you're ready to start developing with the RSS Feed Optimization project!