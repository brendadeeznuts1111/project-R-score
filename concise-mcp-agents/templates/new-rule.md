<%*
header = tp.user.bunHeader("AGENT", "GLOBAL", "RULE", "REQUIRED", tp.file.title)
%>

# <% header %>

## Trigger
<% tp.user.prompt("What triggers this rule?") %>

## Action
<% tp.user.prompt("What action should be taken?") %>

## Example
<% tp.user.prompt("Provide a concrete example") %>

**Priority**: <% tp.user.prompt("REQUIRED, CORE, or OPTIONAL?") %>

**Category**: <% tp.user.prompt("Security, Ops, Alerts, etc.") %>

**Automated**: <% tp.user.prompt("Can this be automated? (true/false)") %>

---

## Implementation Notes

**Code Location**: `scripts/gov-rules.ts`
**Test Command**: `bun rules:enforce <% tp.file.title %>`
**PR Required**: Yes

---

<% tp.user.newRuleFooter() %>