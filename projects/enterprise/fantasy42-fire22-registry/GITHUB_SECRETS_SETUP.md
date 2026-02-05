# 🔥 Fantasy42-Fire22 GitHub Repository Secrets

# Required for CI/CD with Scoped Registry Tokens

## Scoped Registry Tokens (Principle of Least Privilege)

### FIRE22_REGISTRY_TOKEN

- **Name**: FIRE22_REGISTRY_TOKEN
- **Scope**: @fire22
- **Permissions**: read
- **Description**: Read-only token for @fire22 scoped packages
- **Environment**: development,staging,production
- **Value**: [Create token in registry dashboard]

### FIRE22_PUBLISH_TOKEN

- **Name**: FIRE22_PUBLISH_TOKEN
- **Scope**: @fire22
- **Permissions**: read, write
- **Description**: Publish token for @fire22 scoped packages
- **Environment**: production
- **Value**: [Create token in registry dashboard]

### FIRE22_ENTERPRISE_TOKEN

- **Name**: FIRE22_ENTERPRISE_TOKEN
- **Scope**: @enterprise
- **Permissions**: read, write
- **Description**: Enterprise registry token with full access
- **Environment**: enterprise
- **Value**: [Create token in registry dashboard]

### FIRE22_PRIVATE_TOKEN

- **Name**: FIRE22_PRIVATE_TOKEN
- **Scope**: @private
- **Permissions**: read
- **Description**: Private registry read-only token
- **Environment**: development,staging
- **Value**: [Create token in registry dashboard]

### SPORTSBET_REGISTRY_TOKEN

- **Name**: SPORTSBET_REGISTRY_TOKEN
- **Scope**: @sportsbet
- **Permissions**: read
- **Description**: Partner registry token for SportsBet packages
- **Environment**: development,staging,production
- **Value**: [Create token in registry dashboard]

## Additional Secrets for CI/CD

### CLOUDFLARE_API_TOKEN

- **Description**: Cloudflare API token for deployments
- **Permissions**: Zone.Read, Zone.Write, DNS.Read, DNS.Edit

### GITHUB_TOKEN

- **Description**: GitHub token for package publishing
- **Permissions**: repo, packages:write

## Token Creation Instructions

### npm Registry Tokens:

1. Go to https://www.npmjs.com/settings/tokens
2. Click 'Generate New Token'
3. Choose token type based on permissions needed
4. Copy token value to GitHub secret

### GitHub Repository Secrets:

1. Go to Repository Settings → Secrets and variables → Actions
2. Click 'New repository secret'
3. Add each token with its corresponding value

### Cloudflare API Tokens:

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Create token with appropriate permissions
3. Copy token to GitHub secret
