# FactoryWager MCP Usage Guide

## 🚀 Quick Start

### 1. R2 Connection Status ✅
Your R2 integration is fully configured and working:
- **Account**: `7a470541a704caaf91e71efccc78fd36`
- **Bucket**: `scanner-cookies`
- **Credentials**: Validated
- **File Upload/Download**: Tested successfully

### 2. Available CLI Tools

#### R2 Operations
```bash
# List objects (with limitations on list permissions)
bun run scripts/r2-cli.ts get-json your-key.json --env-fallback

# Upload files to R2
echo '{"test": true}' | bun run scripts/r2-cli.ts put-json test.json - --env-fallback

# Upload MCP diagnoses
echo '{"diagnosis": "..."}' | bun run scripts/r2-cli.ts put-json mcp/diagnoses/issue.json - --env-fallback
```

#### Interactive Documentation (with some limitations)
```bash
# Basic help (working)
bun run scripts/interactive-docs.ts help

# Learn APIs (has formatting issues but functional)
bun run scripts/interactive-docs.ts learn "Bun.file" r2

# Diagnose errors
bun run scripts/interactive-docs.ts diagnose "error message" context
```

#### MCP Servers (Tested)
```bash
# Bun documentation server
bun run lib/mcp/bun-mcp-server.ts

# FactoryWager tools server  
bun run scripts/fw-tools-mcp.ts

# Claude Desktop bridge
bun run scripts/mcp-bridge.ts
```

### 3. Claude Desktop Integration ✅

Configuration created at: `~/.config/claude/mcp.json`

**Available Claude Tools:**
- `SearchBunEnhanced` - Search Bun docs with context
- `GenerateFactoryWagerExample` - Generate code examples
- `DiagnoseError` - Error diagnosis with audit correlation
- `ValidateCode` - Code validation against best practices

**Usage Examples:**
```
Search for Bun.secrets.get documentation with secrets management context
Generate a FactoryWager-style example for Bun.file with R2 integration
Diagnose this error: "TypeError: Cannot read property" with audit history
```

## 🔧 Configuration

### Environment Variables ✅
```bash
R2_ACCOUNT_ID=7a470541a704caaf91e71efccc78fd36
R2_ACCESS_KEY_ID=a37de699062200db61373309ad166d46  
R2_SECRET_ACCESS_KEY=fe3ee8ac4ca2c44bc76c59801f9394f7d63bff0822208fe64d0d266905061681
R2_AUDIT_BUCKET=scanner-cookies
R2_BUCKET_NAME=scanner-cookies
```

### R2 Storage Structure
```
scanner-cookies/
├── mcp/diagnoses/     # Error diagnoses with fixes
├── mcp/audits/        # Audit trail entries  
├── mcp/metrics/       # Usage analytics
└── mcp/indexes/       # Search indexes
```

## 🛠️ Working Features

### ✅ R2 Storage Operations
- File upload: `bun run scripts/r2-cli.ts put-json`
- File download: `bun run scripts/r2-cli.ts get-json`
- MCP data storage: Diagnoses, audits, metrics
- Connection testing: Verified working

### ✅ MCP Server Infrastructure  
- Bun documentation server: Running
- FactoryWager tools server: Running
- Claude Desktop bridge: Configured
- Server startup: All servers accessible

### ✅ Claude Desktop Integration
- Configuration: Created and loaded
- Tool registration: Complete
- Environment variables: Passed correctly

### ⚠️ Known Limitations
- CLI color formatting issues in some tools
- List permissions limited on R2 bucket (upload/download works)
- Some interactive doc tools have formatting bugs

## 📊 Usage Examples

### Store Diagnosis in R2
```bash
# Create a diagnosis entry
cat > diagnosis.json << EOF
{
  "id": "error-001",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "error": {"name": "TypeError", "message": "Cannot read property"},
  "fix": "Add null check before accessing property",
  "confidence": 90,
  "context": "javascript"
}
EOF

# Store in R2
bun run scripts/r2-cli.ts put-json mcp/diagnoses/error-001.json diagnosis.json --env-fallback
```

### Generate FactoryWager Examples
```
Claude: "Generate a FactoryWager-style example for Bun.serve with security headers and error handling"
```

### Search with Context
```
Claude: "Search for Bun.secrets.get with enterprise security context and R2 integration patterns"
```

## 🎯 Next Steps

1. **Restart Claude Desktop** to load MCP configuration
2. **Test Claude integration** with the examples above
3. **Use R2 storage** for diagnoses and audit data
4. **Explore the available tools** in Claude Desktop

## 🔍 Troubleshooting

### Claude Desktop Issues
- Restart Claude Desktop after configuration changes
- Check `~/.config/claude/mcp.json` for correct paths
- Verify all scripts are executable

### R2 Connection Issues  
- Verify credentials in `.env` file
- Test with: `bun run scripts/r2-cli.ts put-json test.json - --env-fallback`
- Check bucket permissions if uploads fail

### CLI Tool Issues
- Some tools have color formatting bugs but are functional
- Use basic help commands: `bun run scripts/interactive-docs.ts help`
- Test R2 operations directly for reliable functionality

---

**🚀 Your FactoryWager MCP system with R2 integration is ready!**
