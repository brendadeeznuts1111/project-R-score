# 🎯 Development Standards - Quick Reference

> **Comprehensive development standards locked in at `.custom-instructions.md`**
> 
> This document provides a quick reference. For complete standards, see `.custom-instructions.md`.

---

## 🏗️ **Core Stack**

```typescript
{
  "runtime": "Bun",
  "language": "TypeScript 5.0+",
  "styling": "Tailwind CSS + shadcn/ui",
  "icons": "Lucide React",
  "testing": "Bun Test",
  "package_manager": "Bun"
}
```

---

## 🎨 **Design System**

### **Colors**
```css
--color-primary-500: #3b82f6;    /* Blue */
--color-success: #22c55e;        /* Green */
--color-warning: #f59e0b;        /* Amber */
--color-error: #ef4444;          /* Red */
--color-info: #06b6d4;           /* Cyan */
```

### **Typography**
- **Font Family**: Inter
- **Spacing**: 8px grid system
- **Breakpoints**: sm, md, lg, xl, 2xl

---

## 📝 **Code Standards**

### **TypeScript Rules**
```typescript
// ✅ Always use explicit return types
function calculate(data: DataSet): MetricsResult {
  // Implementation
}

// ✅ Use interfaces for objects
interface UserConfig {
  readonly id: string;
  name: string;
}

// ✅ Generic functions with constraints
function createRepository<T extends Entity>(entity: T): Repository<T> {
  // Implementation
}
```

### **Error Handling**
```typescript
// ✅ Custom error classes
class ValidationError extends Error {
  constructor(message: string, public readonly field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ✅ Result pattern
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };
```

---

## 🔧 **Development Workflow**

### **Package Scripts**
```json
{
  "dev": "bun --watch src/index.ts",
  "build": "bun build src/index.ts --outdir ./dist",
  "test": "bun test",
  "test:coverage": "bun test --coverage",
  "lint": "eslint . --ext .ts,.tsx",
  "format": "prettier --write .",
  "type-check": "tsc --noEmit"
}
```

### **Git Hooks**
- **Pre-commit**: Lint + Format + Type-check
- **Pre-push**: Full test suite
- **Commit**: Conventional commits required

---

## 🧪 **Testing Standards**

### **Test Structure**
```typescript
describe('UtilityFunction', () => {
  it('should process input correctly', () => {
    // Arrange
    const testData = { input: 'test', expected: 'output' };
    
    // Act
    const result = utilityFunction(testData.input);
    
    // Assert
    expect(result).toBe(testData.expected);
  });
});
```

### **Coverage Requirements**
- **Unit Tests**: 90%+ coverage
- **Integration Tests**: Critical paths covered
- **E2E Tests**: User workflows covered

---

## 🔒 **Security Standards**

### **Input Validation**
```typescript
function validateInput(input: unknown): string {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string', 'input');
  }
  if (input.length > 1000) {
    throw new ValidationError('Input too long', 'input');
  }
  return input.trim();
}
```

### **Security Checklist**
- ✅ Input validation for all public APIs
- ✅ No eval() or Function constructor usage
- ✅ Proper error handling without info leakage
- ✅ HTTPS for all external communications

---

## 📊 **Performance Standards**

### **Optimization Targets**
- **Bundle Size**: < 100KB for core utilities
- **Runtime Performance**: < 10ms for utility functions
- **Memory Usage**: Minimal allocations, no leaks
- **Cold Start**: < 100ms for serverless functions

### **Monitoring**
```typescript
function performance(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = function (...args: any[]) {
    const start = performance.now();
    const result = originalMethod.apply(this, args);
    const end = performance.now();
    console.log(`${propertyKey} took ${end - start}ms`);
    return result;
  };
}
```

---

## 🚀 **CI/CD Standards**

### **GitHub Actions Pipeline**
```yaml
name: CI/CD Pipeline
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run lint
      - run: bun run type-check
      - run: bun run test:coverage
```

### **Deployment Targets**
- **Development**: Automatic on push to main
- **Staging**: Manual approval required
- **Production**: Full test suite + security scan

---

## 📁 **Project Structure**

```text
Projects/
├── lib/                    # Core library code
│   ├── utils/             # Utility functions
│   ├── security/          # Security modules
│   ├── documentation/     # Documentation generators
│   └── types/            # Type definitions
├── tools/                 # Development tools
├── docs/                  # Generated documentation
├── tests/                 # Test suites
└── examples/             # Usage examples
```

---

## 🎯 **Quality Gates**

### **Before Merge**
- [ ] All tests passing
- [ ] 90%+ code coverage
- [ ] No TypeScript errors
- [ ] ESLint passing
- [ ] Security scan passing
- [ ] Performance benchmarks met

### **Before Release**
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] Version bumped (semantic)
- [ ] Tag created
- [ ] Release notes prepared

---

## 🔗 **Quick Commands**

```bash
# Development
bun run dev                    # Start development server
bun run test                  # Run tests
bun run lint                  # Lint code
bun run format                # Format code

# Building
bun run build                 # Build for production
bun run type-check           # Type checking

# Documentation
bun run docs:generate        # Generate docs
bun run docs:serve          # Serve documentation

# Quality
bun run test:coverage       # Test with coverage
bun run lint:fix           # Fix linting issues
```

---

## 📞 **Support & Resources**

### **Documentation**
- **Complete Standards**: `.custom-instructions.md`
- **API Documentation**: Auto-generated with TypeDoc
- **Examples**: `/examples/` directory
- **Guides**: `/docs/` directory

### **Tools & Extensions**
- **VS Code**: See `.custom-instructions.md` for extension list
- **ESLint**: Pre-configured with strict rules
- **Prettier**: Consistent code formatting
- **TypeScript**: Strict mode enabled

### **Getting Help**
1. Check `.custom-instructions.md` for complete standards
2. Review generated documentation
3. Check test examples in `/tests/`
4. Review code in `/examples/`

---

**⚡ These standards are locked in and should be followed consistently across all development activities.**

*For complete details, always reference `.custom-instructions.md`*
