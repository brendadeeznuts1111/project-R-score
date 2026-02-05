# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue in DuoPlus Scoping Matrix, please report it to us as follows:

### Contact

**Please DO NOT report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities by emailing:
- **security@duoplus.com**

You should receive a response within 24 hours. If you don't receive a response within 48 hours, please follow up with another email.

### What to Include

When reporting a security vulnerability, please include:

1. **Description**: A clear description of the vulnerability
2. **Impact**: What an attacker could achieve by exploiting this vulnerability
3. **Steps to Reproduce**: Detailed steps to reproduce the issue
4. **Environment**: Your environment details (OS, Bun version, etc.)
5. **Proof of Concept**: If possible, include a proof of concept
6. **Suggested Fix**: If you have suggestions for fixing the issue

### Our Process

1. **Acknowledgment**: We'll acknowledge receipt of your report within 24 hours
2. **Investigation**: We'll investigate the issue and determine its severity
3. **Updates**: We'll provide regular updates on our progress (at least weekly)
4. **Fix**: We'll develop and test a fix
5. **Disclosure**: We'll coordinate disclosure with you
6. **Release**: We'll release the fix and publish a security advisory

### Responsible Disclosure

We kindly ask that you:

- Give us reasonable time to fix the issue before public disclosure
- Avoid accessing or modifying user data
- Avoid disrupting our services
- Don't perform DoS attacks or degrade services

### Recognition

We appreciate security researchers who help keep our users safe. With your permission, we'll acknowledge your contribution in our security advisory.

## Security Best Practices

### For Users

- Keep your Bun runtime updated to the latest stable version
- Use environment variables for sensitive configuration
- Regularly audit your scoping matrix configuration
- Monitor compliance logs for unusual activity
- Use HTTPS in production environments

### For Contributors

- Run the full test suite before submitting changes
- Follow secure coding practices
- Validate input data thoroughly
- Use parameterized queries for database operations
- Implement proper error handling without information leakage

## Known Security Considerations

### Scoping Matrix Configuration

The scoping matrix configuration (`data/scopingMatrix.json`) contains sensitive business logic. Ensure:

- File permissions are restricted (readable by application only)
- Configuration is validated on startup
- Changes are audited and approved
- Backup configurations are securely stored

### Environment Variables

Sensitive configuration should use environment variables:

```bash
# Good: Environment variables
export DUOPLUS_API_KEY="your-key-here"

# Avoid: Hardcoded values
const apiKey = "your-key-here";
```

### Network Security

- Use HTTPS for all production deployments
- Implement proper CORS policies
- Rate limiting is built-in but can be customized
- Audit logs capture all API access

### Compliance Validation

The system includes comprehensive compliance validation:

- Feature gating based on scope
- Integration access control
- Usage limit enforcement
- Audit trail generation

## Security Updates

Security updates will be:

- Released as patch versions (1.0.x)
- Documented in release notes
- Announced through our security mailing list
- Published as GitHub Security Advisories

## Contact

For security-related questions or concerns:
- **Email**: security@duoplus.com
- **PGP Key**: Available at https://duoplus.com/security/pgp-key.asc

Thank you for helping keep DuoPlus and our users secure! 🔒