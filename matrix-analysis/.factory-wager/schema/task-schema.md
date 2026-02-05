# FactoryWager Task Schema

## Standardized Column Values

| Column | Values | Description |
|--------|--------|-------------|
| **status** | pending, in-progress, review, completed, blocked, cancelled | Current task state |
| **priority** | P0, P1, P2, P3, P4 | Task priority (P0 = highest) |
| **trend** | ↑, →, ↓, ↗, ↘, ◇ | Progress trend indicators |
| **severity** | critical, high, medium, low, info | Issue severity level |
| **risk** | high, medium, low, none | Risk assessment |
| **effort** | 1, 2, 3, 5, 8, 13 | Fibonacci effort points |

## Value Definitions

### Status

- **pending**: Task not yet started
- **in-progress**: Task currently being worked on
- **review**: Task completed, awaiting review
- **completed**: Task finished and verified
- **blocked**: Task blocked by dependencies
- **cancelled**: Task no longer needed

### Priority

- **P0**: Critical - immediate attention required
- **P1**: High - urgent, next priority
- **P2**: Medium - normal priority
- **P3**: Low - can be deferred
- **P4**: Very low - backlog item

### Trend

- **↑**: Improving/Upward progress
- **→**: Stable/No change
- **↓**: Declining/Downward progress
- **↗**: Accelerating improvement
- **↘**: Accelerating decline
- **◇**: Neutral/Unknown

### Severity

- **critical**: System-breaking issue
- **high**: Major functionality impacted
- **medium**: Partial functionality affected
- **low**: Minor issue/cosmetic
- **info**: Informational/enhancement

### Risk

- **high**: High risk of failure/impact
- **medium**: Moderate risk level
- **low**: Low risk/impact
- **none**: No significant risk

### Effort (Fibonacci)

- **1**: Very small task (hours)
- **2**: Small task (half day)
- **3**: Medium task (full day)
- **5**: Large task (2-3 days)
- **8**: Very large task (week)
- **13**: Epic task (multiple weeks)
