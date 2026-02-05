---
title: Bug Hardcoded Api Keys
type: bug
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-15
category: core
description: Documentation for Bug-Hardcoded-API-Keys
aliases:
  - "Bug: Hardcoded API Keys"
  - "Security: API Key Exposure"
author: Sports Analytics Team
deprecated: false
properties:
  title: Hardcoded API Keys in Scripts - Security Risk
  date: 2025-11-14
  tags:
    - bug
    - security
    - issue
    - debugging
    - problem-solving
  type: bug
  status: resolved
  created: 2025-11-14
  updated: 2025-11-14
  severity: critical
  priority: critical
  description: API keys hardcoded in scripts as fallback values, exposing sensitive credentials
  category: problem-solving
  assignee: ""
  reported_by: ""
  component: security
  version: ""
  browser: ""
  os: ""
  steps_to_reproduce: []
  expected_behavior: Scripts should fail gracefully if API keys are not set, without exposing hardcoded fallbacks
  actual_behavior: Scripts contain hardcoded API keys as fallback values, exposing credentials in source code
  workaround: Remove hardcoded keys manually from scripts
  root_cause: Development convenience led to hardcoded fallback values
  fix_status: Fixed
  test_status: Tested
  archived: true
replaces: ""
severity: medium
tags: []
usage: ""
---

# Hardcoded API Keys in Scripts - Security Risk

## Description
Multiple scripts contain hardcoded API keys as fallback values when environment variables are not set. This exposes sensitive credentials in source code, creating a security risk.

## Steps to Reproduce
1. Search codebase for `OBSIDIAN_API_KEY ||`
2. Find instances like: `const API_KEY = Bun.env.OBSIDIAN_API_KEY || 'hardcoded-key';`
3. Verify hardcoded keys are present in source code

## Expected Behavior
Scripts should:
- Check for environment variables
- Fail gracefully with clear error messages if keys are missing
- Never expose hardcoded credentials

## Actual Behavior
Scripts contain patterns like:
```typescript
const API_KEY = Bun.env.OBSIDIAN_API_KEY || 'd4e11d4f5e84cfc6c610ba01d659a5822d9e946936769525d5ee1320dce3a97a';
```

## Environment
- OS: All
- Browser/Runtime: Bun
- Version: All

## Related Files
- `scripts/organize-vault-complete.ts`
- `scripts/enhance-vault-connection.ts`
- `scripts/setup-sports-projects-vault.ts`
- `scripts/fix-home-dataview.ts`
- `scripts/enhance-home-page.ts`
- `scripts/organize-inbox.ts`
- `scripts/finalize-inbox-cleanup.ts`
- `scripts/preserve-base-file.ts`
- `scripts/create-vault-inventory.ts`
- `scripts/rename-base-file.ts`

## Workaround
Manually remove hardcoded keys and ensure environment variables are set

## Root Cause
Development convenience - using hardcoded fallbacks for faster development without considering security implications

## Fix Status
- [x] Fixed - 9 scripts updated, all hardcoded keys removed
- [x] Tested - Verified scripts fail-fast if env var not set
- [x] Deployed - See Bug-Hardcoded-API-Keys-RESOLVED.md for details

## Status: RESOLVED ✅
This issue has been resolved. See `Bug-Hardcoded-API-Keys-RESOLVED.md` for complete resolution details.

## Notes
**CRITICAL SECURITY ISSUE** - Must be fixed immediately:
1. Remove all hardcoded API keys from scripts
2. Update scripts to fail if keys are not set:
   ```typescript
   const API_KEY = Bun.env.OBSIDIAN_API_KEY;
   if (!API_KEY) {
     console.error('❌ OBSIDIAN_API_KEY not set');
     process.exit(1);
   }
   ```
3. Rotate exposed API keys
4. Add security scanning to CI/CD pipeline
5. Review all scripts for similar patterns

