# Demo Services

Example services and demonstrations for learning, testing, and development.

## 🎭 Services

### **Content Type Demo** (`content-type-demo.ts`)
Demonstrates various content type handling and response parsing:
- JSON response handling
- XML parsing
- Binary data processing
- Text content extraction
- Stream processing
- Error handling for different content types

### **Verbose Fetch Demo** (`verbose-fetch-demo.ts`)
Detailed fetch examples with comprehensive logging and debugging:
- Step-by-step request logging
- Response header inspection
- Timing measurements
- Error scenario demonstrations
- Performance analysis
- Debug information display

## 🚀 Usage Examples

### **Content Type Demo**
```typescript
import ContentTypeDemo from './content-type-demo';

const demo = new ContentTypeDemo();

// Demonstrate JSON handling
await demo.demonstrateJSON();

// Show XML parsing
await demo.demonstrateXML();

// Binary data processing
await demo.demonstrateBinary();
```

### **Verbose Fetch Demo**
```typescript
import VerboseFetchDemo from './verbose-fetch-demo';

const demo = new VerboseFetchDemo();

// Detailed fetch with logging
await demo.verboseFetch('https://api.example.com/data');

// Error scenario demonstration
await demo.demonstrateErrors();

// Performance analysis
await demo.analyzePerformance();
```

## 📚 Learning Topics Covered

### **HTTP Fundamentals**
- Request methods (GET, POST, PUT, DELETE)
- Status codes and their meanings
- Header manipulation
- Content negotiation

### **Data Formats**
- JSON parsing and validation
- XML document handling
- Binary data processing
- Text encoding issues

### **Error Handling**
- Network error scenarios
- Timeout handling
- Retry strategies
- Graceful degradation

### **Performance Optimization**
- Request timing analysis
- Response size optimization
- Caching strategies
- Connection reuse

## 🛠️ Development Features

### **Debugging Tools**
- Detailed request/response logging
- Timing measurements
- Header inspection
- Error tracing

### **Testing Scenarios**
- Success cases
- Error conditions
- Edge cases
- Performance limits

## 🎯 Purpose

These demo services are designed to:
- **Educate** developers on HTTP best practices
- **Demonstrate** proper error handling patterns
- **Showcase** performance optimization techniques
- **Provide** testing utilities for development
- **Document** common usage patterns

## 🔧 Running Demos

Each demo can be run independently:
```bash
# Run content type demo
bun run services/demos/content-type-demo.ts

# Run verbose fetch demo
bun run services/demos/verbose-fetch-demo.ts
```

## 📝 Notes

- Demos include extensive console logging
- All examples use real-world scenarios
- Error handling is comprehensive and educational
- Performance metrics are included for analysis
