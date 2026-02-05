---
name: test-flow
description: |
  Simple test flow for validating the FlowAgent engine.
  
  Triggers: "test", "validate"
---

# Test Flow

Simple test flow with BEGIN and END nodes.

### NODE: BEGIN
```ts
async () => {
  console.log("Starting test flow...");
  return "STEP1";
}
```

### NODE: STEP1
```ts
async () => {
  console.log("Step 1 executed");
  return "STEP2";
}
```

### NODE: STEP2
```ts
async () => {
  console.log("Step 2 executed");
  return "END";
}
```

### NODE: END
```ts
async () => {
  console.log("Test flow completed");
  return "END";
}
```
