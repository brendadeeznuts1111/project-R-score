# Empire Pro Dashboard Integration - Tests

This directory contains the automated test suite for the Empire Pro Dashboard Integration system.

## 🧪 **Test Coverage**

### **Core Functionality**

- ✅ Configuration validation
- ✅ CLI command operations
- ✅ Pattern matrix registration
- ✅ Grafana API integration
- ✅ Notification system (Slack, Email, Webhook)
- ✅ Error handling and edge cases

### **Test Files**

- `dashboard-integration.test.ts` - Main integration test suite
- `*.test.ts` - Additional component-specific tests (future)

## 🚀 **Running Tests**

### **All Tests**

```bash
bun test
```

### **Specific Test File**

```bash
bun test tests/dashboard-integration.test.ts
```

### **With Coverage**

```bash
bun test --coverage
```

### **Verbose Output**

```bash
bun test --verbose
```

## 📊 **Test Results**

**Current Status:** 9/13 tests passing (69% pass rate)

### **Passing Tests**

- ✅ Configuration validation
- ✅ Pattern matrix registration
- ✅ CLI help commands
- ✅ Grafana JSON structure validation
- ✅ Notification error handling
- ✅ File system error handling

### **Needs Attention**

- 🔄 Environment variable validation (timing issues)
- 🔄 Grafana API connection tests (requires live server)
- 🔄 Slack priority validation (mock API limitations)

## ⚙️ **Test Configuration**

### **Environment Setup**

Tests use a dedicated test environment with mocked configurations:

```typescript
const testConfig = {
  grafana: { url: 'http://localhost:3000', apiKey: 'test-api-key' },
  notifications: { slack: { webhookUrl: 'https://hooks.slack.com/test' } }
};
```

### **Test Utilities**

- `runCommand()` - Executes CLI commands and captures output
- `existsSync()` - File existence checking
- Mock environment variables for isolated testing

## 🔧 **Development**

### **Adding New Tests**

1. Create test file with `.test.ts` suffix
2. Use `describe()` and `test()` from `bun:test`
3. Follow existing patterns for setup/teardown
4. Mock external dependencies

### **Test Structure**

```typescript
describe('Feature Name', () => {
  beforeAll(() => {
    // Setup test environment
  });

  test('should do something', () => {
    // Test implementation
    expect(result).toBe(expected);
  });
});
```

## 📝 **Test Data**

### **Mock Files**

- Uses temporary files for file system tests
- Restores original files after tests
- Handles invalid JSON and missing file scenarios

### **API Mocking**

- Grafana API calls are tested with real connection attempts
- Slack webhooks use test URLs
- Configuration validation uses environment variables

## 🚨 **Known Limitations**

1. **Grafana Tests**: Require running Grafana instance for full integration
2. **Timing Issues**: Some tests may timeout on slower systems
3. **Network Dependencies**: External API tests need internet connection

## 🎯 **Next Steps**

- [ ] Add unit tests for individual utilities
- [ ] Implement integration test with live Grafana instance
- [ ] Add performance benchmarks
- [ ] Create end-to-end test scenarios

---

**Testing Framework**: Bun Test  
**Coverage Target**: 80%+  
**Environment**: Node.js Test Mode
