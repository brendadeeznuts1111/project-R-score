# Private Registry Setup Guide

This guide explains how to configure private registries for the Fire22 project.

## Overview

The project uses multiple private registries for different scopes:

- `@fire22` - Core Fire22 packages
- `@enterprise` - Enterprise-specific packages
- `@private` - Private/internal packages

## Environment Variables

Update your `.env` file with the following variables:

```bash
# Registry Authentication Tokens
FIRE22_REGISTRY_TOKEN=your_actual_registry_token
FIRE22_ENTERPRISE_TOKEN=your_actual_enterprise_token
FIRE22_PRIVATE_USER=your_private_username
FIRE22_PRIVATE_PASS=your_private_password
NPM_TOKEN=your_npm_token

# Registry URLs
FIRE22_REGISTRY_URL=https://your-registry.fire22.com/
FIRE22_ENTERPRISE_REGISTRY_URL=https://your-enterprise-registry.com
FIRE22_PRIVATE_REGISTRY_URL=https://your-private-registry.com
```

## Getting Registry Credentials

### Fire22 Registry (@fire22)

1. Contact your Fire22 administrator
2. Request access to the private registry
3. Get your personal access token

### Enterprise Registry (@enterprise)

1. Contact your enterprise IT team
2. Request registry access credentials
3. Obtain authentication token

### Private Registry (@private)

1. Contact your organization's package registry administrator
2. Request username/password credentials
3. Ensure you have read access to required packages

## Configuration Files

The following files are configured for private registry access:

- `.env` - Environment variables (you need to update this)
- `bunfig.toml` - Bun package manager configuration
- `.npmrc` - NPM configuration (fallback)

## Testing Setup

Run the registry setup script to verify your configuration:

```bash
bun run registry:setup
```

This will:

- Check if all required environment variables are set
- Test connectivity to each registry
- Report any configuration issues

## Installation

Once configured, install dependencies normally:

```bash
bun install
```

The package manager will automatically use the appropriate registry for each
scoped package.

## Troubleshooting

### Common Issues

1. **"Registry not configured"**

   - Check that all environment variables are set in `.env`
   - Ensure `.env` is not in `.gitignore`
   - Restart your terminal/shell after updating `.env`

2. **"Authentication failed"**

   - Verify your tokens/credentials are correct
   - Check token expiration dates
   - Ensure you have proper permissions

3. **"Registry unreachable"**
   - Check network connectivity
   - Verify registry URLs are correct
   - Check firewall/proxy settings

### Debug Mode

Enable debug logging for detailed registry information:

```bash
DEBUG=* bun install
```

## Security Notes

- Never commit `.env` files to version control
- Rotate tokens regularly
- Use read-only tokens when possible
- Store credentials securely (consider using a password manager)

## Support

If you encounter issues:

1. Run `bun run registry:setup` for diagnostics
2. Check the console output for specific error messages
3. Contact your registry administrator for access issues
4. Review this guide for common solutions
