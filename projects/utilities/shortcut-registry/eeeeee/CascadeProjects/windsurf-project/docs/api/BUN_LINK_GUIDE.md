# Bun Link Demonstration

## Overview
`bun link` allows you to link local packages for development, similar to `npm link` but faster and more efficient.

## Basic Usage

### Step 1: Register a local package
```bash
cd /path/to/cool-pkg
bun link
```

**Output:**
```
bun link v1.3.3 (7416672e)
Success! Registered "cool-pkg"

To use cool-pkg in a project, run:
  bun link cool-pkg

Or add it in dependencies in your package.json file:
  "cool-pkg": "link:cool-pkg"
```

### Step 2: Link to your project
```bash
cd /path/to/my-app
bun link cool-pkg
```

### Step 3: Update package.json (optional with --save)
```bash
bun link cool-pkg --save
```

**package.json:**
```json
{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "cool-pkg": "link:cool-pkg"
  }
}
```

## Real-World Example: Enhanced Fraud Detection System

### Link our enhanced components locally:

```bash
# Register our enhanced fraud detection package
cd /Users/nolarose/wind/eeeeee/CascadeProjects/windsurf-project
bun link

# Output:
# bun link v1.3.3 (7416672e)
# Success! Registered "windsurf-project"
```

### Use in another project:
```bash
cd /path/to/my-fraud-app
bun link windsurf-project --save
```

**package.json:**
```json
{
  "name": "my-fraud-app",
  "version": "1.0.0",
  "dependencies": {
    "windsurf-project": "link:windsurf-project"
  }
}
```

### Import and use enhanced components:
```typescript
import { EnhancedAIModel } from 'windsurf-project/ai/enhanced-ai-model.ts';
import { RealTimeFraudDetector } from 'windsurf-project/ai/realtime-fraud-detector.ts';

const aiModel = new EnhancedAIModel();
const fraudDetector = new RealTimeFraudDetector();

// Use enhanced fraud detection capabilities
const prediction = await aiModel.predict(transactionFeatures);
await fraudDetector.ingestEvent(transactionEvent);
```

## Benefits of Bun Link

1. **Speed**: Faster than npm link
2. **Efficiency**: Uses symlinks instead of copying
3. **Development**: Perfect for local package development
4. **Testing**: Test local changes without publishing
5. **Monorepos**: Great for multi-package projects

## Advanced Usage

### Multiple Packages
```bash
# Register multiple packages
cd packages/enhanced-ai && bun link
cd packages/network-optimizer && bun link
cd packages/monitoring && bun link

# Link all to main project
cd main-app
bun link enhanced-ai network-optimizer monitoring --save
```

### Unlinking
```bash
# Remove link from project
bun unlink cool-pkg

# Or remove from package.json
bun remove cool-pkg
```

### Check Links
```bash
# See all registered packages
bun link --list

# Check if a package is linked
bun link --check cool-pkg
```

## Troubleshooting

### Common Issues:
1. **Permission denied**: Run with appropriate permissions
2. **Package not found**: Ensure package is registered first
3. **Version conflicts**: Check package.json versions
4. **Broken symlinks**: Re-link the package

### Solutions:
```bash
# Re-register package
cd /path/to/cool-pkg
bun link --force

# Clear cache and relink
rm -rf node_modules bun.lockb
bun install
bun link cool-pkg
```

## Best Practices

1. **Use during development**: Perfect for testing local changes
2. **Version control**: Don't commit link: dependencies to production
3. **Documentation**: Document linked packages for team members
4. **Testing**: Test thoroughly before publishing
5. **Cleanup**: Remove links before deployment

## Integration with Our Enhanced System

Our enhanced fraud detection system can be linked as:

```bash
# Register the enhanced system
cd /Users/nolarose/wind/eeeeee/CascadeProjects/windsurf-project
bun link

# Use in development app
cd /path/to/dev-app
bun link windsurf-project --save

# Import enhanced features
import { 
  EnhancedAIModel,
  EnhancedNetworkOptimizer,
  RealTimeFraudDetector,
  AdvancedSecuritySystem,
  MonitoringAlertingSystem
} from 'windsurf-project';
```

This allows you to develop and test the enhanced fraud detection capabilities locally before publishing to npm.
