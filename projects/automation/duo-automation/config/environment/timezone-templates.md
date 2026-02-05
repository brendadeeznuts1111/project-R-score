# Environment Configuration Templates

## Enterprise Environment (.env.enterprise)
```env
# Scope Configuration
DASHBOARD_SCOPE=ENTERPRISE
SCOPE_TIMEZONE=America/New_York

# Timezone Behavior
# - All Date objects will use America/New_York (-05:00)
# - DST flag: true (but no calculation in v3.7)
# - Validated against TIMEZONE_MATRIX at startup
```

## Development Environment (.env.development)
```env
# Scope Configuration  
DASHBOARD_SCOPE=DEVELOPMENT
SCOPE_TIMEZONE=Europe/London

# Timezone Behavior
# - All Date objects will use Europe/London (+00:00)
# - DST flag: true (but no calculation in v3.7)
# - Validated against TIMEZONE_MATRIX at startup
```

## Local Sandbox (.env.local)
```env
# Scope Configuration
DASHBOARD_SCOPE=LOCAL-SANDBOX  
SCOPE_TIMEZONE=UTC

# Timezone Behavior
# - All Date objects will use UTC (+00:00)
# - DST flag: false
# - Perfect for deterministic testing
```

## Usage in Application

```ts
// main.ts or entrypoint
import { validateAndSetTimezone } from './bootstrap-timezone';

// Validate and set timezone at startup
const tzConfig = validateAndSetTimezone();

// Now all Date objects respect the validated timezone
console.log(new Date().toString()); // Shows time in configured timezone
```

## CI/CD Integration

```yaml
# .github/workflows/timezone-validation.yml
- name: Validate Timezone Configuration
  run: |
    # Test enterprise timezone
    SCOPE_TIMEZONE=America/New_York bun run bootstrap-timezone.ts
    
    # Test development timezone  
    SCOPE_TIMEZONE=Europe/London bun run bootstrap-timezone.ts
    
    # Test invalid timezone (should fail)
    ! SCOPE_TIMEZONE=Invalid/Zone bun run bootstrap-timezone.ts
```
