---
name: Performance Issue
about: Report performance problems or bottlenecks
title: "[PERFORMANCE] "
labels: ["performance", "needs-triage"]
assignees: ""
---

## 🐌 Performance Issue Description

Describe the performance problem you're experiencing.

## 📊 Performance Metrics

Please provide specific performance measurements:

### Load Times

- Initial load: [e.g. 8.5 seconds]
- Page navigation: [e.g. 2.3 seconds]
- API response: [e.g. 1.2 seconds]

### Resource Usage

- Memory usage: [e.g. 450MB peak]
- CPU usage: [e.g. 25% average]
- Network requests: [e.g. 47 requests, 2.3MB]
- Bundle size: [e.g. 4.2MB minified]

### User Experience

- [ ] Page feels slow/laggy
- [ ] High memory consumption
- [ ] Excessive network requests
- [ ] Blocking operations
- [ ] Poor mobile performance

## 🔄 Reproduction Steps

1.
2.
3.
4.

## 🎯 Expected Performance

What performance metrics would you consider acceptable?

## 📈 Current Performance

What are the actual performance metrics you're observing?

## 🔍 Investigation Details

### Browser DevTools

Please include relevant browser performance data:

```javascript
// Performance timing
console.log(performance.timing);

// Memory usage
console.log(performance.memory);
```

### Network Analysis

- [ ] Slow API responses
- [ ] Large asset sizes
- [ ] Too many requests
- [ ] Blocking resources

### Bundle Analysis

- [ ] Large JavaScript bundles
- [ ] Unused code included
- [ ] Inefficient imports
- [ ] Missing code splitting

## 📋 Environment

**Browser:**

- [ ] Chrome [Version]
- [ ] Firefox [Version]
- [ ] Safari [Version]
- [ ] Edge [Version]

**Device:**

- [ ] Desktop
- [ ] Mobile
- [ ] Tablet
- [ ] Other: [Specify]

**Connection:**

- [ ] WiFi
- [ ] 4G/5G
- [ ] Ethernet
- [ ] Other: [Specify]

**Application Version:**
[Specify version]

## 🛠️ Optimization Attempts

What have you already tried to improve performance?

- [ ] Cleared browser cache
- [ ] Tested in different browsers
- [ ] Checked network conditions
- [ ] Reviewed bundle analysis
- [ ] Other: [Specify]

## 📊 Additional Context

Add any other context, screenshots, or performance profiles:

### Lighthouse Scores (if available)

- Performance: [Score]
- Accessibility: [Score]
- Best Practices: [Score]
- SEO: [Score]

### Bundle Analysis

[Include bundle analyzer screenshots or data]

## ✅ Acceptance Criteria

Define what would resolve this performance issue:

- [ ] Load time under [X] seconds
- [ ] Memory usage under [X] MB
- [ ] Bundle size under [X] MB
- [ ] Lighthouse score above [X]
- [ ] Smooth 60fps animations
- [ ] Responsive on mobile devices

## 🏷️ Related Issues

- Related to #ISSUE_NUMBER
- Depends on #ISSUE_NUMBER
- Blocks #ISSUE_NUMBER

## 📈 Priority

- [ ] Low - Minor annoyance
- [ ] Medium - Affects user experience
- [ ] High - Significant performance degradation
- [ ] Critical - Application unusable
