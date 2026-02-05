---
title: Bug Reports Master Index
type: bug
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-15
category: core
description: Documentation for Bug-Reports-Master-Index
aliases:
  - Bug Reports Index
  - Issues Index
  - Master Bug Index
author: Sports Analytics Team
canvas: []
deprecated: false
feed_integration: false
properties:
  title: Bug Reports Master Index - 2025-11-14
  date: 2025-11-14
  tags:
    - bug
    - issue
    - index
    - summary
    - problem-solving
  type: documentation
  status: active
  created: 2025-11-14
  updated: 2025-11-14
  description: Master index of all bug reports with status and priority
  category: problem-solving
replaces: ""
severity: medium
tags: []
usage: ""
VIZ-06: []
---

# Bug Reports Master Index - 2025-11-14

## Overview
Complete index of all bug reports created using the new standardized template format.

---

## 🔴 Critical Priority

### 1. Hardcoded API Keys ✅ RESOLVED
- **File**: `Bug-Hardcoded-API-Keys-RESOLVED.md`
- **Status**: ✅ Fixed and Tested
- **Severity**: Critical
- **Component**: Security
- **Resolution**: 9 scripts updated, all hardcoded keys removed

---

## 🟠 High Priority

### 2. Pre-Commit Hook Failing
- **File**: `Bug-Pre-Commit-Hook-Failing.md`
- **Status**: Active
- **Severity**: Medium
- **Priority**: High
- **Component**: CI/CD
- **Description**: Pre-commit hook fails with AST-Grep static analysis

### 3. Vault Connection Latency
- **File**: `Bug-Vault-Connection-Latency.md`
- **Status**: Active
- **Severity**: Medium
- **Priority**: High
- **Component**: Vault Integration
- **Description**: High latency (2457ms average) causing slow operations

### 4. Test Coverage Gaps
- **File**: `Bug-Test-Coverage-Gaps.md`
- **Status**: Active
- **Severity**: Medium
- **Priority**: High
- **Component**: Testing
- **Description**: Missing integration tests for commands

### 5. Timeout Errors - No Retry Logic
- **File**: `Bug-Timeout-Errors-No-Retry.md`
- **Status**: Active
- **Severity**: High
- **Priority**: High
- **Component**: Vault Integration
- **Description**: Operations timeout with no retry logic

### 6. Command Integration Issues
- **File**: `Bug-Command-Integration-Isolated.md`
- **Status**: Active
- **Severity**: Medium
- **Priority**: High
- **Component**: bun-platform-cli
- **Description**: Commands are isolated silos requiring manual steps

---

## 🟡 Medium Priority

### 7. API Parameter Inconsistencies
- **File**: `Bug-API-Parameter-Inconsistencies.md`
- **Status**: Active
- **Severity**: Medium
- **Priority**: Medium
- **Component**: Vault Integration
- **Description**: Different parameter names across API calls

### 8. Rate Limiting - Slow Bulk Operations
- **File**: `Bug-Rate-Limiting-Slow-Bulk-Ops.md`
- **Status**: Active
- **Severity**: Medium
- **Priority**: Medium
- **Component**: Vault Integration
- **Description**: Rate limiting requires 200-300ms delays

### 9. Inconsistent Error Handling
- **File**: `Bug-Inconsistent-Error-Handling.md`
- **Status**: Active
- **Severity**: Medium
- **Priority**: Medium
- **Component**: Error Handling
- **Description**: Different error patterns across scripts

---

## ✅ Resolved Issues

### 10. Dashboard Routing Hardcoded ✅ RESOLVED
- **File**: `Bug-Dashboard-Routing-RESOLVED.md`
- **Status**: ✅ Fixed and Tested
- **Severity**: Medium
- **Component**: Dashboard System
- **Resolution**: Dynamic routing implemented

---

## 📊 Statistics

| Status | Count |
|--------|-------|
| **Active** | 8 |
| **Resolved** | 2 |
| **Critical** | 1 (resolved) |
| **High Priority** | 5 |
| **Medium Priority** | 3 |
| **Total** | 10 |

---

## 📋 Quick Reference

### By Component
- **Vault Integration**: 4 issues (latency, timeout, API params, rate limiting)
- **CI/CD**: 1 issue (pre-commit hook)
- **Testing**: 1 issue (coverage gaps)
- **Security**: 1 issue (hardcoded keys - resolved)
- **Error Handling**: 1 issue (inconsistent patterns)
- **bun-platform-cli**: 1 issue (command integration)
- **Dashboard System**: 1 issue (routing - resolved)

### By Severity
- **Critical**: 1 (resolved)
- **High**: 5
- **Medium**: 4

### By Priority
- **Critical**: 1 (resolved)
- **High**: 5
- **Medium**: 3

---

## 🔗 Related Documents

- `Bug-Reports-Summary.md` - Summary of active bug reports
- `Issues-Closed-Summary.md` - Summary of resolved issues
- Bug Report Template: `06-Templates/Problem-Solving/Bug Report.md`

---

## 📝 Notes

All bug reports follow the new standardized template format with:
- ✅ Complete `properties:` structure
- ✅ All required fields populated
- ✅ Client context structure (for API Gateway integration)
- ✅ Comprehensive metadata
- ✅ Proper tags and aliases
- ✅ Fix status tracking

---

**Last Updated**: 2025-11-14  
**Total Bug Reports**: 10 (8 active, 2 resolved)

