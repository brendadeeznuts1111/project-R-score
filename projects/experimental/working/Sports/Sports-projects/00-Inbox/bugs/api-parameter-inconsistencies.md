---
title: Bug Api Parameter Inconsistencies
type: bug
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-15
category: core
description: Documentation for Bug-API-Parameter-Inconsistencies
acceptEncoding: ""
acceptLanguage: ""
aliases:
  - "Bug: API Parameter Inconsistencies"
  - "Code Quality: Parameter Naming"
author: Sports Analytics Team
browser: ""
cacheControl: ""
connectionType: ""
cookies: {}
cookiesRaw: ""
deprecated: false
dns: ""
e_tag: ""
etag: ""
ip: ""
ip4: ""
ip6: ""
ipv4: ""
ipv6: ""
os: ""
properties:
  title: API Parameter Inconsistencies - Different Parameter Names
  date: 2025-11-14
  tags:
    - bug
    - api
    - issue
    - debugging
    - problem-solving
    - code-quality
  type: bug
  status: active
  created: 2025-11-14
  updated: 2025-11-14
  severity: medium
  priority: medium
  description: Different parameter names used across API calls causing confusion and errors
  category: problem-solving
  assignee: ""
  reported_by: ""
  component: vault-integration
  version: ""
  browser: ""
  os: ""
  steps_to_reproduce: []
  expected_behavior: Consistent parameter names across all API calls (e.g., always use 'filePath' or always use 'targetIdentifier')
  actual_behavior: "Different parameter names: 'targetType' + 'targetIdentifier' (update_note), 'filePath' (delete_note, read_note)"
  workaround: Remember different parameter names for each API call
  root_cause: API wrapper functions not standardized. Different functions use different naming conventions.
  fix_status: ""
  test_status: ""
  archived: false
referer: ""
referrer: ""
replaces: ""
requestId: ""
requestMethod: GET
requestPath: ""
severity: medium
tags: []
usage: ""
user_agent: ""
userAgentRaw: ""
xff: []
xForwardedFor: []
---

# API Parameter Inconsistencies - Different Parameter Names

## Description
Different parameter names are used across API calls, causing confusion, errors, and failed operations. This makes the API harder to use and maintain.

## Steps to Reproduce
1. Use `update_note` API - requires `targetType` + `targetIdentifier`
2. Use `delete_note` API - requires `filePath`
3. Use `read_note` API - requires `filePath`
4. Observe confusion and potential errors from inconsistent naming

## Expected Behavior
All API calls should use consistent parameter names:
- Either always use `filePath` for file operations
- Or always use `targetType` + `targetIdentifier` for all operations
- Consistent naming reduces confusion and errors

## Actual Behavior
**Inconsistent Parameter Names**:
- `update_note`: Uses `targetType` + `targetIdentifier`
- `delete_note`: Uses `filePath`
- `read_note`: Uses `filePath`

**Impact**:
- Confusion when switching between API calls
- Errors from using wrong parameter names
- Failed operations
- Harder to maintain and document

## Environment
- OS: All
- Browser/Runtime: Bun
- Version: All
- API: Obsidian Local REST API

## Related Files
- `scripts/lib/obsidian-api.ts` - API wrapper functions
- All scripts using vault operations
- API documentation

## Workaround
Remember different parameter names for each API call (error-prone)

## Root Cause
API wrapper functions were created at different times without standardization. Different functions use different naming conventions based on Obsidian API structure.

## Fix Status
- [ ] Not Started
- [ ] In Progress
- [ ] Fixed
- [ ] Tested
- [ ] Deployed

## Notes
**Impact**:
- Developer confusion
- Increased error rate
- Harder to maintain
- Poor developer experience

**Solution Required**:
1. Standardize API wrapper functions
2. Choose consistent parameter naming (recommend `filePath` for all file operations)
3. Update all API calls to use consistent names
4. Update documentation
5. Add TypeScript types for better IDE support

**Recommendation**:
- Use `filePath` for all file operations (simpler, more intuitive)
- Create wrapper functions that normalize parameter names
- Add TypeScript types for better type safety

