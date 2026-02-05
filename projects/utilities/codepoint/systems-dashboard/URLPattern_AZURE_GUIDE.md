# 🚀 URLPattern API & Azure Artifacts Integration Guide

This guide demonstrates the integration of Bun's new URLPattern API and Azure Artifacts support into the advanced dashboard system.

## 🔗 URLPattern API Integration

### Overview

Bun now supports the URLPattern Web API, providing declarative pattern matching for URLs—similar to how regular expressions work for strings. This is especially useful for routing in web servers and frameworks.

### Basic Usage

```typescript
// Match URLs with a user ID parameter
const pattern = new URLPattern({ pathname: "/users/:id" });

pattern.test("https://example.com/users/123"); // true
pattern.test("https://example.com/posts/456"); // false

const result = pattern.exec("https://example.com/users/123");
console.log(result.pathname.groups.id); // "123"

// Wildcard matching
const filesPattern = new URLPattern({ pathname: "/files/*" });
const match = filesPattern.exec("https://example.com/files/image.png");
console.log(match.pathname.groups[0]); // "image.png"
```

### Implementation Features

The URLPattern implementation includes:

- **Constructor**: Create patterns from strings or URLPatternInit dictionaries
- **test()**: Check if a URL matches the pattern (returns boolean)
- **exec()**: Extract matched groups from a URL (returns URLPatternResult or null)
- **Pattern properties**: protocol, username, password, hostname, port, pathname, search, hash
- **hasRegExpGroups**: Detect if the pattern uses custom regular expressions
- **408 Web Platform Tests**: Full compliance with web standards

### Dashboard Router Integration

Our advanced dashboard system includes a comprehensive router built on URLPattern:

```typescript
class DashboardRouter extends URLPatternRouter {
  constructor() {
    super();
    this.setupDashboardRoutes();
    this.setupAPIRoutes();
    this.setupFileRoutes();
  }

  private setupDashboardRoutes(): void {
    // Main dashboard page
    this.add("/", () => {
      return new Response(this.getDashboardHTML(), {
        headers: { 'Content-Type': 'text/html' }
      });
    });

    // Dashboard tabs with parameter extraction
    this.add("/tabs/:tab", (params) => {
      const validTabs = ['servers', 'api', 'performance', 'headers', 'bun-apis'];
      const tab = params.tab;

      if (!validTabs.includes(tab)) {
        return new Response('Invalid tab', { status: 400 });
      }

      return new Response(this.getTabContent(tab), {
        headers: { 'Content-Type': 'text/html' }
      });
    });
  }
}
```

### Advanced Pattern Examples

#### API Versioning
```typescript
const apiPatterns = [
  { pattern: "/api/v1/users/:id", description: "API v1 user endpoint" },
  { pattern: "/api/v2/users/:id/profile", description: "API v2 user profile" },
  { pattern: "/api/:version/users/:id/posts/:postId", description: "Multi-parameter API" },
];
```

#### Resource Handling
```typescript
const resourcePatterns = [
  { pattern: "/static/*", test: "/static/css/main.css" },
  { pattern: "/downloads/:category/:filename", test: "/downloads/reports/annual.pdf" },
  { pattern: "/images/:size(*)", test: "/images/thumbnail/logo.png" },
];
```

#### Multi-tenant Applications
```typescript
const tenantPattern = new URLPattern({
  protocol: "https",
  hostname: ":tenant.example.com",
  pathname: "/*"
});

const tenantMatch = tenantPattern.exec("https://acme.example.com/dashboard");
console.log(tenantMatch?.hostname.groups.tenant); // "acme"
```

### Performance Characteristics

URLPattern provides excellent performance for routing:

- **Pattern Compilation**: ~0.1ms per pattern
- **Pattern Matching**: ~0.0001ms per match
- **Memory Usage**: Minimal overhead
- **Scalability**: Handles thousands of patterns efficiently

### Usage Examples

```bash
# Test URLPattern routing
bun run router:demo

# Run comprehensive examples
bun run router:test

# Test specific patterns
bun run router:examples
```

## ☁️ Azure Artifacts Integration

### Overview

Azure Artifacts is a package management system for Azure DevOps that allows you to host private npm registries and other package types. Bun provides seamless integration with Azure Artifacts.

### Configuration

#### Method 1: bunfig.toml Configuration

Create a `bunfig.toml` file in your project:

```toml
[install.registry]
url = "https://pkgs.dev.azure.com/my-organization/_packaging/my-feed/npm/registry"
username = "my-username"
password = "$NPM_PASSWORD"
```

#### Method 2: Environment Variables

Set the `NPM_CONFIG_REGISTRY` environment variable:

```bash
NPM_CONFIG_REGISTRY=https://pkgs.dev.azure.com/my-organization/_packaging/my-feed/npm/registry/:username=my-username:_password=my-password
```

### Authentication

#### Personal Access Token (PAT)

1. **Generate PAT**:
   - Go to Azure DevOps → User Settings → Personal Access Tokens
   - Create a new token with **Packaging (Read & write)** permissions

2. **Configure Environment**:
   ```bash
   # Copy the Azure template
   bun run azure:setup

   # Edit .env with your PAT
   NPM_PASSWORD=your-pat-here
   ```

#### Important: No Base64 Encoding

⚠️ **Do not base64 encode your password for Bun!**

Unlike npm, Bun automatically handles base64 encoding. If your password ends with `==`, it's probably already base64 encoded.

To decode a base64-encoded password:
```javascript
atob("base64-encoded-password");
```

### Private Package Publishing

#### Publishing to Azure Artifacts

```bash
# Configure for Azure Artifacts
bun run azure:setup

# Install dependencies from private registry
bun run azure:install

# Publish your package
bun run azure:publish
```

#### Scoped Packages

Configure scoped packages in `bunfig.toml`:

```toml
[install.scopes]
"@mycompany" = {
  url = "https://pkgs.dev.azure.com/my-org/_packaging/my-feed/npm/registry",
  username = "my-username",
  password = "$NPM_PASSWORD"
}
```

### Dashboard Integration

The advanced dashboard system supports Azure Artifacts for:

- **Private Dependencies**: Use internal packages in dashboard builds
- **Enterprise Distribution**: Deploy dashboard within organization
- **Version Control**: Track dashboard versions in private registry
- **Security**: Keep proprietary code private

### Example: Private Dashboard Build

```bash
# Configure Azure Artifacts
bun run azure:setup

# Build with private dependencies
bun run build:premium

# Upload to private registry
bun run azure:publish

# Deploy within organization
bun run r2:upload
```

## 🎯 Combined Features

### Feature-Flagged Routing with Private Packages

```typescript
// Routes that depend on private packages
if (hasFeature("ENTERPRISE")) {
  // Load private analytics package
  const analytics = await import("@mycompany/analytics");

  router.add("/admin/analytics", async () => {
    const data = await analytics.getMetrics();
    return Response.json(data);
  });
}
```

### Secure Upload with Azure Integration

```typescript
// Upload to Azure Storage with private auth
const azureUpload = new URLPatternRouter();
azureUpload.add("/upload/azure/*", async (params) => {
  if (hasFeature("AZURE_UPLOAD")) {
    const azureClient = await import("@mycompany/azure-storage");
    return await azureClient.upload(params.wildcard);
  }
});
```

## 🛠️ Development Workflow

### Local Development

```bash
# Start with public packages
bun run dev

# Test URLPattern routing
bun run router:demo

# Switch to Azure Artifacts
bun run azure:setup
bun run dev
```

### Production Deployment

```bash
# Build with all features
bun run build:premium

# Test with private packages
bun run azure:install

# Deploy to cloud storage
bun run r2:upload

# Publish to private registry
bun run azure:publish
```

## 📊 Benefits

### URLPattern Benefits

- **Declarative Routing**: Clear, readable route definitions
- **Performance**: Fast pattern matching for high-traffic applications
- **Standards Compliant**: Full Web Platform Test compliance
- **Type Safety**: Works seamlessly with TypeScript
- **Flexibility**: Supports complex routing scenarios

### Azure Artifacts Benefits

- **Privacy**: Keep proprietary packages private
- **Security**: Enterprise-grade authentication and permissions
- **Integration**: Seamless Azure DevOps integration
- **Versioning**: Full package version management
- **Performance**: Fast package downloads and caching

### Combined Benefits

- **Enterprise Ready**: Full enterprise deployment capabilities
- **Scalable**: Handles large-scale routing and package management
- **Secure**: Private packages with secure routing
- **Flexible**: Works with both public and private dependencies
- **Professional**: Production-grade tooling and workflows

## 🔧 Troubleshooting

### URLPattern Issues

- **Pattern Syntax**: Ensure proper pattern syntax - see Web Platform Tests
- **Performance**: Monitor pattern matching performance in high-traffic scenarios
- **Groups**: Use named groups for better readability

### Azure Artifacts Issues

- **Authentication**: Ensure PAT has correct permissions
- **Encoding**: Don't base64 encode passwords for Bun
- **Network**: Check firewall and proxy settings
- **Permissions**: Verify feed access permissions

### Integration Issues

- **Feature Flags**: Ensure proper feature flag configuration
- **Dependencies**: Check private package dependencies
- **Build**: Verify build configuration for private packages

This integration demonstrates how Bun's latest features work together to create a professional, enterprise-ready dashboard system with advanced routing and private package management capabilities.
