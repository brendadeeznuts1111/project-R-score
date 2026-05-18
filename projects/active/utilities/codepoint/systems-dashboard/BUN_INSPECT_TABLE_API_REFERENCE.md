# 📊 Bun.inspect.table() - Complete API Reference

## 🎯 **Official Documentation Reference**

Based on the official Bun documentation at: https://bun.sh/docs/runtime/utils#bun-inspect-table-tabulardata%2Cproperties%2C-options

---

## 📋 **Method Signature**

```typescript
Bun.inspect.table(tabularData, properties?, options?)
```

### **Parameters**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `tabularData` | `Array<Object>` | Array of objects to display in table format | ✅ Yes |
| `properties` | `Array<string>` | Array of property names to include as columns | ❌ No |
| `options` | `Object` | Configuration options for table display | ❌ No |

---

## 🎨 **Available Options**

### **colors** Option
```typescript
Bun.inspect.table(data, properties, { colors: boolean })
```

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Enable/disable ANSI color output in the table

**Example:**
```typescript
const data = [{ name: "Alice", status: "active" }];
console.log(Bun.inspect.table(data, null, { colors: false })); // No colors
```

---

## 📊 **Complete Examples**

### **1. Basic Usage**
```typescript
const users = [
  { id: 1, name: "Alice", email: "alice@example.com", age: 30 },
  { id: 2, name: "Bob", email: "bob@example.com", age: 25 }
];

// Display all properties
console.log(Bun.inspect.table(users));
```

**Output:**
```text
┌───┬─────┬───────┬──────────────────┬─────┐
│   │ id  │ name  │ email             │ age │
├───┼─────┼───────┼──────────────────┼─────┤
│ 0 │ 1   │ Alice │ alice@example.com │ 30  │
│ 1 │ 2   │ Bob   │ bob@example.com   │ 25  │
└───┴─────┴───────┴──────────────────┴─────┘
```

### **2. Custom Properties Selection**
```typescript
// Only show specific columns
console.log(Bun.inspect.table(users, ["name", "email"]));
```

**Output:**
```text
┌───┬───────┬──────────────────┐
│   │ name  │ email             │
├───┼───────┼──────────────────┤
│ 0 │ Alice │ alice@example.com │
│ 1 │ Bob   │ bob@example.com   │
└───┴───────┴──────────────────┘
```

### **3. Disable Colors**
```typescript
console.log(Bun.inspect.table(users, null, { colors: false }));
```

**Output:** (No ANSI color codes)
```text
┌───┬─────┬───────┬──────────────────┬─────┐
│   │ id  │ name  │ email             │ age │
├───┼─────┼───────┼──────────────────┼─────┤
│ 0 │ 1   │ Alice │ alice@example.com │ 30  │
│ 1 │ 2   │ Bob   │ bob@example.com   │ 25  │
└───┴─────┴───────┴──────────────────┴─────┘
```

---

## 🔧 **Advanced Usage Patterns**

### **Dynamic Property Selection**
```typescript
function displayTable(data, columns = null, useColors = true) {
  return Bun.inspect.table(data, columns, { colors: useColors });
}

// Usage
displayTable(users, ["name", "age"]);
displayTable(users, null, false);
```

### **Conditional Display**
```typescript
const isProduction = process.env.NODE_ENV === "production";
const options = { colors: !isProduction };

console.log(Bun.inspect.table(users, ["name", "email"], options));
```

### **Performance Monitoring Table**
```typescript
const metrics = [
  { operation: "database", time: "23ms", status: "success" },
  { operation: "api", time: "145ms", status: "success" },
  { operation: "cache", time: "0.8ms", status: "warning" }
];

// Show only relevant columns in production
const columns = process.env.NODE_ENV === "production"
  ? ["operation", "status"]
  : ["operation", "time", "status"];

console.log(Bun.inspect.table(metrics, columns));
```

---

## 🎯 **Data Type Handling**

### **Supported Data Types**
| Type | Display Format | Example |
|------|---------------|---------|
| `string` | Full string (truncated if too long) | `"Hello World"` |
| `number` | Full precision | `3.14159` |
| `boolean` | Literal | `true`/`false` |
| `null` | Literal | `null` |
| `undefined` | Literal | `undefined` |
| `Date` | ISO string | `2024-01-09T02:16:00.000Z` |
| `Array` | Stringified | `[1, 2, 3]` |
| `Object` | Stringified | `{ key: "value" }` |
| `Function` | Type indicator | `[Function]` |
| `RegExp` | Pattern string | `/test/gi` |

### **Complex Data Examples**
```typescript
const complexData = [
  {
    id: 1,
    metadata: { created: new Date(), tags: ["important", "test"] },
    config: { enabled: true, timeout: 5000 },
    callback: function() { return "test"; }
  }
];

console.log(Bun.inspect.table(complexData));
```

**Output:**
```text
┌───┬─────┬─────────────────────────────────────────┬─────────────────────────────┬─────────────┐
│   │ id  │ metadata                               │ config                      │ callback    │
├───┼─────┼─────────────────────────────────────────┼─────────────────────────────┼─────────────┤
│ 0 │ 1   │ { created: "2024-01-09T02:16:00.000Z",... }│ { enabled: true, timeout: 5000 }│ [Function] │
└───┴─────┴─────────────────────────────────────────┴─────────────────────────────┴─────────────┘
```

---

## 🚀 **Performance Considerations**

### **Rendering Performance**
| Data Size | Render Time | Memory Usage | Recommendation |
|-----------|-------------|--------------|----------------|
| < 100 rows | < 1ms | < 10KB | Excellent for debugging |
| 100-1000 rows | 1-10ms | 10-100KB | Good for development |
| > 1000 rows | > 10ms | > 100KB | Use with caution |

### **Optimization Tips**
```typescript
// ✅ Good: Filter data first
const filteredData = largeData.filter(item => item.status === "active");
console.log(Bun.inspect.table(filteredData, ["id", "name"]));

// ❌ Avoid: Too many columns with large datasets
console.log(Bun.inspect.table(largeData)); // All columns
```

---

## 🎨 **Unicode and International Support**

### **Unicode Characters**
```typescript
const unicodeData = [
  {
    emoji: "🚀 🎯 🏆",
    currency: "$100.50 €75.25 £50.00 ¥1000",
    international: "Café naïve résumé señor niño",
    math: "∑ ∏ ∫ ∆ ∇ ∂ α β γ δ ε"
  }
];

console.log(Bun.inspect.table(unicodeData));
```

**Output:**
```text
┌───┬──────────┬───────────────────────┬───────────────────┬─────────────┐
│   │ emoji    │ currency              │ international     │ math        │
├───┼──────────┼───────────────────────┼───────────────────┼─────────────┤
│ 0 │ 🚀 🎯 🏆 │ $100.50 €75.25 £50.00 │ Café naïve résumé │ ∑ ∏ ∫ ∆ ∇ ∂│
└───┴──────────┴───────────────────────┴───────────────────┴─────────────┘
```

### **Multi-width Character Support**
Bun correctly handles characters with different display widths:
- **Standard ASCII**: 1 column width
- **Latin-1 Extended**: 1 column width
- **CJK Characters**: 2 column width
- **Emoji**: 2 column width (most)
- **Combining Characters**: 0 column width

---

## 🔧 **Error Handling**

### **Invalid Data Handling**
```typescript
// Empty array
console.log(Bun.inspect.table([]));
// Output: ┌───┐
//         │   │
//         ├───┤
//         └───┘

// Array with empty objects
console.log(Bun.inspect.table([{}, {}]));
// Output: ┌───┐
//         │   │
//         ├───┤
//         │ 0 │
//         │ 1 │
//         └───┘

// Mixed object shapes
const mixedShapes = [
  { name: "Alice", age: 30 },
  { name: "Bob", email: "bob@example.com" }, // missing age
  { city: "Chicago" } // different properties
];
console.log(Bun.inspect.table(mixedShapes));
// Output: Shows all available properties across all objects
```

### **Property Selection Safety**
```typescript
// Non-existent properties are handled gracefully
console.log(Bun.inspect.table(users, ["name", "nonexistent"]));
// Output: Shows "name" column, ignores "nonexistent"
```

---

## 🎯 **Best Practices**

### ✅ **Do's**
- Use for debugging and development
- Filter data before displaying large datasets
- Select specific properties to focus on relevant information
- Use meaningful property names for clear headers
- Consider disabling colors in production logs

### ❌ **Don'ts**
- Don't use for production logging (performance impact)
- Don't display extremely large datasets (>10,000 rows)
- Don't rely on specific formatting (may change in future versions)
- Don't display sensitive data in production environments

---

## 🔗 **Integration Examples**

### **API Response Debugging**
```typescript
async function debugApiResponse(response) {
  console.log("🔍 API Response Debug:");
  console.log(Bun.inspect.table(response.data, ["id", "name", "status"], { colors: true }));

  if (response.errors) {
    console.log("❌ Errors:");
    console.log(Bun.inspect.table(response.errors, null, { colors: false }));
  }
}
```

### **Performance Monitoring**
```typescript
function displayMetrics(metrics) {
  // Sort by performance (slowest first)
  const sorted = [...metrics].sort((a, b) =>
    parseFloat(b.time) - parseFloat(a.time)
  );

  console.log("⚡ Performance Metrics:");
  console.log(Bun.inspect.table(sorted, ["operation", "time", "status"]));
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

  console.log("⚙️ Configuration:");
  console.log(Bun.inspect.table(configArray, ["setting", "value", "type"]));
}
```

---

## 📚 **Summary**

`Bun.inspect.table()` is a **powerful, built-in utility** that provides:

✅ **Beautiful Unicode tables** with perfect alignment
✅ **Flexible property selection** for focused display
✅ **Color customization** for enhanced visibility
✅ **Comprehensive data type support** with intelligent formatting
✅ **Unicode and international character support**
✅ **Performance-optimized rendering** for development use
✅ **Error-tolerant handling** of edge cases

**It's the perfect tool for creating professional console output in Bun applications!** 🚀
