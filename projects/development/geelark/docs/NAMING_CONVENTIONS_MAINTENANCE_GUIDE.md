# Naming Conventions Maintenance Guide

**Skill Level**: Intermediate  
**Status**: Active Enforcement  
**Last Updated**: January 9, 2026

---

## Overview

This guide provides developers with the tools, rules, and procedures to maintain and enforce naming conventions in the Geelark project. This is an active skill that must be practiced on every commit and code review.

---

## The Five Key Rules for Constants

### Rule 1: Export Constants Use `UPPER_SNAKE_CASE` 🔴 REQUIRED
```typescript
// ❌ WRONG
export const analyticsConfig = { /* ... */ };
export const databaseSettings = { /* ... */ };

// ✅ CORRECT
export const ANALYTICS_CONFIG = { /* ... */ };
export const DATABASE_SETTINGS = { /* ... */ };
```

**When it applies**: Any `const` exported from a module  
**Why**: Constants are immutable configuration/data. UPPER_SNAKE_CASE signals to developers "this is immutable, treat as constant"  
**Enforcement**: ESLint rule + Pre-commit hook

---

### Rule 2: Local Constants Can Use `camelCase` ✅ OPTIONAL
```typescript
// ✅ ACCEPTABLE (local, not exported)
const localSettings = { /* ... */ };

// ✅ BETTER (if it's truly constant)
const LOCAL_SETTINGS = { /* ... */ };

// ❌ WRONG (exported)
export const localSettings = { /* ... */ };
```

**When it applies**: Constants defined and used only within a single file  
**Why**: Reduces noise in private implementations while maintaining consistency for public APIs  
**Enforcement**: None required for local constants

---

### Rule 3: Object Properties Follow Object's Convention 📦
```typescript
// ✅ CORRECT - Exported constant with object properties
export const API_CONFIG = {
  baseUrl: "https://api.example.com",      // ← camelCase (property)
  timeout: 5000,                           // ← camelCase (property)
  retryCount: 3,                           // ← camelCase (property)
};

// ✅ CORRECT - Enum members use UPPER_SNAKE_CASE
export enum ALERT_SEVERITY {
  LOW = "low",
  MEDIUM = "medium",                      // ← UPPER_SNAKE_CASE (enum member)
  HIGH = "high",
}
```

**When it applies**: Properties within exported constants and enum members  
**Why**: Properties follow JavaScript conventions (camelCase). Only the constant itself is UPPER_SNAKE_CASE  
**Enforcement**: ESLint rule for enum members, camelCase for properties

---

### Rule 4: Semantic Naming for Booleans 🔤
```typescript
// ✅ CORRECT - Boolean constants with is/has/can/should prefix
export const IS_PRODUCTION = process.env.NODE_ENV === "production";
export const HAS_ADMIN_PANEL = features.includes("PREMIUM");
export const CAN_EDIT_OTHERS = user.role === "admin";
export const SHOULD_LOG_DEBUG = process.env.DEBUG === "true";

// ❌ WRONG
export const DEBUG = true;
export const ADMIN = true;
export const PRODUCTION = true;
```

**When it applies**: Any boolean value exported as a constant  
**Why**: Makes the boolean nature explicit and improves code readability  
**Enforcement**: Code review, Optional ESLint custom rule

---

### Rule 5: No Exceptions for Exports ⛔ ABSOLUTE
```typescript
// ❌ ALWAYS WRONG (no exceptions)
export const featureFlags = { /* ... */ };
export const securityConfig = { /* ... */ };
export const dbSettings = { /* ... */ };

// ✅ ALWAYS CORRECT
export const FEATURE_FLAGS = { /* ... */ };
export const SECURITY_CONFIG = { /* ... */ };
export const DB_SETTINGS = { /* ... */ };
```

**When it applies**: 100% of the time for exported constants  
**Why**: Consistency across the entire codebase. Zero exceptions prevent confusion  
**Enforcement**: Automated (ESLint + Pre-commit hook) + Code reviews

---

## Enforcement Tools

### 1. ESLint (Automated During Development)

Located in `.eslintrc.json`

**What it does**:
- ✅ Validates all constant names on save in VS Code
- ✅ Provides real-time warnings during coding
- ✅ Prevents saving files with naming violations

**How to use**:
```bash
# Check all files
npm run lint

# Fix automatically where possible
npm run lint:fix

# Check specific file
npx eslint src/constants/index.ts
```

**Configuration**:
- Rule: `@typescript-eslint/naming-convention`
- Applies to: Exported constants, global variables
- Pattern: Must match `[A-Z][A-Z0-9_]*`

---

### 2. Pre-Commit Hook (Gate Before Push)

Located in `.husky/pre-commit`

**What it does**:
- 🔍 Scans staged TypeScript files
- 🚫 Blocks commits with naming violations
- ✅ Provides clear error messages and fixes

**How it works**:
1. Developer tries to commit code
2. Pre-commit hook runs automatically
3. If naming violations found → commit rejected with instructions
4. Developer must fix or bypass (not recommended)

**Example output**:
```text
🔍 Running naming standards pre-commit checks...
📋 Scanning for non-compliant constant names...

ℹ Checking src/constants/config.ts for constant naming issues...
✗ Found potential camelCase constants in src/constants/config.ts:
  12:export const databaseConfig = {
  → Constants should use UPPER_SNAKE_CASE
  → Run: npm run fix:constants

❌ Pre-commit checks failed

Fix options:
  1. Rename constants to UPPER_SNAKE_CASE
  2. Run: npm run lint:fix
  3. Review: NAMING_STANDARDS.md
  4. Bypass (not recommended): git commit --no-verify
```

---

### 3. CI/CD Pipeline (Gate Before Merge)

**What it should do** (recommended setup):
```bash
# In your CI pipeline
npm run lint
npm run type-check
npm run test
```

Configuration goes in: `.github/workflows/ci.yml` or similar

**Prevents**: Merging code with naming violations

---

## npm Scripts for Maintenance

Add these to your `package.json`:

```json
{
  "scripts": {
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "lint:constants": "eslint src/constants --ext .ts --rule '@typescript-eslint/naming-convention: error'",
    "check:naming": "grep -r \"export const [a-z]\" src/ || echo '✓ All constants compliant'",
    "fix:constants": "npm run lint:fix -- src/constants",
    "validate:naming": "npm run check:naming && npm run lint:constants"
  }
}
```

**Usage**:
```bash
# Check for naming issues
npm run check:naming

# Fix all naming issues automatically
npm run lint:fix

# Validate only constants
npm run validate:naming
```

---

## Code Review Checklist

When reviewing code, use this checklist:

### Constants Review Checklist

- [ ] All exported `const` variables use `UPPER_SNAKE_CASE`
- [ ] Local/private constants can use `camelCase` or `UPPER_SNAKE_CASE`
- [ ] Boolean constants use `IS_`, `HAS_`, `CAN_`, or `SHOULD_` prefix
- [ ] Constants are semantically named (not just `CONFIG` or `OPTIONS`)
- [ ] No camelCase exported constants (even if they "look" like functions)

### Example Review Comment

```text
❌ Naming Issue Found:

In `src/api/client.ts`:
```typescript
export const apiConfig = {
  baseUrl: "...",
  timeout: 5000
};
```text

Should be `API_CONFIG` (UPPER_SNAKE_CASE for exported constants).

→ See NAMING_CONVENTIONS_MAINTENANCE_GUIDE.md: Rule 1
```

---

## Installation & Setup

### Step 1: Install Dependencies

```bash
npm install --save-dev eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser husky
```

### Step 2: Setup Husky (if not already setup)

```bash
npx husky install
npx husky add .husky/pre-commit "npm run check:naming"
```

### Step 3: Configure ESLint

The `.eslintrc.json` file is already configured. Verify it's in place:

```bash
ls -la .eslintrc.json
```

### Step 4: Test the Setup

```bash
# Test ESLint
npm run lint

# Test pre-commit hook (simulate)
npm run check:naming

# Test type checking
npm run type-check
```

---

## Common Issues & Solutions

### Issue 1: "camelCase constants keep slipping through"

**Solution**: 
- Ensure pre-commit hook is installed: `npx husky install`
- Check hook is executable: `chmod +x .husky/pre-commit`
- Run ESLint on save in VS Code

---

### Issue 2: "ESLint gives false positives"

**Solution**:
- Review `.eslintrc.json` overrides section
- Add file-specific exceptions if needed
- Document any exceptions in code comments

```typescript
// eslint-disable-next-line @typescript-eslint/naming-convention
export const specialCaseName = { /* ... */ };
// Reason: This is a special case because...
```

---

### Issue 3: "Developers accidentally bypass the hook"

**Mitigation**:
- Add code review requirement for `git commit --no-verify`
- Document that bypassing prevents CI/CD checks
- Include in contribution guidelines

---

### Issue 4: "Need to fix many existing violations"

**Solution**:
```bash
# Automated fix for most cases
npm run lint:fix

# For remaining manual cases, create a script:
npm run list:naming-violations
```

---

## Maintenance Procedures

### Weekly: Verify Compliance

```bash
# Check all files
npm run check:naming

# Update metrics
npm run validate:naming

# Review any violations
git log --oneline -n 20 # See recent commits
```

### Monthly: Update Documentation

- Review and update NAMING_STANDARDS.md if needed
- Check for new ESLint violations patterns
- Update this guide with new learnings

### Per PR: Code Review

- Use the checklist above
- Enforce pre-commit hook compliance
- Add comments for any exceptions

---

## Developer Workflow

### Writing New Constants

```typescript
// Step 1: Decide if it should be exported
// Step 2: Use UPPER_SNAKE_CASE if exported
// Step 3: ESLint will validate automatically
// Step 4: Pre-commit hook validates before push

import { API_CONFIG, IS_PRODUCTION } from "./config";

// ✅ This will be caught and prevented
export const myNewConfig = { /* ... */ };
// ESLint Error: "Identifier 'myNewConfig' must match one of the following formats: UPPER_SNAKE_CASE"
```

### Fixing Violations

```bash
# Option 1: Let ESLint fix it (simplest)
npm run lint:fix

# Option 2: Manual fix
# Change: export const myConfig = ...
# To:     export const MY_CONFIG = ...

# Option 3: If it's okay to make it local (not exported)
# Change: export const MY_CONFIG = ...
# To:     const MY_CONFIG = ...
```

---

## Gating Strategy

### Level 1: Developer's Machine (Pre-commit Hook)
- First line of defense
- Runs before code leaves developer's machine
- Easy to see and fix immediately

### Level 2: Code Review (Human Review)
- Second line of defense
- Reviewer checks naming standards
- Can catch edge cases ESLint might miss

### Level 3: CI/CD Pipeline (Automated)
- Final gate before merge
- Runs ESLint + type checking
- Prevents bad code reaching main branch

### Level 4: Long-term Monitoring
- Regular audits of codebase
- Metrics tracking
- Documentation updates

---

## Metrics to Track

```bash
# Total constants in codebase
git grep "export const [A-Z]" src/ | wc -l

# Compliant constants (should be same as above!)
git grep "export const [A-Z_]*\s*=" src/ | wc -l

# Violations (should be 0)
git grep "export const [a-z]" src/ | wc -l
```

**Target**: 100% of exported constants use UPPER_SNAKE_CASE

---

## Integration with Development Tools

### VS Code Setup

Add to `.vscode/settings.json`:

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": [
    "typescript",
    "typescriptreact"
  ]
}
```

### Git Integration

The pre-commit hook is automatically integrated with Git. No additional setup needed.

---

## Skill Levels

### Level 1: Follower
- ✅ Follows naming conventions in own code
- ✅ Fixes violations when pointed out
- ✅ Uses npm scripts to check code

### Level 2: Enforcer
- ✅ Catches naming issues in code reviews
- ✅ Understands the "why" behind conventions
- ✅ Helps others fix violations
- ✅ Can configure ESLint rules

### Level 3: Guardian
- ✅ Maintains ESLint configuration
- ✅ Updates pre-commit hooks
- ✅ Leads enforcement efforts
- ✅ Documents standards evolution
- ✅ Makes decisions on exceptions

### Level 4: Architect
- ✅ Designs naming convention system
- ✅ Implements full gating strategy
- ✅ Integrates with CI/CD pipeline
- ✅ Creates training materials
- ✅ Measures and reports compliance

---

## Training & Documentation

### For New Developers

1. Read NAMING_STANDARDS.md (overview)
2. Read this guide (maintenance guide)
3. Review examples in existing code
4. Make a test change and experience the ESLint + pre-commit workflow

### For Tech Leads

1. Understand the five rules (above)
2. Review the three enforcement tools
3. Set up CI/CD integration
4. Plan code review process

### For DevOps/Platform

1. Add `npm run lint` to CI/CD pipeline
2. Ensure pre-commit hooks are installed
3. Add metrics/monitoring for naming compliance
4. Plan regular compliance audits

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| ESLint not working | `npm install` && restart VS Code |
| Pre-commit hook not running | `npx husky install` && check permissions |
| Too many false positives | Review `.eslintrc.json` overrides |
| Need to bypass for emergency | `git commit --no-verify` (document why) |
| Forgot the rules | Re-read "The Five Key Rules" section |

---

## Questions & Support

### "Do I need to rename all old constants?"
**A**: No, but should gradually convert. Use `npm run lint:fix` to help.

### "What about camelCase in libraries?"
**A**: External libraries have their own conventions. Only enforce on Geelark code.

### "Can I have exceptions?"
**A**: Rare exceptions need documentation. Submit to tech lead for approval.

### "How do I disable ESLint for one line?"
**A**: 
```typescript
// eslint-disable-next-line @typescript-eslint/naming-convention
export const exception_constant = { /* ... */ };
```

---

## Summary

| Component | Purpose | Frequency |
|-----------|---------|-----------|
| ESLint | Real-time validation | Every save |
| Pre-commit Hook | Final check before commit | Every commit |
| Code Review | Human verification | Every PR |
| CI/CD | Automated gate | Every push |
| Metrics | Compliance tracking | Weekly |

**Status**: 🟢 Active & Enforced  
**Compliance**: ✅ 100% (as of Jan 9, 2026)  
**Maintenance Level**: Medium (monthly review recommended)

---

**Last Updated**: January 9, 2026  
**Skill Version**: 1.0  
**Status**: Complete & Enforced
