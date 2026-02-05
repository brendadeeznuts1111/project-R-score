# 🎯 Bun.inspect() and Bun.inspect.table() - Complete Reference

## 📋 **Overview**

Bun provides powerful inspection utilities for debugging and development that mirror Node.js functionality with enhanced performance and Unicode support.

---

## 🔧 **Bun.inspect()**

### **Basic Usage**
```typescript
const obj = { foo: "bar" };
const str = Bun.inspect(obj);
// => '{\nfoo: "bar" \n}'

const arr = new Uint8Array([1, 2, 3]);
const str = Bun.inspect(arr);
// => "Uint8Array(3) [ 1, 2, 3 ]"
```

### **Key Features**
✅ **String Serialization**: Returns string representation instead of printing
✅ **Identical to console.log**: Same formatting as console.log output
✅ **Type-Aware**: Handles all JavaScript data types intelligently
✅ **Performance Optimized**: Fast serialization for debugging

### **Data Type Handling**
| Type | Example Output |
|------|---------------|
| `Object` | `{ foo: "bar" }` |
| `Array` | `[ 1, 2, 3 ]` |
| `Uint8Array` | `Uint8Array(3) [ 1, 2, 3 ]` |
| `Date` | `2024-01-09T02:19:00.000Z` |
| `RegExp` | `/test/gi` |
| `Function` | `[Function]` |
| `Symbol` | `Symbol(test)` |
| `null` | `null` |
| `undefined` | `undefined` |

---

## 🎨 **Bun.inspect.custom**

### **Custom Object Inspection**
```typescript
class Foo {
  [Bun.inspect.custom]() {
    return "foo";
  }
}

const foo = new Foo();
console.log(foo); // => "foo"
```

### **Advanced Custom Implementation**
```typescript
class CustomClass {
  constructor(name, value) {
    this.name = name;
    this.value = value;
  }

  [Bun.inspect.custom]() {
    return `CustomClass(${this.name}, value=${this.value})`;
  }
}

const instance = new CustomClass("test", 42);
console.log(instance); // => "CustomClass(test, value=42)"
```

### **Benefits**
✅ **Node.js Compatible**: Identical to `util.inspect.custom`
✅ **Custom Formatting**: Control how your objects display
✅ **Debugging Friendly**: Simplified output for complex objects
✅ **Type Safe**: Works with TypeScript classes

---

## 📊 **Bun.inspect.table()**

### **Basic Syntax**
```typescript
Bun.inspect.table(tabularData, properties?, options?)
```

### **Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `tabularData` | `Array<Object>` | Array of objects to display |
| `properties` | `Array<string>` | Columns to include (optional) |
| `options` | `Object` | Configuration options (optional) |

### **Options**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `colors` | `boolean` | `true` | Enable/disable ANSI colors |

---

## 🎯 **Complete Examples**

### **1. Basic Table Display**
```typescript
const data = [
  { a: 1, b: 2, c: 3 },
  { a: 4, b: 5, c: 6 },
  { a: 7, b: 8, c: 9 }
];

console.log(Bun.inspect.table(data));
```

**Output:**
```
┌───┬───┬───┬───┐
│   │ a │ b │ c │
├───┼───┼───┼───┤
│ 0 │ 1 │ 2 │ 3 │
│ 1 │ 4 │ 5 │ 6 │
│ 2 │ 7 │ 8 │ 9 │
└───┴───┴───┴───┘
```

### **2. Custom Property Selection**
```typescript
console.log(Bun.inspect.table(data, ["a", "c"]));
```

**Output:**
```
┌───┬───┬───┐
│   │ a │ c │
├───┼───┼───┤
│ 0 │ 1 │ 3 │
│ 1 │ 4 │ 6 │
│ 2 │ 7 │ 9 │
└───┴───┴───┘
```

### **3. Color Control**
```typescript
// Enable colors (default)
console.log(Bun.inspect.table(data, null, { colors: true }));

// Disable colors
console.log(Bun.inspect.table(data, null, { colors: false }));
```

### **4. Performance Metrics Table**
```typescript
const performanceData = [
  { operation: "Database Query", time: "23.5ms", status: "✅ Success" },
  { operation: "API Call", time: "145ms", status: "✅ Success" },
  { operation: "Cache Miss", time: "0.8ms", status: "⚠️ Warning" }
];

console.log(Bun.inspect.table(performanceData));
```

**Output:**
```
┌───┬────────────────┬────────┬────────────┐
│   │ operation      │ time   │ status     │
├───┼────────────────┼────────┼────────────┤
│ 0 │ Database Query │ 23.5ms │ ✅ Success │
│ 1 │ API Call       │ 145ms  │ ✅ Success │
│ 2 │ Cache Miss     │ 0.8ms  │ ⚠️ Warning  │
└───┴────────────────┴────────┴────────────┘
```

### **5. Unicode and Special Characters**
```typescript
const unicodeData = [
  {
    emoji: "🚀 🎯 🏆 ⚡ 🎨 📊",
    currency: "$100.50 €75.25 £50.00 ¥1000",
    international: "Café naïve résumé señor niño él",
    math: "∑ ∏ ∫ ∆ ∇ ∂ α β γ δ ε ζ"
  }
];

console.log(Bun.inspect.table(unicodeData));
```

**Output:**
```
┌───┬───────────────────┬─────────────────────────────┬─────────────────────────┬─────────────────────────┐
│   │ emoji             │ currency                    │ international         │ math                   │
├───┼───────────────────┼─────────────────────────────┼─────────────────────────┼─────────────────────────┤
│ 0 │ 🚀 🎯 🏆 ⚡ 🎨 📊 │ $100.50 €75.25 £50.00 ¥1000 │ Café naïve résumé señor niño él │ ∑ ∏ ∫ ∆ ∇ ∂ α β γ δ ε ζ │
└───┴───────────────────┴─────────────────────────────┴─────────────────────────┴─────────────────────────┘
```

---

## 🔍 **Edge Cases and Error Handling**

### **Empty Array**
```typescript
console.log(Bun.inspect.table([]));
```

**Output:**
```
┌───┐
│   │
├───┤
└───┘
```

### **Single Object**
```typescript
console.log(Bun.inspect.table([{ only: "field", value: 42 }]));
```

**Output:**
```
┌───┬───────┬───────┐
│   │ only  │ value │
├───┼───────┼───────┤
│ 0 │ field │ 42    │
└───┴───────┴───────┘
```

### **Objects with No Properties**
```typescript
console.log(Bun.inspect.table([{}, {}]));
```

**Output:**
```
┌───┐
│   │
├───┤
│ 0 │
│ 1 │
└───┘
```

### **Mixed Object Shapes**
```typescript
const mixedData = [
  { name: "Alice", age: 30 },
  { name: "Bob", email: "bob@example.com" }, // missing age
  { city: "Chicago", country: "USA" } // different properties
];

console.log(Bun.inspect.table(mixedData));
```

**Output:**
```
┌───┬───────┬─────┬─────────────────┬─────────┬─────────┐
│   │ name  │ age │ email           │ city    │ country │
├───┼───────┼─────┼─────────────────┼─────────┼─────────┤
│ 0 │ Alice │ 30  │                 │         │         │
│ 1 │ Bob   │     │ bob@example.com │         │         │
│ 2 │       │     │                 │ Chicago │ USA     │
└───┴───────┴─────┴─────────────────┴─────────┴─────────┘
```

---

## 🔄 **Bun.inspect() vs console.log()**

### **Comparison Example**
```typescript
const obj = {
  name: "Test Object",
  value: 42,
  nested: { deep: "value" },
  array: [1, 2, 3]
};

// console.log() - prints to console
console.log(obj);

// Bun.inspect() - returns string
const str = Bun.inspect(obj);
console.log("String representation:");
console.log(str);
```

**Both produce identical output:**
```
{
  name: "Test Object",
  value: 42,
  nested: {
    deep: "value",
  },
  array: [ 1, 2, 3 ],
}
```

### **Key Differences**
| Feature | console.log() | Bun.inspect() |
|---------|---------------|---------------|
| **Output** | Prints to console | Returns string |
| **Usage** | Direct logging | String manipulation |
| **Performance** | Optimized for printing | Optimized for serialization |
| **Flexibility** | Fixed output | Can be stored, processed, sent |

---

## 🚀 **Performance Characteristics**

### **Bun.inspect() Performance**
| Data Size | Serialization Time | Memory Usage |
|-----------|-------------------|--------------|
| Small Object | < 1ms | < 1KB |
| Medium Object | 1-5ms | 1-10KB |
| Large Object | 5-20ms | 10-100KB |

### **Bun.inspect.table() Performance**
| Data Size | Render Time | Memory Usage |
|-----------|-------------|--------------|
| < 100 rows | < 1ms | < 10KB |
| 100-1000 rows | 1-10ms | 10-100KB |
| > 1000 rows | > 10ms | > 100KB |

---

## 🎯 **Best Practices**

### ✅ **Do's**
- Use `Bun.inspect()` for string serialization
- Use `Bun.inspect.table()` for tabular data display
- Implement `Bun.inspect.custom` for complex objects
- Use color control in production environments
- Filter large datasets before table display

### ❌ **Don'ts**
- Don't use `Bun.inspect.table()` for production logging (performance)
- Don't display extremely large datasets (>10,000 rows)
- Don't rely on specific formatting (may change)
- Don't display sensitive data in production

---

## 🔧 **Real-World Applications**

### **API Response Debugging**
```typescript
async function debugResponse(response) {
  console.log("Response data:");
  console.log(Bun.inspect(response.data));

  console.log("Response summary:");
  console.log(Bun.inspect.table(response.data, ["id", "name", "status"]));
}
```

### **Performance Monitoring**
```typescript
function displayMetrics(metrics) {
  console.log("Performance metrics:");
  console.log(Bun.inspect.table(metrics, ["operation", "time", "status"]));
}
```

### **Configuration Display**
```typescript
function showConfig(config) {
  const configArray = Object.entries(config).map(([key, value]) => ({
    setting: key,
    value: String(value),
    type: typeof value
  }));

  console.log("Configuration:");
  console.log(Bun.inspect.table(configArray));
}
```

---

## 🏆 **Summary**

Bun's inspection utilities provide:

✅ **Bun.inspect()** - String serialization with console.log formatting
✅ **Bun.inspect.custom** - Custom object inspection (Node.js compatible)
✅ **Bun.inspect.table()** - Beautiful Unicode tables with customization
✅ **Unicode Support** - Perfect handling of international characters
✅ **Performance Optimized** - Fast serialization and rendering
✅ **Type-Aware** - Intelligent formatting for all data types
✅ **Error Tolerant** - Graceful handling of edge cases

**These utilities are essential for debugging, development, and creating professional console output in Bun applications!** 🚀
