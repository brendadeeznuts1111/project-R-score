## Brief overview
  Comprehensive guidelines for enterprise-grade secrets management and cross-platform compatibility in the DuoPlus automation system, leveraging Bun's native secrets API with CRED_PERSIST_ENTERPRISE for per-user isolation.

## Secrets management architecture
  - **Bun.secrets Native Integration**: Use `Bun.secrets` as the exclusive secrets management solution. Never use custom loaders, environment variables, or external secret management systems.
  - **CRED_PERSIST_ENTERPRISE Flag**: All secrets operations must include `persist: 'CRED_PERSIST_ENTERPRISE'` for proper per-user scoping and enterprise-grade isolation.
  - **Platform-Specific Storage**: Secrets automatically utilize the most secure available storage mechanism:
    - Windows: Credential Manager with ENTERPRISE scoping
    - macOS: Keychain with USER scoping and AES-256 encryption
    - Linux: Secret Service with USER scoping
    - Fallback: Encrypted local storage for unsupported platforms

## Platform detection and validation
  - **Comprehensive Detection**: Use `utils/platform-detector.ts` for all platform capability detection and validation.
  - **Capability Assessment**: Always validate platform capabilities before using advanced features:
    ```typescript
    const capabilities = detectPlatformCapabilities();
    const compatibility = validatePlatformCompatibility();
    ```
  - **Service Naming**: Use `getScopedServiceName()` for consistent, platform-aware service naming:
    - Pattern: `{service}-{PLATFORM_SCOPE}-{team}`
    - Windows: `{service}-ENTERPRISE-{team}`
    - macOS/Linux: `{service}-USER-{team}`

## Security implementation standards
  - **Per-User Isolation**: Enforce strict per-user secret isolation to prevent cross-user access in multi-user environments.
  - **TypeScript Compliance**: Use proper error handling with `error instanceof Error` checks and type assertions for experimental features:
    ```typescript
    await secrets.set({
      service: scopedService,
      name: secretName,
      value: secretValue,
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    } as any);
    ```
  - **Zero Trust Architecture**: Never assume secrets exist; always validate and handle missing secrets gracefully.

## Development workflow requirements
  - **Platform Testing**: All secrets-related code must pass comprehensive platform capabilities tests:
    ```bash
    bun tests/platform-capabilities.test.ts
    ```
  - **Secrets Validation**: Validate per-user isolation and CRED_PERSIST_ENTERPRISE functionality:
    ```bash
    bun tests/secrets-scoping.test.ts
    ```
  - **Health Monitoring**: Implement continuous health checks for secrets infrastructure:
    ```bash
    bun monitoring/secrets-health-check.ts
    ```

## Migration and deployment
  - **Environment Migration**: Automatically migrate `.env` variables to secure storage using setup-check:
    ```bash
    bun bench/scripts/setup-check.ts
    ```
  - **Platform Validation**: Always validate platform compatibility before deployment:
    ```typescript
    const validation = validatePlatformCompatibility();
    if (!validation.compatible) {
      throw new Error(`Platform incompatible: ${validation.errors.join(', ')}`);
    }
    ```
  - **Rollback Planning**: Maintain fallback mechanisms for platform-specific feature failures.

## Monitoring and observability
  - **Health Metrics**: Track secrets storage health, platform capabilities, and scoping validation.
  - **Performance Monitoring**: Monitor secrets operation latency and throughput across platforms.
  - **Audit Trails**: Maintain comprehensive logs of all secrets operations for compliance and debugging.
  - **Alert Thresholds**: Set appropriate alerting for secrets storage failures and platform capability issues.

## Error handling and resilience
  - **Graceful Degradation**: Implement fallback strategies when platform-specific features are unavailable.
  - **Type Safety**: Use proper TypeScript typing for all error handling with unknown error types.
  - **Recovery Mechanisms**: Implement automatic recovery for transient secrets storage issues.
  - **User Guidance**: Provide clear error messages and recommendations for platform-specific issues.

## Documentation and maintenance
  - **Platform Guides**: Maintain platform-specific setup and troubleshooting documentation.
  - **API Documentation**: Keep secrets API usage examples and best practices current.
  - **Security Policies**: Regularly update security guidelines and compliance requirements.
  - **Testing Coverage**: Maintain 100% test coverage for all secrets and platform detection functionality.
