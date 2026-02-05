## Brief overview
This set of guidelines covers the development approach for fraud detection systems and production-grade security implementations, specifically for the Nebula-Flow™ Hardening Pack project. These guidelines focus on TypeScript/Bun development, security-first architecture, and comprehensive documentation.

## Communication style
- Be direct and technical in responses - avoid conversational filler
- Provide complete, production-ready code without stubs or placeholders
- Include comprehensive documentation alongside code changes
- Use structured checklists for task progress tracking
- Present results with clear metrics and performance indicators
- Use emojis sparingly and only for visual organization (✅, ⚠️, ❌)

## Development workflow
- Always start by exploring the existing project structure before making changes
- Create comprehensive todo lists using task_progress parameter
- Work iteratively - one tool use at a time, wait for confirmation
- Use replace_in_file for targeted changes, write_to_file for new files
- Verify file creation after each write operation
- Update task_progress checklist after each completed step
- Use attempt_completion only when all tasks are complete

## Coding best practices
- Use TypeScript with strict typing - define all interfaces explicitly
- Implement proper error handling with try-catch blocks
- Use async/await for all asynchronous operations
- Create modular, single-responsibility components
- Use environment variables for configuration (never hardcode secrets)
- Implement proper logging with structured JSON format
- Use cryptographic functions for sensitive data (UUIDs, hashing)
- Implement TTL (Time-To-Live) for cached data
- Use Redis for high-performance data storage
- Create mock implementations for external dependencies during development

## Project context
- This is a fraud detection system for payment processing
- Uses Bun runtime (v1.0+) for TypeScript execution
- Integrates with Redis for data storage
- Supports ONNX runtime for ML inference
- Requires GDPR compliance (email masking, user ID hashing)
- Targets production deployment with Docker/Kubernetes
- Performance critical: < 200ms latency requirement
- Cost savings target: $90k/year from fraud prevention

## Security-first architecture
- Always implement GDPR-compliant logging (email masking, user ID hashing)
- Use cryptographic functions for all sensitive operations
- Implement auto-retirement of compromised devices
- Use step-up authentication for high-risk transactions
- Configure risk thresholds (block: 0.85, step-up: 0.7)
- Implement rate limiting and proper error handling
- Use encrypted storage where possible
- Create audit trails with UUID trace IDs
- Never expose sensitive data in logs or responses

## Documentation standards
- Create comprehensive README files for each major component
- Include API reference documentation with examples
- Document configuration variables with descriptions
- Provide troubleshooting guides for common issues
- Include performance metrics and success criteria
- Create quick-start guides for rapid deployment
- Document architecture diagrams and data flows
- Include ROI calculations and business impact metrics

## Testing strategy
- Create unit tests for all core components
- Implement integration tests for end-to-end flows
- Use load testing tools for performance validation
- Test with realistic data volumes
- Verify Redis connectivity and data persistence
- Test error handling and edge cases
- Validate GDPR compliance in logging
- Test with both mock and production configurations

## Naming conventions
- Use PascalCase for class names and interfaces
- Use camelCase for variables and functions
- Use kebab-case for file names (e.g., nebula-harden.ts)
- Use UPPER_SNAKE_CASE for constants
- Prefix internal/private methods with underscore
- Use descriptive names that indicate purpose (e.g., calculateLegRiskScore)
- Include component names in log messages (e.g., "Orbit-Assign", "Risk-Engine")

## Configuration management
- Use .env files for environment-specific configuration
- Create .env.example with all variables documented
- Use environment variables for all external dependencies
- Implement proper validation for required configuration
- Use default values where appropriate
- Document all configuration options with examples
- Separate configuration by concern (Redis, Model, Security, Logging)

## Performance optimization
- Use Redis for high-performance data storage with TTL
- Implement caching strategies for frequently accessed data
- Use connection pooling for database operations
- Optimize algorithm complexity (O(n) where possible)
- Monitor memory usage and implement cleanup
- Use async operations for non-blocking I/O
- Implement proper error handling to avoid cascading failures
- Use structured logging for performance monitoring

## Deployment strategy
- Create one-command deployment scripts
- Implement health check endpoints
- Use Docker for containerization
- Support Kubernetes for orchestration
- Implement proper monitoring and alerting
- Use Prometheus metrics for observability
- Create backup and recovery procedures
- Document rollback procedures

## Code quality standards
- Use consistent formatting and linting
- Implement proper error handling
- Use TypeScript strict mode
- Avoid any and unknown types when possible
- Document complex algorithms with comments
- Use meaningful variable and function names
- Keep functions small and focused
- Implement proper separation of concerns

## External dependencies
- Use Bun package manager (bun add)
- Prefer native Bun APIs when available
- Use Redis for data storage
- Use ONNX runtime for ML inference
- Use SQLite for local development
- Use cryptographic functions from Node.js crypto module
- Avoid unnecessary dependencies
- Keep dependency versions pinned

## Development tools
- Use Bun runtime for execution
- Use TypeScript for type safety
- Use structured logging for debugging
- Use health check endpoints for monitoring
- Use load testing tools for performance validation
- Use environment variables for configuration
- Use version control for all changes
- Use comprehensive documentation for knowledge transfer

## Other guidelines
- Always provide complete, working code - no stubs or placeholders
- Include comprehensive documentation with every code change
- Use checklists to track progress and ensure completeness
- Test thoroughly before marking tasks complete
- Consider business impact and ROI when making architectural decisions
- Document performance metrics and success criteria
- Create reusable patterns and components
- Maintain backward compatibility when possible
- Use semantic versioning for releases
- Document breaking changes clearly