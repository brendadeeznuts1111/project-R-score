# Feature Flags Documentation

## Overview

The Foxy Proxy application uses a compile-time feature flag system to conditionally enable/disable features. This allows for different build configurations without runtime overhead.

## Available Feature Flags

### Core Features

- `DEBUG` - Enables debug logging and development tools
- `DEVELOPER_MODE` - Shows developer tools sections in UI
- `PRODUCTION_MODE` - Enables production optimizations
- `TEST_MODE` - Enables test-specific configurations

### Platform Features

- `DUOPLUS_ENABLED` - Enables DuoPlus cloud phone functionality
- `ENHANCED_TEMPLATES` - Enables enhanced template system
- `BETA_FEATURES` - Enables beta features for testing

### Advanced Features

- `PERFORMANCE_PROFILING` - Enables performance monitoring
- `MONITORING` - Enables application monitoring
- `ADVANCED_ANALYTICS` - Enables advanced analytics features
- `WHITE_LABEL` - Enables white-label customization
- `MOCK_API` - Enables API mocking for testing

## Usage in Components

### Import Feature Flags

```typescript
import {
  isDebugMode,
  isDeveloperMode,
  isDuoPlusEnabled,
  areEnhancedTemplatesEnabled,
  areBetaFeaturesEnabled,
  debugLog,
  profilePerformance
} from "../../utils/feature-flags";
```

### Conditional Rendering

```typescript
// Show component only if feature is enabled
if (!isDuoPlusEnabled()) {
  return <FeatureNotAvailable feature="DuoPlus" />;
}

// Show developer tools only in developer mode
{isDeveloperMode() && <DeveloperTools />}
```

### Debug Logging

```typescript
// Only logs if debug mode is enabled
debugLog("Loading data...", data);

// Performance profiling
await profilePerformance("operation-name", async () => {
  // Your code here
});
```

## Feature Flag Functions

### Boolean Checks

- `isDebugMode()` - Returns true if debug mode is enabled
- `isDeveloperMode()` - Returns true if developer mode is enabled
- `isProductionMode()` - Returns true if production mode is enabled
- `isDuoPlusEnabled()` - Returns true if DuoPlus is enabled
- `areEnhancedTemplatesEnabled()` - Returns true if enhanced templates are enabled
- `areBetaFeaturesEnabled()` - Returns true if beta features are enabled

### Utility Functions

- `debugLog(message, ...data)` - Logs message if debug mode is enabled
- `profilePerformance(name, fn)` - Profiles function execution time
- `withFeature(condition, fn)` - Executes function only if condition is true

## Implementation Details

### Feature Flag Definition

Feature flags are defined in `src/utils/feature-flags.ts`:

```typescript
const FEATURE_FLAGS = {
  DEBUG: import.meta.env.VITE_DEBUG === "true",
  DEVELOPER_MODE: import.meta.env.VITE_DEVELOPER_MODE === "true"
  // ... other flags
};
```

### Environment Variables

Set feature flags using environment variables:

- `VITE_DEBUG=true` - Enable debug mode
- `VITE_DEVELOPER_MODE=true` - Enable developer mode
- `VITE_DUOPLUS_ENABLED=true` - Enable DuoPlus features

### Build Configurations

Different build configurations can be created by setting different environment variables:

#### Development Build

```bash
VITE_DEBUG=true
VITE_DEVELOPER_MODE=true
VITE_DUOPLUS_ENABLED=true
VITE_ENHANCED_TEMPLATES=true
```

#### Production Build

```bash
VITE_PRODUCTION_MODE=true
VITE_DUOPLUS_ENABLED=true
VITE_ENHANCED_TEMPLATES=true
VITE_MONITORING=true
```

## Best Practices

### 1. Use Type Guards

When checking optional properties on templates, use type guards:

```typescript
if ("socialMedia" in template && template.socialMedia) {
  // Safe to access template.socialMedia
}
```

### 2. Provide Fallbacks

Always provide fallbacks for disabled features:

```typescript
const features = isDuoPlusEnabled() ? duoPlusFeatures : basicFeatures;
```

### 3. Debug Information

Include debug information in developer mode:

```typescript
{isDeveloperMode() && (
  <div className="debug-info">
    <p>Feature Flags:</p>
    <p>• DEBUG: {isDebugMode() ? '✅' : '❌'}</p>
    <p>• DUOPLUS: {isDuoPlusEnabled() ? '✅' : '❌'}</p>
  </div>
)}
```

### 4. Performance Considerations

Feature flags are resolved at build time, so there's no runtime overhead:

```typescript
// This gets compiled away if DEBUG is false
if (isDebugMode()) {
  console.log("Debug info");
}
```

## Testing Feature Flags

### Mock Feature Flags for Testing

```typescript
// In your test setup
vi.mock("../../utils/feature-flags", () => ({
  isDebugMode: () => true,
  isDeveloperMode: () => true,
  isDuoPlusEnabled: () => true
}));
```

### Test Different Configurations

```typescript
test("shows feature when enabled", () => {
  vi.mocked(isDuoPlusEnabled).mockReturnValue(true);
  // Test component with feature enabled
});

test("hides feature when disabled", () => {
  vi.mocked(isDuoPlusEnabled).mockReturnValue(false);
  // Test component with feature disabled
});
```

## Migration Guide

### Adding New Feature Flags

1. Add flag to `FEATURE_FLAGS` object in `src/utils/feature-flags.ts`
2. Create helper function if needed:
   ```typescript
   export const isNewFeatureEnabled = () => FEATURE_FLAGS.NEW_FEATURE;
   ```
3. Use flag in components:
   ```typescript
   if (isNewFeatureEnabled()) {
     return <NewFeature />;
   }
   ```
4. Add environment variable to `.env` files:
   ```
   VITE_NEW_FEATURE=true
   ```
5. Update documentation

### Removing Feature Flags

1. Remove flag from `FEATURE_FLAGS` object
2. Remove helper functions
3. Update component logic to remove conditional code
4. Remove environment variables
5. Update documentation

## Troubleshooting

### Feature Not Working

1. Check if environment variable is set correctly
2. Verify flag is defined in `FEATURE_FLAGS` object
3. Check if helper function exists and returns correct value
4. Ensure component is importing and using the flag correctly

### Build Issues

1. Check for typos in environment variable names
2. Verify `.env` files are in the correct location
3. Ensure Vite is reading environment variables correctly

### Type Errors

1. Make sure to import feature flags from correct path
2. Use proper type guards for optional properties
3. Check TypeScript configuration for environment variables

## Examples

### Complete Component Example

```typescript
import { isDuoPlusEnabled, isDeveloperMode, debugLog } from '../../utils/feature-flags';

export const MyComponent = () => {
  // Feature not available message
  if (!isDuoPlusEnabled()) {
    return (
      <div className="feature-unavailable">
        <h3>DuoPlus Not Available</h3>
        <p>This feature is not enabled in your current build.</p>
        {isDeveloperMode() && (
          <p className="debug-hint">Set VITE_DUOPLUS_ENABLED=true to enable</p>
        )}
      </div>
    );
  }

  // Component logic
  debugLog('MyComponent rendering with DuoPlus enabled');

  return (
    <div>
      {/* Component content */}
      {isDeveloperMode() && (
        <div className="debug-panel">
          <p>DuoPlus Features: Active</p>
        </div>
      )}
    </div>
  );
};
```

This feature flag system provides a clean, type-safe way to manage different build configurations while maintaining excellent performance and developer experience.
