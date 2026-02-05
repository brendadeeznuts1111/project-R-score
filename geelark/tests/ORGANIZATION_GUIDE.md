# Tests Organization

## 📁 Directory Structure

```text
tests/
├── README.md                           # Main test documentation
├── ORGANIZATION_SUMMARY.md             # Organization overview
│
├── unit/                              # Unit tests
│   ├── feature-elimination/           # Feature elimination tests
│   ├── type-testing/                  # TypeScript type testing
│   ├── utils/                         # Utility function tests
│   └── ...                            # Other unit tests
│
├── integration/                       # Integration tests
│   ├── api/                          # API integration tests
│   ├── dev-hq/                       # Dev HQ specific tests
│   ├── server/                       # Server integration tests
│   └── ...                           # Other integration tests
│
├── e2e/                              # End-to-end tests
│   ├── automation/                   # Automation E2E tests
│   └── ...                           # Other E2E tests
│
├── performance/                      # Performance & benchmark tests
│   ├── bun-runtime/                  # Bun runtime performance
│   ├── networking/                   # Network performance tests
│   ├── transpilation/                # Transpilation performance
│   └── configuration/                # Configuration performance
│
├── cli/                              # CLI-specific tests
│   ├── flag-structure/               # CLI flag tests
│   ├── examples/                     # CLI example tests
│   └── watch-api/                    # File watching tests
│
├── fixtures/                         # Test fixtures and data
├── __snapshots__/                    # Test snapshots
└── config/                          # Test configuration files
```

## 🎯 Test Categories

### **Unit Tests** (`unit/`)

- Individual function and component testing
- Fast, isolated tests
- TypeScript type testing

### **Integration Tests** (`integration/`)

- Component interaction testing
- API endpoint testing
- Service integration testing

### **End-to-End Tests** (`e2e/`)

- Full workflow testing
- User scenario testing
- System integration testing

### **Performance Tests** (`performance/`)

- Benchmark testing
- Performance regression testing
- Load testing

### **CLI Tests** (`cli/`)

- Command-line interface testing
- Flag and option testing
- File watching testing

## 🚀 Usage

### **Run All Tests**

```bash
bun test
```

### **Run Specific Categories**

```bash
# Unit tests only
bun test tests/unit/**/*.test.ts

# Integration tests only
bun test tests/integration/**/*.test.ts

# Performance tests only
bun test tests/performance/**/*.test.ts

# CLI tests only
bun test tests/cli/**/*.test.ts
```

### **Type Testing**

```bash
# Compile-time type checking
bunx tsc --noEmit tests/unit/type-testing/**/*.test.ts
```

## 📝 Naming Conventions

- **Test files**: `*.test.ts`
- **Type test files**: `*-type-tests.test.ts`
- **Performance files**: `*.bench.ts`
- **Fixture files**: `*.fixture.ts`

## 🔧 Configuration

Test configuration is managed through:

- `bunfig.toml` - Global test settings
- `tests/config/` - Specific test configurations
