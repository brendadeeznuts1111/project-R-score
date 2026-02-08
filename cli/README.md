# FactoryWager CLI

Complete infrastructure management command-line interface for FactoryWager domains, DNS, and services.

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/brendadeeznuts1111/project-R-score.git
cd project-R-score

# Run the setup script
./cli/setup-cli.sh

# Set your API token
export FACTORY_WAGER_TOKEN="your_cloudflare_token_here"
```

### Basic Usage

```bash
# Show help
./cli/fw-cli help

# Check infrastructure status
./cli/fw-cli status

# List all domains
./cli/fw-cli domains list

# List GitHub Pages domains
./cli/fw-cli domains list github

# List R2 bucket domains
./cli/fw-cli domains list r2
```

## 📋 Commands

### 🌐 DNS Management

```bash
# List all DNS records
./cli/fw-cli dns list

# Add a DNS record
./cli/fw-cli dns add new.domain.com target.com CNAME true

# Remove a DNS record
./cli/fw-cli dns remove new.domain.com

# Update a DNS record
./cli/fw-cli dns update existing.domain.com new.target.com

# Check DNS health
./cli/fw-cli dns check
./cli/fw-cli dns check wiki.factory-wager.com
```

### 📦 Domain Management

```bash
# List all domains
./cli/fw-cli domains list

# Filter domains
./cli/fw-cli domains list github
./cli/fw-cli domains list r2

# Create a new domain
./cli/fw-cli domains create new.factory-wager.com github
./cli/fw-cli domains create new.factory-wager.com r2

# Delete a domain
./cli/fw-cli domains delete old.factory-wager.com

# Test a domain
./cli/fw-cli domains test wiki.factory-wager.com

# Search domains
./cli/fw-cli domains search wiki
```

### 📊 Status & Monitoring

```bash
# Show overall infrastructure status
./cli/fw-cli status

# Show domain-specific status
./cli/fw-cli status domain wiki.factory-wager.com

# Show service status
./cli/fw-cli status service registry

# Generate health report
./cli/fw-cli status health

# Status summary
./cli/fw-cli status summary
```

### 🔐 Authentication

```bash
# Setup API token
./cli/fw-cli auth setup your_token_here

# Test authentication
./cli/fw-cli auth test

# Show auth status
./cli/fw-cli auth status
```

### ⚙️ Configuration

```bash
# Show current configuration
./cli/fw-cli config show

# Set configuration value
./cli/fw-cli config set defaultTarget github

# Reset configuration
./cli/fw-cli config reset
```

### 📦 Batch Operations

```bash
# Batch create domains from file
./cli/fw-cli batch create cli/batch-domains.json

# Batch update domains
./cli/fw-cli batch update updates.json

# Batch delete domains
./cli/fw-cli batch delete to-delete.json

# Batch test domains
./cli/fw-cli batch test test-list.json
```

### 🚀 Deployment

```bash
# Deploy DNS changes
./cli/fw-cli deploy dns

# Deploy content to domains
./cli/fw-cli deploy content ./dist

# Deploy configuration
./cli/fw-cli deploy config

# Deploy everything
./cli/fw-cli deploy all
```

## 🔧 Configuration

### Environment Variables

```bash
# Required: Cloudflare API token
export FACTORY_WAGER_TOKEN="your_token_here"

# Optional: Custom zone ID
export FACTORY_WAGER_ZONE_ID="a3b7ba4bb62cb1b177b04b8675250674"

# Optional: Default target for new domains
export FACTORY_WAGER_DEFAULT_TARGET="brendadeeznuts1111.github.io"

# Optional: Enable debug mode
export FACTORY_WAGER_DEBUG=true
```

### Configuration File

The CLI stores configuration in `~/.factory-wager/config.json`:

```json
{
  "apiToken": null,
  "defaultTarget": "brendadeeznuts1111.github.io",
  "zoneId": "a3b7ba4bb62cb1b177b04b8675250674",
  "preferences": {
    "autoSave": true,
    "confirmDeletes": true,
    "defaultType": "CNAME",
    "defaultTTL": 1,
    "proxyEnabled": true
  }
}
```

## 📁 File Structure

```
cli/
├── factory-wager-cli.js    # Main CLI script
├── fw-cli                  # Shell wrapper
├── setup-cli.sh           # Installation script
├── batch-domains.json     # Batch domain configuration
└── README.md              # This documentation
```

## 🌐 Domain Types

### GitHub Pages Domains
- Target: `brendadeeznuts1111.github.io`
- Used for: Static sites, dashboards, documentation
- Examples: `wiki.factory-wager.com`, `dashboard.factory-wager.com`

### R2 Bucket Domains
- Target: `public.r2.dev`
- Used for: Dynamic content, APIs, storage
- Examples: `api.factory-wager.com`, `metrics.factory-wager.com`

## 📊 Examples

### Basic Domain Management

```bash
# Create a new domain for a microservice
./cli/fw-cli domains create payments.factory-wager.com github

# Test the domain
./cli/fw-cli domains test payments.factory-wager.com

# Check overall status
./cli/fw-cli status
```

### Batch Operations

```bash
# Create batch-domains.json
cat > batch-domains.json << EOF
{
  "domains": [
    {"name": "service1.factory-wager.com", "target": "github"},
    {"name": "service2.factory-wager.com", "target": "r2"}
  ]
}
EOF

# Batch create
./cli/fw-cli batch create batch-domains.json
```

### Health Monitoring

```bash
# Check all domains
./cli/fw-cli dns check

# Check specific domain
./cli/fw-cli dns check wiki.factory-wager.com

# Generate health report
./cli/fw-cli status health
```

## 🔍 Troubleshooting

### Common Issues

1. **API Token Error**
   ```bash
   # Set your token
   export FACTORY_WAGER_TOKEN="your_token"
   
   # Or use auth setup
   ./cli/fw-cli auth setup
   ```

2. **Permission Denied**
   ```bash
   # Make script executable
   chmod +x ./cli/fw-cli
   ```

3. **Node.js Not Found**
   ```bash
   # Install Node.js from https://nodejs.org/
   # Or use your system package manager
   ```

### Debug Mode

Enable debug output:

```bash
export FACTORY_WAGER_DEBUG=true
./cli/fw-cli status
```

## 📝 Batch Configuration Format

For batch operations, use this JSON format:

```json
{
  "description": "Batch domain configuration",
  "version": "1.0.0",
  "domains": [
    {
      "name": "new.domain.com",
      "target": "github",
      "description": "Domain description",
      "priority": "high"
    }
  ]
}
```

## 🔗 API Integration

The CLI integrates with:

- **Cloudflare API**: DNS management
- **GitHub Pages**: Static hosting
- **Cloudflare R2**: Dynamic storage
- **FactoryWager Services**: Internal monitoring

## 🛠️ Development

### Running from Source

```bash
# Direct execution
node cli/factory-wager-cli.js help

# Using wrapper
./cli/fw-cli help
```

### Testing

```bash
# Test basic commands
./cli/fw-cli status
./cli/fw-cli domains list

# Test with API token
export FACTORY_WAGER_TOKEN="test_token"
./cli/fw-cli dns list
```

## 📞 Support

- **Documentation**: https://wiki.factory-wager.com/cli
- **Issues**: https://github.com/brendadeeznuts1111/project-R-score/issues
- **Discussions**: https://github.com/brendadeeznuts1111/project-R-score/discussions

## 📄 License

MIT License - see LICENSE file for details.

---

**FactoryWager CLI** - Complete infrastructure management at your fingertips! 🚀
