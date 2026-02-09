# 🔍 FactoryWager CLI Dry-Run Mode

## Overview
Dry-run mode allows you to preview operations before executing them, showing exactly what would happen without making any changes.

## Usage
```bash
fw-cli <command> [options] --dryrun
# or
fw-cli <command> [options] -n
```

## Features

### 🎯 Operation Classification
- **Safe Operations** ✅ (read-only): DNS list, status check, domain list
- **Modify Operations** ⚠️ (caution): DNS add/update, domain create
- **Destructive Operations** 🚨 (dangerous): DNS delete, domain delete

### 📊 Preview Information
- **Operation Type**: Read, Modify, or Destructive
- **Impact Level**: Low, Medium, or High
- **Risk Assessment**: Safe, Caution, or Dangerous
- **API Details**: Method, endpoint, and data preview
- **Mock Response**: Realistic response data

### 📋 Summary Report
- Total operations count
- Operation type breakdown
- Warning for dangerous operations
- Execution guidance

## Examples

### Safe Operation (DNS List)
```bash
$ fw-cli dns list --dryrun

🔍 DRY RUN MODE ENABLED
   No changes will be executed
   Previewing operations only...

✅ READ: GET /zones/zone123/dns_records
   Impact: 🟢 Low

📋 DRY RUN SUMMARY
==================
Total Operations: 1
  read: 1

💡 To execute these operations, run without --dryrun flag
```

### Destructive Operation (DNS Delete)
```bash
$ fw-cli dns delete test.example.com --dryrun

🔍 DRY RUN MODE ENABLED
   No changes will be executed
   Previewing operations only...

🚨 DESTRUCTIVE: DELETE /zones/zone123/dns_records/record456
   Impact: 🔴 High
   Data: {"id":"record456","name":"test.example.com"}

📋 DRY RUN SUMMARY
==================
Total Operations: 1
  destructive: 1

🚨 WARNING: 1 dangerous operation(s) detected!

💡 To execute these operations, run without --dryrun flag
```

### Complex Operation (Domain Creation)
```bash
$ fw-cli domains create new.factory-wager.com github --dryrun

🔍 DRY RUN MODE ENABLED
   No changes will be executed
   Previewing operations only...

⚠️ MODIFY: POST /zones/zone123/dns_records
   Impact: 🟡 Medium
   Data: {
    "name": "new.factory-wager.com",
    "type": "CNAME",
    "content": "brendadeeznuts1111.github.io"
   }

📋 DRY RUN SUMMARY
==================
Total Operations: 1
  modify: 1

💡 To execute these operations, run without --dryrun flag
```

## Benefits

### 🔒 Safety First
- Preview destructive operations before execution
- Understand impact of changes
- Avoid accidental modifications

### 📈 Planning & Testing
- Test command syntax and parameters
- Validate API call structure
- Plan bulk operations safely

### 🎓 Learning & Documentation
- Understand CLI behavior
- Document operational procedures
- Train team members safely

## Integration with Performance Optimizations

Dry-run mode works seamlessly with:
- **Response Caching**: Mock responses cached for consistency
- **Connection Pooling**: No actual connections used in dry-run
- **Request Batching**: Preview batch operations efficiently

## Best Practices

1. **Always use dry-run for:**
   - First-time operations
   - Bulk changes
   - Destructive operations
   - Production environments

2. **Review the summary:**
   - Check operation count
   - Verify risk levels
   - Validate data parameters

3. **Test before execute:**
   - Run with --dryrun first
   - Review the preview
   - Execute without --dryrun when confident

## Advanced Usage

### Combining with Other Options
```bash
# Preview performance test
fw-cli performance test --dryrun

# Preview batch operations
fw-cli batch create domains.json --dryrun

# Preview deployment
fw-cli deploy content ./docs --dryrun
```

### Script Integration
```bash
#!/bin/bash
# Safe deployment script

echo "Previewing deployment..."
fw-cli deploy content ./dist --dryrun

echo "Continue with actual deployment? (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    fw-cli deploy content ./dist
fi
```

The dry-run mode ensures safe, predictable, and well-documented infrastructure management! 🚀
