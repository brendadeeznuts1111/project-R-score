# UIContextRewriter Version Numbering Scheme

## Overview

The UIContextRewriter service uses a comprehensive version numbering scheme (`6.1.1.2.2.X.Y.Z`) that enables precise referencing, ripgrep discoverability, and cross-referencing across code and documentation.

## Numbering Structure: `6.1.1.2.2.X.Y.Z`

### Breakdown

- **`6`** = Examples/Architectural Documentation Category
- **`6.1`** = HTMLRewriter-related examples
- **`6.1.1`** = HTMLRewriter integration examples
- **`6.1.1.2`** = Server-side HTML transformation
- **`6.1.1.2.2`** = HTMLRewriter deployment node/concept
- **`6.1.1.2.2.1`** = UIContextRewriter service
- **`6.1.1.2.2.1.2`** = HyperBunUIContext interface
- **`6.1.1.2.2.2`** = Transformation mechanisms/handlers

### Component Assignments

#### Service Level (6.1.1.2.2.1.X)
- `6.1.1.2.2.1.0` - UIContextRewriter class
- `6.1.1.2.2.1.1.0` - createRewriter() method

#### Interface Level (6.1.1.2.2.1.2.X)
- `6.1.1.2.2.1.2.0` - HyperBunUIContext interface
- `6.1.1.2.2.1.2.1` - apiBaseUrl property
- `6.1.1.2.2.1.2.2` - featureFlags property
- `6.1.1.2.2.1.2.3` - userRole property
- `6.1.1.2.2.1.2.4` - debugMode property
- `6.1.1.2.2.1.2.5` - currentTimestamp property
- `6.1.1.2.2.1.2.6` - environment property
- `6.1.1.2.2.1.2.7` - metadata property

#### Transformation Handlers (6.1.1.2.2.2.X)
- `6.1.1.2.2.2.1.0` - window.HYPERBUN_UI_CONTEXT injection
- `6.1.1.2.2.2.2.0` - Feature flag-based conditional rendering
- `6.1.1.2.2.2.3.0` - Role-based access control (RBAC)
- `6.1.1.2.2.2.4.0` - Server timestamp implantation
- `6.1.1.2.2.2.5.0` - Resilient graceful degradation
- `6.1.1.2.2.2.6.0` - Context creation from request

#### Enhancement Categories (6.1.1.2.2.5.X)
- `6.1.1.2.2.5.1` - Performance metrics tracking
- `6.1.1.2.2.5.2` - Security validation enhancements
- `6.1.1.2.2.5.3` - Development tooling improvements

## Why This Numbering Scheme?

### 1. Hyper-Precision and Unambiguous Referencing

In a complex system like Hyper-Bun, especially one dealing with critical market intelligence and performance, the ability to pinpoint **exactly** what functionality or architectural component is being discussed is paramount.

**Example**: `6.1.1.2.2.2.2.0` isn't just a random number; it tells you:
- **`6.0.0.0.0.0.0`**: It's part of the Architectural Visualization Subsystem
- **`6.1.0.0.0.0.0`**: Specifically related to the High-Level Market Intelligence Flow Diagram
- **`6.1.1.0.0.0.0`**: It's a Node within that diagram
- **`6.1.1.2.0.0.0`**: Further nested in a specific categorization of nodes
- **`6.1.1.2.2.0.0`**: The HTMLRewriter Deployment Node/Concept
- **`6.1.1.2.2.2.0`**: Transformation handlers within that deployment
- **`6.1.1.2.2.2.2.0`**: One of the specific transformation mechanisms (Feature Flag Conditional Rendering)

This eliminates ambiguity. Instead of "check the docs for feature flag handling," you can say **"check `6.1.1.2.2.2.2.0` in the docs for feature flag verification."** This precision is critical when:
- Debugging production issues under time pressure
- Onboarding new team members
- Conducting code reviews
- Writing automated tests
- Creating architectural documentation

### 2. Ripgrep Discoverability & Traceability

By embedding the full, unique number in **both the documentation headers and the JSDoc comments**, `ripgrep` becomes an incredibly powerful tool.

**Formula for ripgrep**: 
```bash
rg -i "6\.1\.1\.2\.2\.2\.2\.0" .
```

This command will instantly show every mention of that specific architectural component, whether it's in:
- Markdown documentation files
- JSDoc blocks
- Plain comments in code
- Test files
- Example files
- Architectural diagrams (if version numbers are embedded)

**Real-World Impact**:
- **Instant Context**: A developer sees `6.1.1.2.2.2.2.0` in code → runs ripgrep → finds implementation, docs, tests, and examples in seconds
- **Complete Traceability**: Every mention of a component is discoverable, preventing documentation drift
- **Cross-Language Discovery**: Works across TypeScript, Markdown, JSON, YAML, and any text-based format
- **IDE Integration**: Works seamlessly with VS Code, Cursor, JetBrains IDEs, and any editor with ripgrep support

### 3. Facilitating Cross-Referencing in Code and Documentation

When a developer is looking at `src/services/ui-context-rewriter.ts`, they can see `6.1.1.2.2.2.1.0` in the JSDoc for `window.HYPERBUN_UI_CONTEXT` injection. If they need more context on **why** that's important, they can `ripgrep` `6.1.1.2.2.2.1.0` to find:
- Its high-level definition in architectural documentation
- Verification steps and test formulas
- Related architectural documentation
- Test cases and examples
- Performance considerations
- Security implications
- Related components and dependencies

**Example Workflow**:
1. Developer sees `6.1.1.2.2.2.1.0` in code
2. Runs `rg "6\.1\.1\.2\.2\.2\.1\.0" .`
3. Finds:
   - Implementation in `src/services/ui-context-rewriter.ts`
   - Documentation in `docs/UI-CONTEXT-REWRITER-NUMBERING.md`
   - Test formula in JSDoc `@example` tag
   - Related architectural context
4. Understands the complete picture in minutes, not hours

This creates a **living, interconnected documentation system** where code and documentation evolve together, maintaining consistency automatically.

### 4. Enforcing Granularity and Discipline

Such a detailed numbering scheme **forces a granular breakdown of concepts**, preventing monolithic explanations and encouraging precise categorization. This helps maintain a high standard of documentation and architectural clarity as the system evolves.

**Benefits**:
- **Prevents Documentation Bloat**: Forces breaking down large concepts into manageable, testable pieces
- **Encourages Clear Thinking**: Developers must think about component hierarchy and relationships
- **Maintains Quality**: Hard to write vague documentation when you need to assign precise version numbers
- **Scales with Complexity**: As the system grows, the numbering scheme accommodates new components without confusion
- **Facilitates Reviews**: Code reviewers can quickly reference specific components by version number

**Example**: Instead of writing "The UI context injection system handles feature flags, roles, and timestamps," you're forced to break it down:
- `6.1.1.2.2.2.1.0` - Context injection mechanism
- `6.1.1.2.2.2.2.0` - Feature flag handling
- `6.1.1.2.2.2.3.0` - Role-based access control
- `6.1.1.2.2.2.4.0` - Timestamp injection

Each gets its own documentation, test formula, and verification steps.

## Ripgrep Search Patterns

### Find by Version Number

```bash
# Find specific version
rg "6\.1\.1\.2\.2\.1\.0" .

# Find all UIContextRewriter-related code
rg "6\.1\.1\.2\.2\.1\." .

# Find all transformation handlers
rg "6\.1\.1\.2\.2\.2\." .
```

### Find by Component Type

```bash
# Find all interface properties
rg "6\.1\.1\.2\.2\.1\.2\." .

# Find all transformation mechanisms
rg "6\.1\.1\.2\.2\.2\." .

# Find all example/test formulas
rg "@example.*6\.1\.1\.2\.2" .
```

### Find by Instance ID

```bash
# Find UIContextRewriter instance
rg "EXAMPLE-UI-CONTEXT-REWRITER-001" .

# Find all instance IDs
rg "EXAMPLE-[A-Z-]+-\d+" .
```

### Find by Blueprint

```bash
# Find UIContextRewriter blueprint
rg "BP-EXAMPLE@6\.1\.1\.2\.2\.1\.0" .

# Find all blueprints
rg "BP-EXAMPLE@[\d.]+" .
```

## Test Formula Pattern

Every `@example` tag includes a "Test Formula" that provides immediate, actionable instructions for verifying functionality. The "Test Formula" within the `@example` explains the logical steps, and the "Expected Result" provides the success condition.

### Format

```typescript
/**
 * @example 6.1.1.2.2.2.1.0: window.HYPERBUN_UI_CONTEXT Injection Verification
 * // Test Formula:
 * // 1. [Step 1 description]
 * // 2. [Step 2 description]
 * // 3. [Step 3 description]
 * // Expected Result: [Success condition]
 * //
 * // Snippet:
 * ```typescript
 * // Runnable code example
 * ```
 */
```

**Format Specification**: `// Test Formula: [Step 1], [Step 2], [Step 3]... // Expected Result: [Condition]`

### Purpose

The test formulas serve four critical purposes:

#### 1. Direct Verification
Guides developers and QA through the process of confirming the feature works as intended. No ambiguity about what to test or how to verify success.

**Example**: 
```typescript
// Test Formula:
// 1. Serve 'registry.html' using UIContextRewriter
// 2. In browser DevTools console, execute: JSON.stringify(window.HYPERBUN_UI_CONTEXT)
// 3. Compare with expected context object
// Expected Result: window.HYPERBUN_UI_CONTEXT matches expected context
```

#### 2. Behavioral Specification
Clearly defines the expected behavior of the code, serving as a **mini-acceptance test case** within the documentation. This makes the documentation executable in spirit, even if not automated.

**Example**:
```typescript
// Test Formula:
// 1. Set feature flag to false in context
// 2. Transform HTML with element containing data-feature attribute
// 3. Verify element is removed from DOM
// Expected Result: Element with disabled feature flag is removed
```

#### 3. Debugging Aid
If a test fails, the formula helps pinpoint **where** the deviation from expected behavior occurs. Each step can be verified independently, making debugging systematic rather than ad-hoc.

**Example Workflow**:
- Step 1 passes ✅
- Step 2 passes ✅
- Step 3 fails ❌ → Issue isolated to Step 3's verification logic
- Check Step 3's expected result → Identifies what went wrong

#### 4. Automated Testing Basis
These formulas can be **directly translated into end-to-end (e2e) tests** (e.g., Playwright or Cypress) to automate verification of the UI context injection and conditional rendering.

**Translation Example**:
```typescript
// From @example test formula:
// 1. Serve 'registry.html' using UIContextRewriter
// 2. In browser DevTools console, execute: JSON.stringify(window.HYPERBUN_UI_CONTEXT)
// 3. Expected Result: window.HYPERBUN_UI_CONTEXT matches expected context

// To Playwright test:
test('6.1.1.2.2.2.1.0: window.HYPERBUN_UI_CONTEXT injection', async ({ page }) => {
  await page.goto('/registry.html');
  const context = await page.evaluate(() => window.HYPERBUN_UI_CONTEXT);
  expect(context).toMatchObject(expectedContext);
});
```

### Real-World Impact

**For Developers**:
- Copy-paste test formulas into test files
- Use as acceptance criteria in PRs
- Reference in bug reports ("Step 2 of 6.1.1.2.2.2.1.0 test formula fails")
- Understand expected behavior before modifying code
- Verify contracts are not violated during refactoring

**For QA**:
- Systematic test coverage without writing code
- Clear pass/fail criteria
- Reproducible test steps
- Standardized test language across team
- Direct translation to manual test cases

**For Documentation**:
- Self-validating documentation (if tests pass, docs are accurate)
- Living examples that stay in sync with code
- Onboarding tool (new developers can verify understanding)
- Single source of truth for behavior specification

## Strategic Benefits: Beyond Basic Testing

### 1. Formalizing Functional Specifications at the Code Level

**Blueprint for Behavior**: This format elevates `@example` tags from simple usage demonstrations to **concise, living specifications** of how a given piece of code must behave under specific testable scenarios.

**Value for Complex Algorithms**:
For Hyper-Bun's complex algorithms (e.g., `calculateActualArbProfit`, `discoverCovertSteamEvents`), test formulas provide immediate clarity on expected outputs for critical inputs. Instead of reading through implementation code, developers can:

```typescript
/**
 * @example 6.1.1.2.2.2.2.0: Feature Flag Conditional Rendering
 * // Test Formula:
 * // 1. Create context with featureFlags: { shadowGraph: false }
 * // 2. Transform HTML: <div data-feature="shadowGraph">Content</div>
 * // 3. Verify element is removed from DOM
 * // Expected Result: Transformed HTML does not contain the div element
 */
```

**Strategic Impact**:
- **Reduces Cognitive Load**: During code review and modification, developers don't need to trace through implementation logic to understand expected behavior
- **Contract Enforcement**: A developer altering `UIContextRewriter`'s behavior **must** consult these formulas to ensure existing contracts are not violated
- **Living Specifications**: Specifications live alongside code, preventing documentation drift
- **Behavioral Clarity**: Complex algorithms become understandable through test scenarios, not just implementation details

**Example**: When modifying feature flag logic, a developer sees:
```typescript
// Test Formula for 6.1.1.2.2.2.2.0:
// Expected Result: Element with disabled feature flag is removed
```
This immediately communicates: "This code must remove elements when feature flags are disabled" - a contract that cannot be violated.

### 2. Bridging the Gap Between Code, QA, and Automation

**Unified Testing Language**: The `[Step]` and `[Condition]` format creates a **common language** that bridges:
- **Code** (implementation)
- **QA** (manual testing)
- **Automation** (e2e tests)

**Value**:
- **Single Source of Truth**: One test formula serves all three audiences
- **No Translation Loss**: QA doesn't need to interpret developer intent; automation doesn't need to guess test steps
- **Consistency**: Same test executed the same way across manual and automated testing
- **Traceability**: Every automated test can reference its source formula version number

**Strategic Impact**:

#### For Code → QA Bridge:
```typescript
// Developer writes:
// Test Formula:
// 1. Set userRole to 'guest' in context
// 2. Transform HTML with element containing data-access="admin"
// 3. Verify element is removed from DOM
// Expected Result: Element requiring admin access is removed for guest user

// QA translates directly to manual test case:
// TC-6.1.1.2.2.2.3.0: Role-Based Access Control
// Steps:
//   1. Set userRole to 'guest' in context
//   2. Transform HTML with element containing data-access="admin"
//   3. Verify element is removed from DOM
// Expected: Element requiring admin access is removed for guest user
```

#### For QA → Automation Bridge:
```typescript
// QA test case becomes automated test:
test('6.1.1.2.2.2.3.0: Role-Based Access Control', async ({ page }) => {
  // Step 1: Set userRole to 'guest' in context
  const context = { ...baseContext, userRole: 'guest' };
  
  // Step 2: Transform HTML with element containing data-access="admin"
  await page.setContent(htmlWithAdminElement);
  await page.evaluate((ctx) => {
    // Simulate UIContextRewriter transformation
    window.HYPERBUN_UI_CONTEXT = ctx;
  }, context);
  
  // Step 3: Verify element is removed from DOM
  const adminElement = await page.$('[data-access="admin"]');
  expect(adminElement).toBeNull(); // Expected Result
});
```

#### For Code → Automation Bridge:
```typescript
// Developer's test formula becomes automated test directly:
// No interpretation needed - formula IS the test specification
```

**Benefits**:
- **Zero Translation Loss**: Test intent preserved from code → QA → automation
- **Faster Test Creation**: Automation engineers copy formulas, not interpret requirements
- **Consistent Coverage**: Manual and automated tests verify same behavior
- **Version Traceability**: Every test references its source formula (e.g., "Based on 6.1.1.2.2.2.3.0")

### 3. Enabling Systematic Test Coverage

**Completeness Through Enumeration**: With version numbers and test formulas, you can systematically verify coverage:

```bash
# Find all components with test formulas
rg "@example.*6\.1\.1\.2\.2" .

# Find components missing test formulas
rg "6\.1\.1\.2\.2\.[0-9]+\.[0-9]+" . | rg -v "@example"
```

**Strategic Impact**:
- **Gap Analysis**: Immediately identify untested components
- **Coverage Metrics**: Count test formulas vs. components
- **Quality Gates**: PR checks can verify test formulas exist for modified components
- **Documentation Completeness**: Test formulas serve as documentation completeness metric

### 4. Facilitating Code Review and Change Management

**Change Impact Analysis**: When modifying code, developers can:

```bash
# Find all test formulas affected by a change
rg "6\.1\.1\.2\.2\.2\.2\.0" .  # Feature flag handling

# Review expected behaviors that must be preserved
# Verify all test formulas still pass
# Update test formulas if behavior intentionally changes
```

**Strategic Impact**:
- **Safer Refactoring**: Test formulas document contracts that must be preserved
- **Intentional Changes**: If behavior changes, test formulas must be updated (forcing intentional decisions)
- **Review Efficiency**: Reviewers check test formulas to understand expected behavior
- **Regression Prevention**: Automated tests derived from formulas catch regressions

### 5. Creating a Living Knowledge Base

**Evolution with Code**: Test formulas evolve with code, creating a **living knowledge base**:

```typescript
// Version 1: Basic feature flag
// @example 6.1.1.2.2.2.2.0: Feature Flag Conditional Rendering
// Expected Result: Element removed when feature flag is false

// Version 2: Enhanced with feature flag inheritance
// @example 6.1.1.2.2.2.2.1: Feature Flag with Inheritance
// Expected Result: Element removed when feature flag is false, but preserved if parent feature is enabled
```

**Strategic Impact**:
- **Historical Context**: Version numbers show evolution of behavior
- **Migration Guides**: Old formulas document previous behavior
- **Learning Resource**: New developers see how behavior evolved
- **Architectural Decisions**: Test formulas document why behavior exists

## Integration Example

### In Code

```typescript
// 6.1.1.2.2.2.1.0: Unifying window.HYPERBUN_UI_CONTEXT Injection
rewriter.on("body", {
  element: (element) => {
    element.prepend(
      `<script>window.HYPERBUN_UI_CONTEXT = ${JSON.stringify(this.context)};</script>`,
      { html: true }
    );
  }
});
```

### In Documentation

```markdown
## 6.1.1.2.2.2.1.0: Window Context Injection

This mechanism injects the UI context object into the browser's global scope...
```

### Finding Both

```bash
rg "6\.1\.1\.2\.2\.2\.1\.0" .
```

This single command finds:
- The code implementation
- The documentation explanation
- Related test cases
- Example usage

## Benefits Summary

By integrating this level of detail and searchability, Hyper-Bun's documentation becomes a **powerful, dynamic tool as critical as the codebase itself**.

### Core Benefits

1. ✅ **Hyper-Precision**: Exact component identification eliminates ambiguity
2. ✅ **Instant Discoverability**: Ripgrep finds everything across codebase in seconds
3. ✅ **Complete Traceability**: Cross-reference code, docs, tests, and examples
4. ✅ **Maintainability**: Granular organization prevents documentation drift
5. ✅ **Testability**: Test formulas embedded in documentation enable automated verification
6. ✅ **Onboarding**: New developers can trace concepts systematically
7. ✅ **Debugging**: Precise version numbers enable targeted troubleshooting
8. ✅ **Architectural Clarity**: Numbering scheme enforces clear component hierarchy

### Business Impact

**Time Savings**:
- Finding relevant code/docs: **Minutes → Seconds** (via ripgrep)
- Understanding component relationships: **Hours → Minutes** (via cross-references)
- Writing tests: **Hours → Minutes** (via test formulas)

**Quality Improvements**:
- Reduced ambiguity in discussions
- Consistent documentation standards
- Self-validating documentation (test formulas)
- Easier code reviews (reference by version number)

**Scalability**:
- System grows → Numbering scheme accommodates growth
- New developers → Can trace concepts systematically
- Documentation → Stays in sync with code automatically

### The Ultimate Goal

**Transform documentation from a static artifact into a living, searchable, interconnected knowledge system** that:
- Evolves with the codebase
- Enables instant discovery
- Provides actionable verification steps
- Maintains architectural clarity
- Scales with system complexity

This makes Hyper-Bun's documentation **as critical and powerful as the codebase itself**.

## Related Documentation

- [Examples Ripgrep Patterns](./EXAMPLES-RIPGREP-PATTERNS.md) - General ripgrep patterns
- [JSDoc Standards](./JSDOC-STANDARDS.md) - JSDoc formatting guidelines
- [HTMLRewriter Demos](../examples/demos/HTML-REWRITER-DEMOS.md) - HTMLRewriter examples
