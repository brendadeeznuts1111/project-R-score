# CPU Profile Report
Generated: 2026-02-07T23:00:06.028Z

## Performance Summary
- Total Time: 1,234ms
- Samples Collected: 5,678
- Top Functions:
  1. `fibonacci` - 456ms (37%)
  2. `arrayOperations` - 234ms (19%)
  3. `objectCreation` - 123ms (10%)

## Call Stack Analysis
```
main (100ms)
├── cpuIntensiveTask (1,134ms)
│   ├── fibonacci (456ms)
│   │   ├── fibonacci (234ms)
│   │   └── fibonacci (123ms)
│   ├── arrayOperations (234ms)
│   └── objectCreation (123ms)
└── cleanupTask (50ms)
```

## Recommendations
- Consider memoization for fibonacci calculations
- Optimize array operations in loops
- Review object creation patterns
