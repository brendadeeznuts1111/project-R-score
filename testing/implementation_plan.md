# Implementation Plan

[Overview]
The goal is to enhance and review the Dev HQ codebase to improve reliability, observability, and integration.

This plan focuses on centralizing configuration, enhancing proxy validation, upgrading system resilience with retry logic, and implementing a real-time metrics bridge via WebSockets. These changes will build upon the existing Bun 1.2+ optimized architecture to provide a more robust and observable enterprise phone management system.

[Types]
The type system will be updated to support detailed metrics and system status broadcasting.

- `MetricsData`: Updated interface in `dashboard/components/MetricsDisplay.tsx` to include detailed proxy and system resource information.
- `ValidationResult`: Updated in `src/proxy/validator.ts` to support more granular error reporting.
- `SystemLimits`: Defined in `src/config.ts` to centralize thresholds and retry settings.

[Files]
Updates to existing files and creation of missing infrastructure.

- `src/config.ts`: Modify to centralize all system configurations, limits, and ports.
- `src/proxy/middleware.ts`: Modify to use centralized config and improved error handling.
- `src/proxy/validator.ts`: Modify to implement case-insensitive header validation and detailed logging.
- `src/proxy/dns.ts`: Modify to use centralized DNS configuration.
- `src/systems/phone-system.ts`: Modify to implement retry logic and connectivity checks.
- `src/index.ts`: Modify to export the new `startMetricsBridge` WebSocket server.
- `dashboard/components/MetricsDisplay.tsx`: Modify to connect to the real-time WebSocket metrics feed.
- `test-proxy.ts`: Update to launch the metrics bridge during server startup.
- `src/utils/s3-client.ts`: Create (if missing) to provide necessary S3/R2 mock functionality.
- `tests/system_resilience.test.ts`: Create to verify the new resilience behaviors.
- `bunfig.toml`: Update test preload paths to ensure reliability.

[Functions]
Key function modifications and new additions.

- `startMetricsBridge`: New function in `src/index.ts` to broadcast system health.
- `validateProxyHeader`: Modified in `src/proxy/validator.ts` for case-insensitivity.
- `captureScreenshot`: Modified in `src/systems/phone-system.ts` with intelligent retry logic.
- `installApp`: Modified in `src/systems/phone-system.ts` with retry logic.
- `checkConnection`: New function in `src/systems/phone-system.ts` for pre-operation health checks.

[Classes]
Enhancements to core management classes.

- `PhoneSystem`: Upgraded with localized error logging and resilience features.
- `DNSCache`: Improved with deterministic IP generation and hit tracking.
- `S3Manager`: Modernized with support for memory-efficient streaming (mocked).

[Dependencies]
No new external dependencies are required; the implementation leverages native Bun 1.2+ APIs.

[Implementation Order]
The changes will be applied from the core configuration outwards to the UI.

1. Centralize settings in `src/config.ts`.
2. Update Proxy and DNS modules to consume centralized settings.
3. Enhance `PhoneSystem` resilience and missing infrastructure.
4. Implement the WebSocket Metrics Bridge in the core index.
5. Update Dashboard components to consume the live feed.
6. Verify with the new system resilience test suite.

task_progress Items:
- [ ] Centralize configuration in src/config.ts
- [ ] Enhance Proxy Validation logic
- [ ] Implement Resilient PhoneSystem logic
- [ ] Implement WebSocket Metrics Bridge
- [ ] Modernize Dashboard with real-time updates
- [ ] Verify system with resilience tests
