---
type: meeting-template
title: 🤝 Enhanced Meeting Template
version: "2.0.0"
category: meeting
priority: medium
status: active
tags:
  - meeting
  - collaboration
  - action-items
  - decisions
  - "{{meeting_type}}"
  - "{{date:YYYY-MM-DD}}"
created: "{{date:YYYY-MM-DDTHH:mm:ssZ}}"
updated: "{{date:YYYY-MM-DDTHH:mm:ssZ}}"
author: "{{author}}"
template_version: "2.0.0"
validation_rules:
  - required-frontmatter
  - meeting-structure
  - action-items-tracking
  - decision-documentation
meeting_type: "{{meeting_type}}"
meeting_duration: "{{meeting_duration}}"
location: "{{location}}"
meeting_lead: "{{meeting_lead}}"
note_taker: "{{note_taker}}"
---

# 🤝 {{meeting_title}}

> **📊 Meeting Details**: {{date:dddd}}, {{date:MMMM Do}} at {{meeting_time}} | **📍 Location**: {{location}} | **⏱️ Duration**: {{meeting_duration}} | **👥 Lead**: {{meeting_lead}}

---

## 📋 Meeting Information

### **Basic Details**
- **Meeting Type**: {{meeting_type}}
- **Date & Time**: {{date:YYYY-MM-DD}} at {{meeting_time}}
- **Duration**: {{meeting_duration}}
- **Location**: {{location}}
- **Meeting Lead**: {{meeting_lead}}
- **Note Taker**: {{note_taker}}

### **Attendees**
```dataview
TABLE
  role AS "Role",
  organization AS "Organization",
  email AS "Email"
FROM #attendee AND "{{date:YYYY-MM-DD}}"
SORT role ASC
```

### **Meeting Purpose**
{{meeting_purpose}}

---

## 🎯 Meeting Objectives

### **Primary Objectives**
- [ ] **{{objective_1}}** - {{objective_1_description}}
- [ ] **{{objective_2}}** - {{objective_2_description}}
- [ ] **{{objective_3}}** - {{objective_3_description}}

### **Success Criteria**
{{success_criteria}}

---

## 📅 Agenda & Timeline

| Time | Topic | Owner | Status |
|------|-------|-------|---------|
| {{agenda_time_1}} | {{agenda_topic_1}} | {{agenda_owner_1}} | {{agenda_status_1}} |
| {{agenda_time_2}} | {{agenda_topic_2}} | {{agenda_owner_2}} | {{agenda_status_2}} |
| {{agenda_time_3}} | {{agenda_topic_3}} | {{agenda_owner_3}} | {{agenda_status_3}} |
| {{agenda_time_4}} | {{agenda_topic_4}} | {{agenda_owner_4}} | {{agenda_status_4}} |

---

## 💬 Discussion Summary

### **Topic 1: {{discussion_topic_1}}**
**Key Points**:
- {{discussion_1_point_1}}
- {{discussion_1_point_2}}
- {{discussion_1_point_3}}

**Outcomes**: {{discussion_1_outcome}}

---

### **Topic 2: {{discussion_topic_2}}**
**Key Points**:
- {{discussion_2_point_1}}
- {{discussion_2_point_2}}
- {{discussion_2_point_3}}

**Outcomes**: {{discussion_2_outcome}}

---

### **Topic 3: {{discussion_topic_3}}**
**Key Points**:
- {{discussion_3_point_1}}
- {{discussion_3_point_2}}
- {{discussion_3_point_3}}

**Outcomes**: {{discussion_3_outcome}}

---

## ✅ Decisions Made

### **Decision 1: {{decision_1_title}}**
- **Decision**: {{decision_1_description}}
- **Rationale**: {{decision_1_rationale}}
- **Impact**: {{decision_1_impact}}
- **Owner**: {{decision_1_owner}}
- **Due Date**: {{decision_1_due_date}}

### **Decision 2: {{decision_2_title}}**
- **Decision**: {{decision_2_description}}
- **Rationale**: {{decision_2_rationale}}
- **Impact**: {{decision_2_impact}}
- **Owner**: {{decision_2_owner}}
- **Due Date**: {{decision_2_due_date}}

### **Decision 3: {{decision_3_title}}**
- **Decision**: {{decision_3_description}}
- **Rationale**: {{decision_3_rationale}}
- **Impact**: {{decision_3_impact}}
- **Owner**: {{decision_3_owner}}
- **Due Date**: {{decision_3_due_date}}

---

## 🎯 Action Items

### **High Priority Actions**
| Action | Owner | Due Date | Status | Priority |
|--------|-------|----------|---------|----------|
| {{action_1}} | {{action_1_owner}} | {{action_1_due}} | {{action_1_status}} | High |
| {{action_2}} | {{action_2_owner}} | {{action_2_due}} | {{action_2_status}} | High |
| {{action_3}} | {{action_3_owner}} | {{action_3_due}} | {{action_3_status}} | High |

### **Medium Priority Actions**
| Action | Owner | Due Date | Status | Priority |
|--------|-------|----------|---------|----------|
| {{action_4}} | {{action_4_owner}} | {{action_4_due}} | {{action_4_status}} | Medium |
| {{action_5}} | {{action_5_owner}} | {{action_5_due}} | {{action_5_status}} | Medium |
| {{action_6}} | {{action_6_owner}} | {{action_6_due}} | {{action_6_status}} | Medium |

### **Low Priority Actions**
| Action | Owner | Due Date | Status | Priority |
|--------|-------|----------|---------|----------|
| {{action_7}} | {{action_7_owner}} | {{action_7_due}} | {{action_7_status}} | Low |
| {{action_8}} | {{action_8_owner}} | {{action_8_due}} | {{action_8_status}} | Low |

---

## 📊 Meeting Metrics

### **Participation**
- **Total Attendees**: {{total_attendees}}
- **Active Participants**: {{active_participants}}
- **Engagement Level**: {{engagement_level}}/10

### **Effectiveness**
- **Objectives Met**: {{objectives_met}}/{{total_objectives}}
- **Decisions Made**: {{decisions_made}}
- **Action Items Created**: {{action_items_created}}

### **Time Management**
- **Started On Time**: {{started_on_time}}
- **Ended On Time**: {{ended_on_time}}
- **Time Efficiency**: {{time_efficiency}}%

---

## 📝 Notes & Observations

### **Key Insights**
- {{insight_1}}
- {{insight_2}}
- {{insight_3}}

### **Concerns & Risks**
- {{concern_1}}
- {{concern_2}}
- {{concern_3}}

### **Opportunities**
- {{opportunity_1}}
- {{opportunity_2}}
- {{opportunity_3}}

---

## 📋 Next Steps

### **Immediate Follow-up (24 hours)**
- [ ] {{immediate_1}}
- [ ] {{immediate_2}}
- [ ] {{immediate_3}}

### **Short-term Follow-up (1 week)**
- [ ] {{short_term_1}}
- [ ] {{short_term_2}}
- [ ] {{short_term_3}}

### **Long-term Follow-up (1 month)**
- [ ] {{long_term_1}}
- [ ] {{long_term_2}}
- [ ] {{long_term_3}}

---

## 📅 Follow-up Meetings

### **Scheduled Follow-ups**
- **{{follow_up_1_title}}**: {{follow_up_1_date}} at {{follow_up_1_time}}
- **{{follow_up_2_title}}**: {{follow_up_2_date}} at {{follow_up_2_time}}
- **{{follow_up_3_title}}**: {{follow_up_3_date}} at {{follow_up_3_time}}

### **Recurring Meetings**
- **{{recurring_1_title}}**: {{recurring_1_frequency}} ({{recurring_1_next_date}})
- **{{recurring_2_title}}**: {{recurring_2_frequency}} ({{recurring_2_next_date}})

---

## 📎 Attachments & Resources

### **Documents Shared**
- {{attachment_1}} - {{attachment_1_description}}
- {{attachment_2}} - {{attachment_2_description}}
- {{attachment_3}} - {{attachment_3_description}}

### **Links & References**
- {{reference_1}} - {{reference_1_description}}
- {{reference_2}} - {{reference_2_description}}
- {{reference_3}} - {{reference_3_description}}

---

## 🏷️ Tags & Indexing

`#meeting` `#{{meeting_type}}` `#{{date:YYYY-MM-DD}}` `#{{date:MMMM|lowercase}}` `#{{date:dddd|lowercase}}` `#action-items` `#decisions` `#{{meeting_lead}}`

---

## 🔗 Quick Links


---

## 📋 Meeting Evaluation

### **What Went Well**
- {{went_well_1}}
- {{went_well_2}}
- {{went_well_3}}

### **Areas for Improvement**
- {{improvement_1}}
- {{improvement_2}}
- {{improvement_3}}

### **Meeting Rating**
- **Overall Effectiveness**: {{effectiveness_rating}}/10
- **Time Management**: {{time_management_rating}}/10
- **Participation**: {{participation_rating}}/10
- **Decision Quality**: {{decision_quality_rating}}/10

---

## 📊 Analytics & Data

### **Action Items Status**
```dataview
TABLE
  owner AS "Owner",
  due AS "Due Date",
  status AS "Status",
  priority AS "Priority"
FROM #action-item AND "{{date:YYYY-MM-DD}}"
SORT due ASC, priority DESC
```

### **Decisions Impact**
```dataview
TABLE
  owner AS "Owner",
  due AS "Implementation Date",
  impact AS "Impact Level"
FROM #decision AND "{{date:YYYY-MM-DD}}"
SORT due ASC
```

---

## 📋 Template Metadata

**Template Version**: 2.0.0  
**Created**: {{date:YYYY-MM-DDTHH:mm:ssZ}}  
**Updated**: {{date:YYYY-MM-DDTHH:mm:ssZ}}  
**Author**: {{author}}  
**Validation**: ✅ Passed  
**Processing Time**: <50ms  

---

*This enhanced meeting template follows the Odds Protocol standards with comprehensive action tracking, decision documentation, and meeting analytics.*
