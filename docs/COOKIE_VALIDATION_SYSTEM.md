# Cookie Validation System v3.24 - RFC 6265 Compliance

## 🎯 Overview

The Cookie Validation System provides comprehensive, RFC 6265 compliant validation for all cookie properties with detailed error reporting, sanitization, and security enforcement. It ensures that all cookies created by the system are secure, compliant, and browser-compatible.

## 📋 Property Validation Rules

### 🏷️ Name (Required)
- **Type**: `string`
- **Validation Rules**:
  - RFC 6265: No control characters allowed
  - Maximum 4096 characters
  - No reserved prefixes (`__Secure-`, `__Host-`) without secure flag
  - No invalid characters (spaces, semicolons, commas)
- **Sanitization**: Truncates to 4096 characters if needed
- **Error Examples**:
  - Empty name: "Cookie name is required"
  - Control chars: "Cookie name contains control characters"
  - Reserved prefix: "Cookie name uses reserved prefix '__Secure-'"

### 📝 Value (Required)
- **Type**: `string`
- **Validation Rules**:
  - RFC 6265: No control characters allowed
  - Maximum 4096 characters
- **Sanitization**: Truncates to 4096 characters if needed
- **Error Examples**:
  - Empty value: "Cookie value is required"
  - Control chars: "Cookie value contains control characters"

### 🌐 Domain (Optional)
- **Type**: `string | null`
- **Default**: `null`
- **Validation Rules**:
  - Valid domain format (RFC 1035)
  - Warning for leading dot
  - Warning for IP addresses
- **Error Examples**:
  - Invalid format: "Invalid domain format"
- **Warning Examples**:
  - Leading dot: "Domain starts with leading dot"
  - IP address: "Using IP address as domain"

### 📁 Path (Optional)
- **Type**: `string`
- **Default**: `"/"`
- **Validation Rules**:
  - Must start with `/`
  - No double slashes
  - Warning for problematic characters (`?`, `#`)
- **Sanitization**: Adds leading slash, removes double slashes
- **Error Examples**:
  - No leading slash: "Path must start with /"
  - Double slashes: "Path contains double slashes"

### ⏰ Expires (Optional)
- **Type**: `number | Date | undefined`
- **Default**: `undefined`
- **Validation Rules**:
  - Must not be in the past
  - Warning for Y2038 limit (32-bit systems)
- **Error Examples**:
  - Past date: "Expires date is in the past"
- **Warning Examples**:
  - Y2038: "Expires date exceeds Y2038 limit"

### 🔒 Secure (Optional)
- **Type**: `boolean`
- **Default**: `false`
- **Validation Rules**:
  - Required in production environment
  - Required for `__Secure-` prefixed cookies
- **Error Examples**:
  - Production: "Secure flag is required in production"
  - Reserved prefix: "Secure flag required for __Secure- prefixed cookies"

### 🔗 SameSite (Optional)
- **Type**: `"strict" | "lax" | "none"`
- **Default**: Browser default
- **Validation Rules**:
  - Must be one of valid values
  - `"none"` requires `secure=true`
- **Error Examples**:
  - Invalid value: "sameSite must be one of: strict, lax, none"
  - Missing secure: "sameSite='none' requires secure=true"

### 🧩 Partitioned (Optional)
- **Type**: `boolean`
- **Default**: `false`
- **Validation Rules**:
  - Requires `secure=true`
  - Suggests `sameSite="none"`
  - Warning for browser support (CHIPS API)
- **Error Examples**:
  - Missing secure: "Partitioned cookies require secure=true"
- **Warning Examples**:
  - Browser support: "Partitioned cookies (CHIPS API) have limited browser support"

### ⏱️ MaxAge (Optional)
- **Type**: `number | undefined`
- **Default**: `undefined`
- **Validation Rules**:
  - Must be positive
  - Warning for values > 1 year
- **Error Examples**:
  - Negative: "maxAge must be positive"
- **Warning Examples**:
  - Large value: "maxAge exceeds 1 year"

### 🔒 HttpOnly (Optional)
- **Type**: `boolean`
- **Default**: `false`
- **Validation Rules**:
  - Recommended for auth/session cookies
- **Note**: No errors, but recommendations provided

## 🔧 Cross-Property Validations

### Total Size Limit
- **Rule**: Total cookie size cannot exceed 4096 bytes
- **Calculation**: `name.length + value.length + 100` (rough estimate)
- **Error**: "Total cookie size exceeds 4096 bytes"

### Expires vs MaxAge Conflict
- **Rule**: Cannot set both `expires` and `maxAge`
- **Warning**: "Both expires and maxAge are set"
- **Note**: `maxAge` takes precedence if both are set

## 🚨 Error Severity Levels

### Critical
- Blocks cookie creation entirely
- Examples: Missing required fields, security violations
- Action: Must be fixed before cookie can be created

### Error
- Violates RFC 6265 or security requirements
- Examples: Invalid formats, control characters
- Action: Must be fixed for compliance and security

### Warning
- Potential issues or compatibility concerns
- Examples: Browser support, best practices
- Action: Recommended but not required

## 🧹 Sanitization Features

### Automatic Sanitization
- **Name/Value**: Truncate to 4096 characters
- **Path**: Add leading slash, remove double slashes
- **Domain**: Preserve as-is (no automatic sanitization)

### Safe Defaults
- **Path**: Defaults to `/` if empty
- **Secure**: Enforced based on environment and prefixes
- **SameSite**: Defaults to `lax` for security

## 🔍 Validation API

### Basic Validation
```typescript
import { CookieValidator } from './cookie-validator';

const result = CookieValidator.validateCookie({
  name: 'session',
  value: 'abc123',
  secure: true,
  httpOnly: true,
  sameSite: 'lax'
});

if (result.valid) {
  console.log('✅ Cookie is valid');
  console.log('Sanitized:', result.sanitized);
} else {
  console.log('❌ Cookie is invalid');
  console.log('Errors:', result.errors);
}
```

### Integration with SecureCookieManager
```typescript
import { SecureCookieManager } from './bun-cookies-complete-v2';

const manager = new SecureCookieManager('secret');

try {
  const result = manager.createSecureCookie('session', { userId: 123 }, {
    signed: true,
    encrypted: true,
    secure: true
  });
  
  console.log('✅ Cookie created:', result.cookie);
  console.log('Validation:', result.validation);
} catch (error) {
  console.log('❌ Validation failed:', error.message);
}
```

### AnalyticsCookieMap Integration
```typescript
import { AnalyticsCookieMap } from './bun-cookies-complete-v2';

const cookieMap = new AnalyticsCookieMap(headers, 'secret');

const result = cookieMap.setSecure('session', { userId: 123 }, {
  signed: true,
  secure: true
});

if (result.success) {
  console.log('✅ Cookie set successfully');
} else {
  console.log('❌ Failed:', result.validation.errors);
}
```

## 📊 Validation Report Generation

### Detailed Reports
```typescript
const report = CookieValidator.generateReport(result);
console.log(report);
```

### Report Sections
- **Status**: Valid/Invalid summary
- **Errors**: Detailed error messages with fixes
- **Warnings**: Recommendations and best practices
- **Sanitized Options**: Cleaned values if applicable

## 🧪 Testing and Demo

### Run Validation Demo
```bash
bun run examples/cookie-validation-demo.ts
```

### Test Cases Covered
1. ✅ Valid cookies (all scenarios)
2. ❌ Missing required fields
3. ❌ Control characters
4. ❌ Oversized cookies
5. ❌ Reserved prefixes without security
6. ❌ Invalid domains
7. ❌ Invalid paths
8. ❌ Past expiration
9. ❌ SameSite violations
10. ❌ Partitioned without secure
11. ❌ Negative maxAge
12. ⚠️ Leading dot domains
13. ⚠️ IP address domains
14. ⚠️ Y2038 expiration
15. ⚠️ Expires/MaxAge conflicts

## 🔒 Security Enforcement

### Automatic Security Rules
- **Production**: Enforces `secure=true` in production
- **Reserved Prefixes**: Enforces security for `__Secure-` and `__Host-`
- **SameSite**: Enforces `secure=true` for `sameSite="none"`
- **Partitioned**: Enforces `secure=true` for partitioned cookies

### Security Score Calculation
- **Secure Percentage**: Based on `secure` flag usage
- **HttpOnly Percentage**: Based on `httpOnly` flag usage
- **Encryption Rate**: Based on encrypted cookie usage
- **Overall Score**: Weighted average of security metrics

## 🌐 Browser Compatibility

### Supported Standards
- **RFC 6265**: HTTP State Management Mechanism
- **RFC 6266**: SameSite attribute
- **CHIPS API**: Partitioned cookies (Chrome-only)
- **Y2038**: 32-bit timestamp limits

### Compatibility Warnings
- **Partitioned Cookies**: Limited browser support
- **Large Expiration**: Y2038 limit for 32-bit systems
- **IP Domains**: Compatibility issues with some browsers

## 📈 Performance Impact

### Validation Overhead
- **Minimal**: < 1ms for typical cookies
- **Caching**: Validation results cached where possible
- **Early Exit**: Fail fast on critical errors

### Memory Usage
- **Efficient**: No unnecessary object creation
- **Garbage Friendly**: Proper cleanup of temporary objects
- **Streamlined**: Single pass validation

## 🎯 Best Practices

### Recommended Settings
```typescript
// Session Cookie (Secure)
{
  name: 'session',
  value: sessionId,
  secure: true,
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7, // 1 week
  path: '/'
}

// Analytics Cookie (Non-sensitive)
{
  name: 'analytics_id',
  value: userId,
  secure: true,
  httpOnly: false,
  sameSite: 'strict',
  maxAge: 60 * 60 * 24 * 30, // 30 days
  path: '/'
}

// Cross-Site Cookie
{
  name: 'csrf_token',
  value: token,
  secure: true,
  httpOnly: true,
  sameSite: 'none',
  maxAge: 60 * 60, // 1 hour
  path: '/api'
}
```

### Security Checklist
- ✅ Always use `secure: true` in production
- ✅ Use `httpOnly: true` for sensitive cookies
- ✅ Set appropriate `sameSite` values
- ✅ Use reasonable expiration times
- ✅ Validate all cookie properties
- ✅ Monitor validation warnings

## 🏆 Summary

The Cookie Validation System provides:
- **🔒 Enterprise Security**: Comprehensive security rule enforcement
- **📋 RFC 6265 Compliance**: Full compliance with HTTP cookie standards
- **🧹 Smart Sanitization**: Automatic fixing of common issues
- **📊 Detailed Reporting**: Comprehensive error and warning reporting
- **⚡ High Performance**: Minimal overhead with fast validation
- **🌐 Browser Compatibility**: Cross-browser compatibility warnings
- **🔧 Easy Integration**: Simple API with existing cookie systems

This ensures that all cookies created by the platform are **secure, compliant, and production-ready** while providing detailed feedback for developers to maintain best practices.
