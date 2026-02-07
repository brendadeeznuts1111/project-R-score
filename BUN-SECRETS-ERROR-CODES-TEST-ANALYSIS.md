# 🔐 Bun Secrets Error Codes - Comprehensive Analysis

> **Secure Error Handling**: Comprehensive validation and error code system for the Bun.secrets API

---

## 🎯 **Test Suite Overview**

The Bun `secrets-error-codes.test.ts` file demonstrates **robust error handling and validation** for the Bun secrets API, ensuring secure and predictable behavior when managing system secrets across different platforms.

### **Test Statistics**
- **5 Comprehensive Test Cases**
- **Error Code Validation**: Proper Node.js-style error codes
- **Platform Awareness**: CI and OS-specific test conditioning
- **Security Focus**: Null byte prevention and input validation
- **API Reliability**: Consistent behavior across error scenarios

---

## 🏗️ **Bun.secrets API Architecture**

### **Core API Methods**
```typescript
// Get a secret
const secret = await Bun.secrets.get({
  service: string,
  name: string
});

// Set a secret
await Bun.secrets.set({
  service: string,
  name: string,
  value: string,
  allowUnrestrictedAccess?: boolean
});

// Delete a secret
const deleted = await Bun.secrets.delete({
  service: string,
  name: string
});
```

### **Key Features**
- **Cross-Platform**: Works on macOS, Windows, and Linux
- **Secure Storage**: Uses system keychain/credential manager
- **Type Safety**: Full TypeScript support with proper validation
- **Error Codes**: Node.js-compatible error codes
- **Graceful Failure**: Non-existent operations return null/false

---

## 📊 **Test Cases Analysis**

### **Test 1: Non-existent Secret Handling**
```typescript
test("non-existent secret returns null without error", async () => {
  const result = await Bun.secrets.get({
    service: "non-existent-service-" + Date.now(),
    name: "non-existent-name",
  });

  expect(result).toBeNull();
});
```

**Validation Points**:
- **Graceful Handling**: Non-existent secrets return `null` instead of throwing
- **No Exception**: Prevents crashes when secrets don't exist
- **Timestamp Usage**: Ensures unique service names for test isolation

### **Test 2: Non-existent Delete Handling**
```typescript
test("delete non-existent returns false without error", async () => {
  const result = await Bun.secrets.delete({
    service: "non-existent-service-" + Date.now(),
    name: "non-existent-name",
  });

  expect(result).toBe(false);
});
```

**Validation Points**:
- **Boolean Return**: Delete operations return `false` for non-existent secrets
- **Consistent API**: Follows common patterns for delete operations
- **No Exception**: Graceful handling of missing secrets

### **Test 3: Invalid Arguments Error Codes**
```typescript
test("invalid arguments throw with proper error codes", async () => {
  // Missing service
  try {
    await Bun.secrets.get({ name: "test" });
    expect.unreachable();
  } catch (error: any) {
    expect(error.code).toBe("ERR_INVALID_ARG_TYPE");
    expect(error.message).toContain("Expected service and name to be strings");
  }

  // Empty service
  try {
    await Bun.secrets.get({ service: "", name: "test" });
    expect.unreachable();
  } catch (error: any) {
    expect(error.code).toBe("ERR_INVALID_ARG_TYPE");
    expect(error.message).toContain("Expected service and name to not be empty");
  }

  // Missing value in set
  try {
    await Bun.secrets.set({ service: "test", name: "test" });
    expect.unreachable();
  } catch (error: any) {
    expect(error.code).toBe("ERR_INVALID_ARG_TYPE");
    expect(error.message).toContain("Expected 'value' to be a string");
  }
});
```

**Error Code Validation**:
- **ERR_INVALID_ARG_TYPE**: Standard Node.js error code for type validation
- **Descriptive Messages**: Clear error messages explaining the issue
- **Comprehensive Coverage**: Tests missing properties, empty strings, and type validation

### **Test 4: Successful Operations Workflow**
```typescript
test("successful operations work correctly", async () => {
  const service = "bun-test-codes-" + Date.now();
  const name = "test-name";
  const value = "test-password";

  // Set a secret
  await Bun.secrets.set({ service, name, value, allowUnrestrictedAccess: isMacOS });

  // Get it back
  const retrieved = await Bun.secrets.get({ service, name });
  expect(retrieved).toBe(value);

  // Delete it
  const deleted = await Bun.secrets.delete({ service, name });
  expect(deleted).toBe(true);

  // Verify it's gone
  const afterDelete = await Bun.secrets.get({ service, name });
  expect(afterDelete).toBeNull();
});
```

**Workflow Validation**:
- **Complete CRUD**: Create, Read, Delete operations tested
- **Data Integrity**: Retrieved value matches original
- **Cleanup**: Proper deletion verification
- **Platform Handling**: `allowUnrestrictedAccess` for macOS

### **Test 5: Error Message Security**
```typescript
test("error messages have no null bytes", async () => {
  const errorTests = [
    { service: "", name: "test" },
    { service: "test", name: "" },
  ];

  for (const testCase of errorTests) {
    try {
      await Bun.secrets.get(testCase);
      expect.unreachable();
    } catch (error: any) {
      // Check for null bytes
      expect(error.message).toBeDefined();
      expect(error.message.includes("\0")).toBe(false);

      // Check error has a code
      expect(error.code).toBeDefined();
      expect(typeof error.code).toBe("string");
    }
  }
});
```

**Security Validation**:
- **Null Byte Prevention**: Error messages don't contain null bytes
- **Error Code Presence**: All errors have proper error codes
- **Type Safety**: Error codes are strings
- **Message Integrity**: Error messages are well-formed

---

## 🚀 **Technical Implementation Details**

### **Error Code System**
```typescript
interface SecretsError extends Error {
  code: string;
  message: string;
}

// Standard Node.js error codes
const ERROR_CODES = {
  INVALID_ARG_TYPE: "ERR_INVALID_ARG_TYPE",
  // Additional error codes as needed
};
```

### **Input Validation Strategy**
```typescript
// Type checking
if (typeof service !== "string" || typeof name !== "string") {
  throw new SecretsError("Expected service and name to be strings", "ERR_INVALID_ARG_TYPE");
}

// Empty string checking
if (service.length === 0 || name.length === 0) {
  throw new SecretsError("Expected service and name to not be empty", "ERR_INVALID_ARG_TYPE");
}

// Value validation for set operations
if (typeof value !== "string") {
  throw new SecretsError("Expected 'value' to be a string", "ERR_INVALID_ARG_TYPE");
}
```

### **Platform-Specific Handling**
```typescript
// macOS requires unrestricted access for some operations
const options = {
  service,
  name,
  value,
  allowUnrestrictedAccess: isMacOS // Platform-specific option
};

await Bun.secrets.set(options);
```

---

## 🌍 **Cross-Platform Considerations**

### **Operating System Support**
- **macOS**: Uses Keychain Services
- **Windows**: Uses Windows Credential Manager
- **Linux**: Uses libsecret or similar mechanisms

### **CI/CD Environment Handling**
```typescript
describe.todoIf(isCI && !isWindows)("Bun.secrets error codes", () => {
  // Tests are marked as TODO in CI except on Windows
  // Prevents issues with CI environments lacking proper secret storage
});
```

**CI Considerations**:
- **Windows CI**: Full test execution
- **Other CI**: Tests marked as TODO to prevent failures
- **Local Development**: All tests run regardless of platform

### **Security Permissions**
```typescript
// macOS Keychain Access
const macOptions = {
  allowUnrestrictedAccess: true, // Required for CI/testing environments
  // Other platform-specific options
};
```

---

## 🛡️ **Security Features**

### **Input Validation**
- **Type Checking**: Ensures all parameters are strings
- **Empty String Prevention**: Disallows empty service/name values
- **Null Byte Prevention**: Error messages are sanitized
- **Comprehensive Coverage**: All API methods validated

### **Error Message Security**
```typescript
// Safe error message generation
function createErrorMessage(template: string, ...args: any[]): string {
  // Prevent null byte injection
  const sanitizedArgs = args.map(arg => 
    String(arg).replace(/\0/g, '')
  );
  return template.replace(/%s/g, () => sanitizedArgs.shift() || '');
}
```

### **Secret Storage Security**
- **System Keychain**: Uses OS-provided secure storage
- **Encryption**: Secrets are encrypted at rest
- **Access Control**: Proper OS-level permission handling
- **Memory Safety**: Secrets are not exposed in error messages

---

## 📊 **Error Code Standards**

### **Node.js Compatibility**
```typescript
// Standard Node.js error codes used
const NODE_ERROR_CODES = {
  ERR_INVALID_ARG_TYPE: "Invalid argument type",
  ERR_INVALID_ARG_VALUE: "Invalid argument value",
  ERR_MISSING_ARGS: "Missing required arguments",
  // ... other standard codes
};
```

### **Error Object Structure**
```typescript
interface BunSecretsError extends Error {
  code: string;           // Node.js-style error code
  message: string;        // Human-readable error message
  stack?: string;         // Stack trace (development)
  name: string;           // Error class name
}
```

### **Error Handling Best Practices**
- **Consistent Codes**: Use standard Node.js error codes
- **Clear Messages**: Provide actionable error descriptions
- **Security**: Never expose secrets in error messages
- **Debugging**: Include stack traces in development

---

## 🎯 **Real-World Usage Patterns**

### **Environment Variable Management**
```typescript
async function getDatabaseConfig(): Promise<DatabaseConfig | null> {
  try {
    const password = await Bun.secrets.get({
      service: "my-app",
      name: "database-password"
    });
    
    return password ? { host: "localhost", password } : null;
  } catch (error) {
    console.error("Failed to get database config:", error.message);
    return null;
  }
}
```

### **API Key Storage**
```typescript
async function storeApiKey(key: string): Promise<boolean> {
  try {
    await Bun.secrets.set({
      service: "api-service",
      name: "production-key",
      value: key,
      allowUnrestrictedAccess: process.env.NODE_ENV === "test"
    });
    return true;
  } catch (error) {
    console.error("Failed to store API key:", error.message);
    return false;
  }
}
```

### **Secure Configuration Loading**
```typescript
async function loadSecureConfig(): Promise<Config> {
  const config: Config = {
    database: await getSecret("database-url"),
    redis: await getSecret("redis-password"),
    jwt: await getSecret("jwt-secret")
  };
  
  return config;
}

async function getSecret(name: string): Promise<string | null> {
  try {
    return await Bun.secrets.get({
      service: "my-app",
      name
    });
  } catch (error) {
    console.error(`Failed to get ${name}:`, error.message);
    return null;
  }
}
```

---

## 🏆 **Why Error Code Testing Matters**

### **1. Developer Experience**
- **Predictable Errors**: Consistent error codes across platforms
- **Clear Messages**: Actionable error descriptions
- **Standard Patterns**: Node.js-compatible error handling
- **Debugging Support**: Proper error context and stack traces

### **2. Application Reliability**
- **Graceful Degradation**: Applications handle missing secrets gracefully
- **Error Recovery**: Clear error codes enable proper error handling
- **Stability**: Prevents crashes from invalid inputs
- **Security**: No secret leakage in error messages

### **3. Cross-Platform Consistency**
- **Uniform Behavior**: Same error codes on all platforms
- **CI/CD Reliability**: Consistent test behavior across environments
- **Documentation**: Clear error code documentation
- **Migration**: Easy migration from other secret management systems

---

## 🎊 **Achievement Summary**

### **Technical Excellence**
- **🔐 Security Focus**: Comprehensive input validation and sanitization
- **🌍 Cross-Platform**: Consistent behavior across macOS, Windows, and Linux
- **📊 Standards Compliance**: Node.js-compatible error codes
- **🛡️ Error Prevention**: Null byte injection prevention
- **🧪 Thorough Testing**: Comprehensive error scenario coverage

### **Quality Metrics**
- **Error Code Coverage**: All major error scenarios tested
- **Platform Coverage**: CI-aware testing across environments
- **Security Validation**: Input sanitization and message safety
- **API Reliability**: Consistent behavior in all scenarios
- **Developer Experience**: Clear, actionable error messages

### **Development Impact**
- **Secure Applications**: Proper secret management with error handling
- **Reliable Code**: Graceful handling of missing or invalid secrets
- **Cross-Platform**: Consistent behavior regardless of OS
- **Easy Debugging**: Clear error codes and messages
- **Production Ready**: Battle-tested error handling patterns

---

## ✨ **Conclusion**

Bun's secrets error code system represents **secure and reliable secret management**:

- **🔐 Security First**: Comprehensive input validation and sanitization
- **🌍 Platform Agnostic**: Consistent behavior across all operating systems
- **📊 Standards Compliant**: Node.js-compatible error codes and patterns
- **🛡️ Error Safe**: Prevents crashes and secret leakage
- **🧪 Thoroughly Tested**: Comprehensive error scenario validation
- **🔧 Developer Friendly**: Clear, actionable error messages

This implementation establishes **Bun as a reliable choice for secure secret management**, providing developers with a robust, cross-platform API that handles errors gracefully while maintaining security best practices! 🚀
