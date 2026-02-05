# Examples Directory Structure

This directory contains organized examples and demos for the Windsurf Project.

## Directory Structure

### `demos/`
Core demonstration files showcasing basic functionality:
- `simple-demo.js` - Basic functionality demo
- `deep-demo.js` - Deep console exploration demo
- `smol-demo.tsx` - Smol mode demonstration

### `console-depths/`
Console depth and debugging examples:
- `console-depth-demo.ts` - TypeScript console depth demo
- `console-depth-demo.js` - JavaScript console depth demo
- `console-depth-example.js` - Simple console depth example

### `api-servers/`
API server demonstrations and integrations:
- `cash-app-priority-demo.ts` - Cash App priority queue demo
- `duoplus-admin-demo.ts` - DuoPlus admin dashboard demo
- `duoplus-integration-demo.ts` - DuoPlus integration demo
- `genesis-phase-01-demo.ts` - Genesis phase 01 demo
- `cross-family-network-demo.ts` - Cross-family network demo
- `family-controls-demo.ts` - Family controls demo
- `suspension-risk-demo.ts` - Suspension risk demo

### `integration/`
Complex integration examples:
- `cosmic-bundle-demo.ts` - Cosmic bundle optimization demo
- `operational-dominance-demo.ts` - Operational dominance demo
- `sovereign-identity-demo.ts` - Sovereign identity demo
- `nexus-demo.ts` - Nexus integration demo
- `nexus-v2-demo.ts` - Nexus v2 demo
- `financial-warming-demo.ts` - Financial warming demo

## Running Examples

### Basic Demos
```bash
# Simple demo
bun run examples/demos/simple-demo.js

# Deep demo with console depth
bun --console-depth 10 run examples/demos/deep-demo.js

# Smol demo
bun --smol run examples/demos/smol-demo.tsx
```

### Console Depth Examples
```bash
# Console depth comparison
bun --console-depth 1 run examples/console-depths/console-depth-demo.ts
bun --console-depth 4 run examples/console-depths/console-depth-demo.ts
bun --console-depth 10 run examples/console-depths/console-depth-demo.ts
```

### API Server Demos
```bash
# Cash App Priority Demo
bun run examples/api-servers/cash-app-priority-demo.ts

# DuoPlus Admin Demo
bun run examples/api-servers/duoplus-admin-demo.ts

# Cross-Family Network Demo
bun run examples/api-servers/cross-family-network-demo.ts

# Family Controls Demo
bun run examples/api-servers/family-controls-demo.ts

# Suspension Risk Demo
bun run examples/api-servers/suspension-risk-demo.ts
```

### Integration Demos
```bash
# Cosmic Bundle Demo
bun run examples/integration/cosmic-bundle-demo.ts

# Operational Dominance Demo
bun run examples/integration/operational-dominance-demo.ts

# Sovereign Identity Demo
bun run examples/integration/sovereign-identity-demo.ts
```

## Demo Categories

### 1. Basic Functionality
- Simple API calls
- Basic configuration
- Core feature demonstration

### 2. Console Depth & Debugging
- Console depth exploration
- Debugging techniques
- Performance visualization

### 3. API Server Features
- Cash App integration
- DuoPlus administration
- Family controls
- Risk analysis
- Network management

### 4. Advanced Integrations
- Bundle optimization
- Identity management
- Financial systems
- Complex workflows

## Environment Setup

Most demos require the following environment variables:

```bash
# Copy example environment
cp .env.example .env

# Edit with your values
# CASH_APP_CLIENT_ID, CASH_APP_CLIENT_SECRET
# PLAID_CLIENT_ID, PLAID_SECRET
# DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
```

## Development Tips

1. **Start with basic demos** to understand core functionality
2. **Use console depth** for debugging complex objects
3. **Check API server demos** for integration patterns
4. **Run integration demos** for advanced workflows
5. **Always check** the required environment variables for each demo

## Contributing

When adding new examples:

1. Place in the appropriate subdirectory
2. Update this README with usage instructions
3. Include environment requirements
4. Add error handling and logging
5. Test with different console depths

## Troubleshooting

### Common Issues
- **Port conflicts**: Use different ports or check service registry
- **Environment variables**: Ensure all required variables are set
- **Dependencies**: Run `bun install` to ensure all packages are available
- **Permissions**: Some demos may require elevated permissions

### Debug Mode
Enable debug mode for detailed logging:
```bash
DEBUG=true bun run examples/[category]/[demo-file]
```
