# Console Depth Demonstration

## Your Example
```javascript
const nested = { a: { b: { c: { d: "deep" } } } };
console.log(nested);
```

## Expected Output with Different --console-depth Values

### With --console-depth 2 (default):
```bash
bun --console-depth 2 run script.js
```
**Output:**
```javascript
{ a: { b: [Object] } }
```

### With --console-depth 4:
```bash
bun --console-depth 4 run script.js
```
**Output:**
```javascript
{ a: { b: { c: { d: 'deep' } } } }
```

## How Console Depth Works

The `--console-depth <N>` flag controls how many levels deep Bun will display nested objects in `console.log()` output:

- **Depth 0**: Shows no expansion, all objects become `[Object]`
- **Depth 1**: Shows only the first level of nesting
- **Depth 2**: Shows two levels (default behavior)
- **Depth 3+**: Shows deeper levels of nesting

## Practical Examples

### Example 1: Simple 4-level object
```javascript
const data = {
  user: {
    profile: {
      settings: {
        theme: "dark"
      }
    }
  }
};
```

**With --console-depth 2:**
```javascript
{ user: { profile: [Object] } }
```

**With --console-depth 4:**
```javascript
{ user: { profile: { settings: { theme: 'dark' } } } }
```

### Example 2: Complex fraud detection object
```javascript
const fraudData = {
  transaction: {
    user: {
      device: {
        fingerprint: {
          id: "abc123",
          isRooted: false
        }
      }
    }
  }
};
```

**With --console-depth 2:**
```javascript
{ transaction: { user: [Object] } }
```

**With --console-depth 4:**
```javascript
{ transaction: { user: { device: { fingerprint: { id: 'abc123', isRooted: false } } } } }
```

## Usage in Package.json Scripts

```json
{
  "scripts": {
    "demo:depth-2": "bun --console-depth 2 run script.js",
    "demo:depth-4": "bun --console-depth 4 run script.js",
    "demo:depth-full": "bun --console-depth 10 run script.js"
  }
}
```

## Best Practices

1. **Development**: Use depth 2-3 for readable output
2. **Debugging**: Use depth 4-5 for detailed inspection
3. **Analysis**: Use depth 8-10 for complete object examination
4. **Production**: Use default depth (2) to avoid verbose logs

## Real-World Application

In our fraud detection system, we use different console depths:

```bash
# Quick overview (default depth 2)
bun run cli:analyze

# Detailed analysis (depth 5)
bun --console-depth 5 run cli:analyze --features '{"root_detected":1}'

# Complete inspection (depth 10)
bun --console-depth 10 run debug:full-analysis
```

This allows developers to control the verbosity of output based on their debugging needs.
