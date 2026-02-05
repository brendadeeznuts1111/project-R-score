# 🔧 Naming Convention Refactoring Plan

## Current Issues
- Inconsistent file naming (validator.ts vs config-validator.ts)
- Generic class names (ProxyHeaderError)
- Short function names (logWarn, logError)
- Unclear component responsibilities

## Proposed Improvements

### File Naming (Consistent, Clear, Memorable)
```
Current → Proposed
validator.ts → header-validation-engine.ts
config-validator.ts → config-state-validator.ts
dns.ts → dns-cache-resolver.ts
middleware.ts → proxy-request-middleware.ts
enhanced-http-proxy.ts → enhanced-proxy-server.ts
headers.ts → proxy-header-constants.ts
http-connect.ts → connect-tunnel-handler.ts
```

### Class Naming (Descriptive, Clear)
```
Current → Proposed
ProxyHeaderError → InvalidProxyHeaderError
ValidationResult → HeaderValidationResult
ValidationMetrics → HeaderValidationMetrics
DNSMetrics → DnsCacheMetrics
```

### Function Naming (Clear, Concise but not Short)
```
Current → Proposed
validateProxyHeader → validateProxyHeaderValue
validateProxyToken → validateProxyTokenSignature
resolveProxy → resolveProxyHostnameWithCache
warmupDNSCache → prepopulateDnsCache
handleProxyConnect → handleConnectTunnelRequest
```

### Interface/Type Naming (Clear Purpose)
```
Current → Proposed
ValidationResult → HeaderValidationResult
ProxyHeaderError → InvalidProxyHeaderError
```

## Implementation Priority
1. File renaming and reorganization
2. Class and interface renaming
3. Function and method renaming
4. Update all imports and references
5. Update documentation
