<!--
QuickAdd template for rapid governance rule creation
This creates a minimal rule file that can be expanded later
-->

<%*
// Quick rule creation with minimal prompts
const category = await tp.system.suggester([
  "Security", "Ops", "Alerts", "Git/Deploy",
  "Data", "WS/Live", "Telegram", "Agent", "Compliance"
], [
  "Security", "Ops", "Alerts", "Git/Deploy",
  "Data", "WS/Live", "Telegram", "Agent", "Compliance"
], true, "🚨 New Governance Rule - Category:");

if (!category) return "Rule creation cancelled";

const trigger = await tp.system.prompt("⚡ Trigger condition:", "", true);
if (!trigger) return "Rule creation cancelled";

const action = await tp.system.prompt("🔧 Enforcement action:", "", true);
if (!action) return "Rule creation cancelled";

const priority = await tp.system.suggester(
  ["REQUIRED", "CORE", "OPTIONAL"],
  ["REQUIRED", "CORE", "OPTIONAL"],
  true, "🎯 Priority level:"
);

if (!priority) return "Rule creation cancelled";

// Generate rule ID
const timestamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');
const categoryCode = category.slice(0, 3).toUpperCase();
const ruleId = `${categoryCode}-NEW-${timestamp}`;

// Set filename
tp.file.title = ruleId;

// Generate header
const header = `[GOV][${category.toUpperCase()}][${ruleId}][v1.0][${priority}]`;
%>

<% header %>

## 🚨 QUICK RULE CREATION

**This rule was created via QuickAdd - expand with full template details**

### ⚡ Trigger
<% trigger %>

### 🔧 Action
<% action %>

### 🎯 Priority
<% priority %>

### 📝 Next Steps
1. Run `bun rules:pr <% ruleId %>` to create implementation branch
2. Expand this with full implementation details
3. Add validation and enforcement logic
4. Test and validate rule
5. Merge via PR workflow

### 🏷️ Metadata
- **Category**: <% category %>
- **ID**: <% ruleId %>
- **Created**: <% tp.date.now() %>
- **Status**: DRAFT

---
*QuickAdd template • Expand with `/templater: Create new rule`*
