
# 🔐 Tier-1380 Security MCP Server

A comprehensive Model Context Protocol (MCP) server that exposes enterprise-grade security capabilities to LLM applications. Built with Bun for maximum performance and cross-platform compatibility.

## 🚀 Features

### 🔑 Secret Management
- **Cross-platform secure storage** (Windows Credential Manager, macOS Keychain, Linux libsecret)
- **Enterprise persistence** with CRED_PERSIST_ENTERPRISE support
- **Versioned secrets** with rollback capabilities
- **Automated rotation** with lifecycle management
- **Cryptographically secure generation** for all secret types

### 🔐 Authentication System
- **Enterprise-grade password hashing** (Argon2id, bcrypt)
- **Rate limiting** to prevent brute-force attacks
- **Audit trails** for all authentication events
- **Session management** with secure tokens
- **Account locking** after failed attempts

### 🚀 Secure Deployment
- **Password-protected deployments** with enterprise authentication
- **Real deployment pipelines** (validation, build, test, deploy, health checks)
- **Audit logging** for all deployment activities
- **Rollback capabilities** with proper verification

### 📊 Monitoring & Reporting
- **Real-time audit logs** for security events
- **Secret status monitoring** with health checks
- **Authentication metrics** and security reports
- **Comprehensive security prompts** for LLM assistance

## 📦 Installation

### Prerequisites
- Bun runtime (>= 1.0.0)
- Node.js compatibility layer (for MCP SDK)

### Setup
```bash
# Install dependencies
bun install

# Build the server
bun run build

# Start the MCP server
bun run start
```

## 🔧 Configuration

### MCP Client Configuration
Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "tier1380-security": {
      "command": "bun",
      "args": ["run", "/path/to/mcp-server.ts"]
    }
  }
}
```

### Environment Variables
```bash
# Optional: Configure default security settings
export TIER1380_DEFAULT_ALGORITHM=argon2id
export TIER1380_AUDIT_RETENTION_DAYS=90
export TIER1380_RATE_LIMIT_ATTEMPTS=5
export TIER1380_RATE_LIMIT_WINDOW=900000
```

## 🛠️ Available Tools

### Secret Management
- `store_secret` - Store secrets securely
- `retrieve_secret` - Retrieve stored secrets
- `delete_secret` - Delete secrets
- `list_secrets` - List all secrets
- `rotate_secret` - Rotate secret values
- `create_secret_version` - Create secret versions
- `rollback_secret` - Rollback to previous versions

### Authentication
- `hash_password` - Hash passwords with enterprise algorithms
- `verify_password` - Verify passwords with strength scoring
- `authenticate_user` - Authenticate users with rate limiting

### Deployment
- `deploy_application` - Deploy with enterprise security

## 📊 Available Resources

- `security://audit-log` - Real-time security audit log
- `security://secret-status` - Secret status and health
- `security://auth-report` - Authentication metrics

## 🎯 Available Prompts

- `security-audit` - Generate comprehensive security audits
- `secret-rotation-plan` - Create rotation schedules
- `deployment-security-checklist` - Generate deployment checklists

## 🔒 Security Features

### Cross-Platform Storage
- **Windows**: Native Credential Manager with enterprise persistence
- **macOS**: Keychain Services integration
- **Linux**: libsecret with encrypted file fallback

### Enterprise Security
- **AES-256 encryption** for all stored data
- **Argon2id memory-hard hashing** for passwords
- **Rate limiting** to prevent attacks
- **Comprehensive audit trails**
- **Session management** with secure tokens

### Compliance
- **GDPR compliant** data handling
- **SOC 2 ready** audit trails
- **Enterprise-grade** access controls
- **Version control** with rollback capabilities

## 🚀 Usage Examples

### Storing a Secret
```typescript
// Via MCP tool call
{
  "tool": "store_secret",
  "arguments": {
    "key": "DATABASE_PASSWORD",
    "value": "secure_password_123!",
    "persistEnterprise": true
  }
}
```

### User Authentication
```typescript
// Via MCP tool call
{
  "tool": "authenticate_user",
  "arguments": {
    "username": "admin",
    "password": "secure_password",
    "ipAddress": "192.168.1.100",
    "userAgent": "MCP Client v1.0"
  }
}
```

### Secure Deployment
```typescript
// Via MCP tool call
{
  "tool": "deploy_application",
  "arguments": {
    "snapshotId": "app-v1.2.3",
    "username": "deployer",
    "password": "deploy_password"
  }
}
```

## 🧪 Testing

```bash
# Run integration tests
bun test test-integration.ts

# Test specific functionality
bun run mcp-server.ts --test
```

## 📈 Performance

- **Sub-millisecond** secret retrieval
- **Cross-platform** native performance
- **Memory-efficient** with Bun runtime
- **Concurrent** operation support

## 🔍 Monitoring

### Health Checks
```bash
# Check server health
curl -X POST http://example.com/health

# Check secret storage
curl -X POST -d '{"tool":"list_secrets"}' http://example.com/tools
```

### Metrics
- Secret operations per second
- Authentication success/failure rates
- Deployment success rates
- Error rates and types

## 🛡️ Security Best Practices

1. **Use enterprise persistence** for production secrets
2. **Enable audit logging** for compliance
3. **Configure rate limiting** appropriately
4. **Rotate secrets regularly** using lifecycle management
5. **Monitor audit logs** for suspicious activity

## 🤝 Integration

### With Claude Desktop
```json
{
  "mcpServers": {
    "tier1380-security": {
      "command": "bun",
      "args": ["run", "/path/to/mcp-server.ts"],
      "env": {
        "TIER1380_LOG_LEVEL": "info"
      }
    }
  }
}
```

### With Custom Applications
```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'bun',
  args: ['run', 'mcp-server.ts']
});

const client = new Client(
  {
    name: 'my-app',
    version: '1.0.0'
  },
  {
    capabilities: {}
  }
);

await client.connect(transport);
```

## 📝 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Issues**: [GitHub Issues 🌐](https://github.com/brendadeeznuts1111/project-R-score/issues)
- **Documentation**: [MCP Protocol 🌐](https://modelcontextprotocol.io)
- **Security**: For security issues, email security@tier1380.com

## 🔄 Version History

- **v4.5.0** - MCP server implementation with full security suite
- **v4.0.0** - Cross-platform secret management
- **v3.0.0** - Enterprise authentication system
- **v2.0.0** - Secure deployment pipeline
- **v1.0.0** - Initial release

---

**Built with ❤️ and 🔐 by the Tier-1380 Security Team**
