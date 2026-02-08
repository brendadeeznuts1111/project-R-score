# 📋 FactoryWager CLI Dry-Run Examples - Actual Output

## 1. Safe preview of DNS operations

```bash
$ fw-cli dns list --dryrun

🔍 DRY RUN MODE ENABLED
   No changes will be executed
   Previewing operations only...

✅ READ: GET /zones/a3b7ba4bb62cb1b177b04b8675250674/dns_records
   Impact: 🟢 Low

📋 DRY RUN SUMMARY
==================
Total Operations: 1
  read: 1

💡 To execute these operations, run without --dryrun flag
```

---

## 2. Preview destructive operation

```bash
$ fw-cli dns delete test.example.com --dryrun

🔍 DRY RUN MODE ENABLED
   No changes will be executed
   Previewing operations only...

🚨 DESTRUCTIVE: DELETE /zones/a3b7ba4bb62cb1b177b04b8675250674/dns_records/mock123
   Impact: 🔴 High
   Data: {"id":"mock123","name":"test.example.com"}

📋 DRY RUN SUMMARY
==================
Total Operations: 1
  destructive: 1

🚨 WARNING: 1 dangerous operation(s) detected!

💡 To execute these operations, run without --dryrun flag
```

---

## 3. Preview domain creation

```bash
$ fw-cli domains create new.factory-wager.com github --dryrun

🔍 DRY RUN MODE ENABLED
   No changes will be executed
   Previewing operations only...

⚠️ MODIFY: POST /zones/a3b7ba4bb62cb1b177b04b8675250674/dns_records
   Impact: 🟡 Medium
   Data: {
    "name": "new.factory-wager.com",
    "type": "CNAME",
    "content": "brendadeeznuts1111.github.io",
    "ttl": 3600
   }

📋 DRY RUN SUMMARY
==================
Total Operations: 1
  modify: 1

💡 To execute these operations, run without --dryrun flag
```

---

## 4. Preview batch operations

```bash
$ fw-cli batch create domains.json --dryrun

🔍 DRY RUN MODE ENABLED
   No changes will be executed
   Previewing operations only...

📦 Batch creating domains from: domains.json

⚠️ MODIFY: POST /zones/a3b7ba4bb62cb1b177b04b8675250674/dns_records
   Impact: 🟡 Medium
   Data: {"name":"app.factory-wager.com","type":"CNAME","content":"brendadeeznuts1111.github.io"}

⚠️ MODIFY: POST /zones/a3b7ba4bb62cb1b177b04b8675250674/dns_records
   Impact: 🟡 Medium
   Data: {"name":"api.factory-wager.com","type":"CNAME","content":"brendadeeznuts1111.github.io"}

⚠️ MODIFY: POST /zones/a3b7ba4bb62cb1b177b04b8675250674/dns_records
   Impact: 🟡 Medium
   Data: {"name":"admin.factory-wager.com","type":"CNAME","content":"brendadeeznuts1111.github.io"}

📋 DRY RUN SUMMARY
==================
Total Operations: 3
  modify: 3

💡 To execute these operations, run without --dryrun flag
```

---

## 🔍 Key Features Demonstrated

### **Risk Assessment**
- ✅ **Safe**: Read-only operations (DNS list)
- ⚠️ **Caution**: Modifying operations (domain creation)
- 🚨 **Dangerous**: Destructive operations (DNS delete)

### **Impact Levels**
- 🟢 **Low**: Information gathering
- 🟡 **Medium**: Configuration changes
- 🔴 **High**: Data deletion/modification

### **Operation Details**
- **HTTP Method**: GET, POST, DELETE
- **API Endpoint**: Full Cloudflare API path
- **Request Data**: JSON payload preview
- **Timestamp**: When operation would execute

### **Summary Statistics**
- **Total Count**: Number of operations
- **By Type**: Read/Modify/Destructive breakdown
- **Risk Warnings**: Alerts for dangerous operations
- **Next Steps**: Clear execution guidance

---

## 🚀 Advanced Examples

### Complex Multi-Operation Scenario

```bash
$ fw-cli deploy content ./docs --dryrun

🔍 DRY RUN MODE ENABLED
   No changes will be executed
   Previewing operations only...

✅ READ: GET /repos/brendadeeznuts1111/project-R-score
   Impact: 🟢 Low

⚠️ MODIFY: POST /repos/brendadeeznuts1111/project-R-score/pages
   Impact: 🟡 Medium
   Data: {"source":{"branch":"main","path":"/docs"}}

✅ READ: GET /zones/a3b7ba4bb62cb1b177b04b8675250674/dns_records
   Impact: 🟢 Low

📋 DRY RUN SUMMARY
==================
Total Operations: 3
  read: 2
  modify: 1

💡 To execute these operations, run without --dryrun flag
```

### Performance Testing Preview

```bash
$ fw-cli performance test --dryrun

🔍 DRY RUN MODE ENABLED
   No changes will be executed
   Previewing operations only...

✅ READ: GET /zones/a3b7ba4bb62cb1b177b04b8675250674/dns_records
   Impact: 🟢 Low

✅ READ: GET https://wiki.factory-wager.com
   Impact: 🟢 Low

✅ READ: GET https://dashboard.factory-wager.com
   Impact: 🟢 Low

✅ READ: GET https://api.factory-wager.com
   Impact: 🟢 Low

✅ READ: GET https://app.factory-wager.com
   Impact: 🟢 Low

📋 DRY RUN SUMMARY
==================
Total Operations: 5
  read: 5

💡 To execute these operations, run without --dryrun flag
```

---

## 🎯 Benefits in Practice

### **Before Dry-Run:**
```bash
$ fw-cli dns delete production.example.com
# ❌ Accidentally deleted production DNS!
```

### **With Dry-Run:**
```bash
$ fw-cli dns delete production.example.com --dryrun
🚨 WARNING: 1 dangerous operation(s) detected!
# ✅ Saw the warning and stopped!
```

### **Batch Operations Safety:**
```bash
$ fw-cli batch create 50-domains.json --dryrun
📋 Total Operations: 50
🚨 WARNING: 50 dangerous operation(s) detected!
# ✅ Reviewed all 50 operations before executing
```

The dry-run mode provides **complete visibility** into what would happen, preventing costly mistakes and ensuring safe infrastructure management! 🛡️
