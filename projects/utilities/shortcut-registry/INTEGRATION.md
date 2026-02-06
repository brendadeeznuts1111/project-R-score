# ShortcutRegistry Integration with WindSurf Project

This document describes how the ShortcutRegistry system is integrated with the WindSurf financial platform project.

## Overview

The ShortcutRegistry system provides keyboard shortcut management for the WindSurf project, enabling:
- **Build-time shortcut embedding** using Bun macros
- **Dashboard keyboard shortcuts** for improved UX
- **CLI integration** for shortcut management
- **Runtime shortcut handling** in browser environments

## Integration Points

### 1. CLI Integration

The WindSurf project includes a shortcuts CLI tool at:
```text
cli/shortcuts/shortcuts-cli.ts
```

**Usage:**
```bash
# List all shortcuts
bun run cli/shortcuts/shortcuts-cli.ts list

# List WindSurf-specific shortcuts
bun run cli/shortcuts/shortcuts-cli.ts windsurf

# Search shortcuts
bun run cli/shortcuts/shortcuts-cli.ts search dashboard

# Export shortcuts as JSON
bun run cli/shortcuts/shortcuts-cli.ts export
```

### 2. Runtime Integration

The ShortcutRegistry is integrated into WindSurf dashboards via:
```text
src/shortcuts/registry.ts
```

**Setup:**
```typescript
import { getShortcutRegistry, setupBrowserKeyboardHandlers } from './src/shortcuts/registry';

// Initialize registry
const registry = getShortcutRegistry();

// Setup browser keyboard handlers
setupBrowserKeyboardHandlers(registry);
```

### 3. Build-Time Macros

WindSurf uses ShortcutRegistry macros for build-time data embedding:

```typescript
import { getDefaultShortcuts } from '../../../wind/src/macros/getDefaultShortcuts.ts' with { type: 'macro' };
import { getBuildInfo } from '../../../wind/src/macros/getBuildInfo.ts' with { type: 'macro' };
```

## WindSurf-Specific Shortcuts

The following shortcuts are specific to WindSurf:

| Shortcut ID | Key Combination | Description | Category |
|------------|----------------|------------|----------|
| `dashboard.refresh` | `Ctrl/Cmd+R` | Refresh dashboard data | general |
| `dashboard.export` | `Ctrl/Cmd+E` | Export dashboard data | data |
| `risk.analyze` | `Ctrl/Cmd+A` | Run risk analysis | compliance |
| `admin.config` | `Ctrl/Cmd+,` | Open admin configuration | developer |
| `financial.process` | `Ctrl/Cmd+P` | Process financial transaction | payment |
| `kyc.validate` | `Ctrl/Cmd+K` | Validate KYC information | compliance |
| `fraud.detect` | `Ctrl/Cmd+F` | Run fraud detection | compliance |
| `pool.rebalance` | `Ctrl/Cmd+B` | Rebalance pool | payment |
| `monitor.start` | `Ctrl/Cmd+M` | Start monitoring | logs |
| `nexus.dashboard` | `Ctrl/Cmd+D` | Show Citadel dashboard | nexus |
| `nexus.metrics` | `Ctrl/Cmd+Shift+M` | Show advanced metrics | nexus |
| `nexus.telemetry.start` | `Ctrl/Cmd+Shift+T` | Start telemetry streaming | nexus |
| `nexus.vault.profiles` | `Ctrl/Cmd+Shift+V` | Show vault profiles | nexus |
| `nexus.profile.create` | `Ctrl/Cmd+Shift+N` | Create device profile | nexus |

## Dashboard Integration

### HTML Dashboard Setup

Add to your dashboard HTML files:

```html
<script type="module">
  import { getShortcutRegistry, setupBrowserKeyboardHandlers } from './src/shortcuts/registry.ts';
  
  const registry = getShortcutRegistry();
  setupBrowserKeyboardHandlers(registry);
  
  // Listen for shortcut events
  registry.on('shortcut:triggered', (event) => {
    console.log('Shortcut triggered:', event.shortcutId);
    
    // Handle specific shortcuts
    switch(event.shortcutId) {
      case 'dashboard.refresh':
        refreshDashboard();
        break;
      case 'dashboard.export':
        exportDashboard();
        break;
      // ... more handlers
    }
  });
</script>
```

### React/Component Integration

```typescript
import { useEffect } from 'react';
import { getShortcutRegistry } from './src/shortcuts/registry';

export function Dashboard() {
  useEffect(() => {
    const registry = getShortcutRegistry();
    
    const handleRefresh = () => {
      // Refresh logic
    };
    
    registry.on('shortcut:triggered', (event) => {
      if (event.shortcutId === 'dashboard.refresh') {
        handleRefresh();
      }
    });
    
    return () => {
      registry.off('shortcut:triggered', handleRefresh);
    };
  }, []);
  
  return <div>Dashboard Content</div>;
}
```

## Build Integration

### Using Macros in Build Process

**Note:** If the WindSurf project is in a separate directory or git submodule, you may need to:
1. Copy the macros directory to the WindSurf project, or
2. Use a symlink, or
3. Install ShortcutRegistry as a package dependency

**Option 1: Copy macros (Recommended for submodules)**

```bash
# From windsurf-project directory
cp -r ../../wind/src/macros ./src/shortcuts/macros
```

Then update imports:
```typescript
import { validateShortcuts } from './src/shortcuts/macros/validateShortcuts.ts' with { type: 'macro' };
```

**Option 2: Standalone validation (No macros)**

The CLI can work without macros by importing the registry directly:

```typescript
import { ShortcutRegistry } from '../../../../wind/src/core/registry';
// Validate shortcuts at runtime instead of build-time
```

### Build-Time Validation

Shortcuts are validated at build-time using macros (if macros are available):

```typescript
import { validateShortcuts } from './src/shortcuts/macros/validateShortcuts.ts' with { type: 'macro' };

// This will fail the build if shortcuts are invalid
validateShortcuts();
```

## Configuration

### Environment Variables

No additional environment variables needed. The integration uses the same database configuration as the main ShortcutRegistry.

### Customization

To add custom shortcuts for WindSurf:

1. Add to `WINDSURF_SHORTCUTS` in `src/shortcuts/registry.ts`
2. Register handlers in `registerWindSurfKeyboardHandlers()`
3. Update CLI tool if needed

## Testing

### Test Shortcuts CLI

```bash
# Test all commands
bun run cli/shortcuts/shortcuts-cli.ts list
bun run cli/shortcuts/shortcuts-cli.ts windsurf
bun run cli/shortcuts/shortcuts-cli.ts search risk
```

### Test Browser Integration

1. Open a WindSurf dashboard
2. Press keyboard shortcuts
3. Verify events are triggered
4. Check browser console for shortcut events

## Troubleshooting

### Macros Not Working

If macros aren't executing:
1. Ensure you're using `with { type: 'macro' }` import syntax
2. Check that paths to wind project are correct
3. Verify Bun version supports macros (>=1.0.0)

### Shortcuts Not Triggering

If shortcuts don't trigger in browser:
1. Verify `setupBrowserKeyboardHandlers()` is called
2. Check browser console for errors
3. Ensure event listeners are registered
4. Verify shortcut IDs match registered shortcuts

### Build Failures

If build fails:
1. Run `bun run cli/shortcuts/shortcuts-cli.ts validate`
2. Check for duplicate shortcut IDs
3. Verify all shortcuts have required fields
4. Check macro import paths

## API Integration

### ShortcutRegistry API Endpoints

The config server now includes full ShortcutRegistry API endpoints:

- `GET /api/shortcuts` - List all shortcuts
- `GET /api/shortcuts/:id` - Get specific shortcut
- `POST /api/shortcuts` - Register new shortcut
- `DELETE /api/shortcuts/:id` - Unregister shortcut
- `GET /api/profiles` - List all profiles
- `GET /api/profiles/active` - Get active profile
- `POST /api/profiles` - Create new profile
- `PUT /api/profiles/:id/active` - Set active profile
- `GET /api/conflicts` - Detect conflicts
- `GET /api/stats/usage` - Get usage statistics

### WindSurf Action API Endpoints

All shortcuts now call real API endpoints:

- `POST /api/actions/dashboard/refresh` - Refresh dashboard data
- `POST /api/actions/dashboard/export` - Export dashboard data
- `POST /api/actions/risk/analyze` - Run risk analysis
- `GET /api/actions/admin/config` - Get admin configuration
- `POST /api/actions/financial/process` - Process financial transaction
- `POST /api/actions/compliance/kyc/validate` - Validate KYC
- `POST /api/actions/compliance/fraud/detect` - Detect fraud
- `POST /api/actions/pools/rebalance` - Rebalance pools
- `POST /api/actions/monitoring/start` - Start monitoring

### Dashboard Data Endpoints

- `GET /api/dashboard/data` - Get current dashboard data
- `GET /api/dashboard/metrics` - Get dashboard metrics
- `GET /api/dashboard/status` - Get dashboard status

### Using the API Client

The project includes a TypeScript API client at `src/api/shortcuts-api.ts`:

```typescript
import api from './src/api/shortcuts-api';

// Refresh dashboard
const result = await api.dashboard.refresh();
if (result.success) {
  console.log('Dashboard refreshed:', result.data);
}

// Run risk analysis
const riskResult = await api.risk.analyze();

// Validate KYC
const kycResult = await api.compliance.validateKYC('user-123');
```

### Browser Integration

The `pages/shortcuts.js` file now automatically calls API endpoints when shortcuts are triggered. No additional setup required - shortcuts work out of the box.

**Example:**
```javascript
// Pressing Ctrl/Cmd+R triggers:
// 1. Keyboard event detected
// 2. API call to /api/actions/dashboard/refresh
// 3. Dashboard data refreshed
// 4. Visual feedback shown
```

### Service Dependencies

The integration uses the following WindSurf services:

- `KYCValidator` - For KYC validation endpoints
- `PoolRebalancingEngine` - For pool rebalancing endpoints
- `EnhancedLightningToGreenRouter` - For financial processing endpoints

All services are initialized automatically when the config server starts.

### API Documentation

Complete API documentation is available at:
- [API Documentation](eeeeee/CascadeProjects/windsurf-project/src/api/README.md)

## Troubleshooting API Calls

### API Endpoints Not Responding

1. Verify the config server is running: `bun run src/admin/config-server.ts`
2. Check server logs for errors
3. Verify CORS headers are set correctly
4. Check browser console for network errors

### Shortcuts Not Calling APIs

1. Verify `pages/shortcuts.js` is included in your HTML
2. Check browser console for JavaScript errors
3. Verify API endpoints are accessible (test with curl)
4. Check network tab in browser dev tools

### Service Errors

If service endpoints return errors:

1. Check service initialization in config-server.ts
2. Verify service dependencies are available
3. Check service logs for detailed error messages
4. Verify request/response formats match API documentation

## Nexus Integration

### Nexus Shortcuts

The following shortcuts are specific to the Nexus system (Citadel Dashboard, Metrics, Telemetry, Vault, Profile Factory):

| Shortcut ID | Key Combination | Description | Category |
|------------|----------------|------------|----------|
| `nexus.dashboard` | `Ctrl/Cmd+D` | Show Citadel dashboard | nexus |
| `nexus.metrics` | `Ctrl/Cmd+Shift+M` | Show advanced metrics | nexus |
| `nexus.telemetry.start` | `Ctrl/Cmd+Shift+T` | Start telemetry streaming | nexus |
| `nexus.vault.profiles` | `Ctrl/Cmd+Shift+V` | Show vault profiles | nexus |
| `nexus.profile.create` | `Ctrl/Cmd+Shift+N` | Create device profile | nexus |

### Nexus API Endpoints

All nexus operations are available via API endpoints:

#### Dashboard Endpoints
- `GET /api/nexus/dashboard` - Get Citadel dashboard matrix
- `POST /api/nexus/dashboard/refresh` - Refresh dashboard data
- `POST /api/nexus/dashboard/export` - Export dashboard data (format: json/csv)
- `GET /api/nexus/dashboard/metrics` - Get dashboard metrics
- `GET /api/nexus/dashboard/device/:deviceId` - Get device status

#### Metrics Endpoints
- `GET /api/nexus/metrics/advanced` - Get advanced metrics report
- `GET /api/nexus/metrics/packages` - Get package registry metrics
- `GET /api/nexus/metrics/typescript` - Get TypeScript metrics
- `GET /api/nexus/metrics/security` - Get security metrics
- `GET /api/nexus/metrics/comprehensive` - Get comprehensive report

#### Telemetry Endpoints
- `POST /api/nexus/telemetry/start` - Start log streaming for device
- `POST /api/nexus/telemetry/stop` - Stop log streaming
- `GET /api/nexus/telemetry/status/:deviceId` - Get streaming status
- `GET /api/nexus/telemetry/metrics/:deviceId` - Get real-time metrics

#### Vault Endpoints
- `GET /api/nexus/vault/profiles` - Get all profiles
- `GET /api/nexus/vault/profile/:deviceId` - Get specific profile
- `POST /api/nexus/vault/profile` - Save/create profile
- `POST /api/nexus/vault/profile/:deviceId/burn` - Burn/archive profile
- `GET /api/nexus/vault/search` - Search profiles (query params)
- `GET /api/nexus/vault/stats` - Get vault statistics
- `POST /api/nexus/vault/verify/:deviceId` - Verify profile integrity

#### Profile Factory Endpoints
- `POST /api/nexus/profile/create` - Create device identity
- `POST /api/nexus/profile/provision` - Provision device
- `GET /api/nexus/profile/options` - Get generation options

### Using Nexus API Client

```typescript
import api from './src/api/shortcuts-api';

// Get Citadel dashboard
const dashboard = await api.nexus.dashboard.get();

// Get advanced metrics
const metrics = await api.nexus.metrics.advanced();

// Start telemetry streaming
const telemetry = await api.nexus.telemetry.start('device-123', './logs/telemetry.log');

// Get vault profiles
const profiles = await api.nexus.vault.getProfiles();

// Create device profile
const profile = await api.nexus.profile.create('device-123', {
  iccid: '1234567890',
  number: '+1234567890',
  carrier: 'default',
  country: 'US'
});
```

## See Also

- [ShortcutRegistry Documentation](../README.md)
- [Macros Documentation](../src/macros/README.md)
- [CLI Documentation](../src/cli/README.md)
- [API Documentation](eeeeee/CascadeProjects/windsurf-project/src/api/README.md)
- [WindSurf Project README](eeeeee/CascadeProjects/windsurf-project/README.md)
