---
title: Problem Solving Template
type: problem
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-13
modified: 2025-11-14
category: problem-solving
description: Debugging & root cause analysis
author: bun-platform
canvas:
  - "[[VIZ-06.canvas]]"
deprecated: false
replaces: ""
severity: medium
tags:
  - problem
  - template
  - problem-solving
usage: Use when debugging, investigating issues, root cause analysis
VIZ-06: []
---
# Problem: {{title}}

## 🚨 Problem Statement
**What's broken or not working?**


## 🔍 Investigation

### Symptoms
- Symptom 1:
- Symptom 2:
- Symptom 3:

### When It Happens
- Trigger 1:
- Trigger 2:

### What We've Tried
- [ ] Attempt 1: ❌ Didn't work
- [ ] Attempt 2: ❌ Didn't work
- [ ] Attempt 3: ⏳ In progress

## 🔬 Root Cause Analysis

### Hypothesis 1
**Theory:**
- Why we think this:
- Evidence:

### Hypothesis 2
**Theory:**
- Why we think this:
- Evidence:

## 💡 Solutions

### Solution 1 (Preferred)
**Approach:**
- Steps:
  1. Step 1
  2. Step 2
  3. Step 3

**Why this works:**
- Explanation

**Trade-offs:**
- Pros:
- Cons:

### Solution 2 (Alternative)
**Approach:**
- Steps:
  1. Step 1
  2. Step 2

**When to use:**
- Use case

## ✅ Implementation

### Chosen Solution
**Solution #1** (or #2)

### Steps Taken
- [ ] Step 1
- [ ] Step 2
- [ ] Step 3

### Code Changes
```typescript
// Before
// After
```

## 🧪 Verification

### Test Cases
- [ ] Test 1: ✅/❌
- [ ] Test 2: ✅/❌
- [ ] Test 3: ✅/❌

### How to Verify
```bash
# Command to test
```

## 📝 Lessons Learned
- Lesson 1:
- Lesson 2:
- What to avoid next time:

## 🔗 Related
- [[Bug Report|Related bug]]
- [[Development Template|Related development]]
- [[Research Template|Research done]]

---
**Status**: `= this.status` | **Severity**: `= this.severity` | **Created**: `= this.created` | **Resolved**: `= date(now)`

