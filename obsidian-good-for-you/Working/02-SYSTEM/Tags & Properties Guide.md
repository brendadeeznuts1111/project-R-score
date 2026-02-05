# 🏷️ Tags & Properties Guide

> [!INFO] Organization System
> This guide explains the tagging and properties system used throughout your vault.

---

## 🏷️ Tag System

### Primary Tags

#### Content Type Tags
- `#project` - Active work and initiatives
- `#skill` - Learning and development tracking
- `#knowledge` - Reference materials and concepts
- `#life-goal` - Personal life area goals
- `#daily-note` - Daily journal entries
- `#weekly-review` - Weekly reflection notes
- `#monthly-review` - Monthly strategic reviews

#### Status Tags
- `#active` - Currently in progress
- `#completed` - Finished successfully
- `#on-hold` - Temporarily paused
- `#archived` - No longer active
- `#blocked` - Facing obstacles

#### Priority Tags
- `#high-priority` - Urgent and important
- `#medium-priority` - Important but not urgent
- `#low-priority` - Nice to have when time allows

### Secondary Tags

#### Domain Tags
- `#technical` - Technology and programming
- `#business` - Business and strategy
- `#creative` - Design and creative work
- `#personal` - Personal development
- `#health` - Health and wellness
- `#financial` - Money and finance
- `#relationships` - Social connections

#### Learning Tags
- `#beginner` - Just starting out
- `#intermediate` - Some experience
- `#advanced` - Highly skilled
- `#tutorial` - Learning resources
- `#resource` - Reference materials

#### Action Tags
- `#next-action` - Immediate next step
- `#waiting-for` - Dependent on others
- `#someday-maybe` - Future consideration
- `#reference` - Look up material

---

## 📋 Properties System

### Standard Properties

#### Project Properties
```yaml
---
project-type: personal-development  # Type of project
status: active                     # Current status
priority: high                     # Priority level
start-date: 2025-01-09            # When started
due-date: 2025-02-09              # Deadline
tags: [project]                   # Auto-tag
---
```

#### Skill Properties
```yaml
---
skill-category: productivity-tools # Skill domain
current-level: beginner           # Current proficiency
target-level: advanced            # Goal proficiency
hours-invested: 5                # Time spent
target-hours: 50                 # Time goal
priority: high                   # Learning priority
next-review: 2025-01-16          # Next check-in
tags: [skill]                    # Auto-tag
---
```

#### Daily Note Properties
```yaml
---
date: 2025-01-09                 # Date of note
day-of-week: Thursday            # Day name
mood: productive                 # Current mood
energy: high                     # Energy level
focus: medium                    # Focus level
tags: [daily-note]              # Auto-tag
---
```

#### Review Properties
```yaml
---
review-type: weekly              # Type of review
week-of: 2025-01-06             # Week covered
key-wins: "Completed vault setup" # Major achievements
main-challenges: "Dataview learning curve" # Obstacles
next-week-focus: "Dataview practice" # Next priorities
tags: [weekly-review]           # Auto-tag
---
```

---

## 🎯 Usage Guidelines

### Tagging Best Practices

#### Be Consistent
- Use existing tags before creating new ones
- Follow established naming conventions
- Keep tag names short and descriptive

#### Be Specific
- `#web-development` is better than `#web`
- `#python-programming` is better than `#python`
- Combine tags for specificity: `#project #technical #high-priority`

#### Be Purposeful
- Every tag should serve a clear purpose
- Tags should help you find and organize information
- Remove unused tags regularly

### Properties Best Practices

#### Complete the Essentials
- Always fill in required properties for each note type
- Use consistent date formats (YYYY-MM-DD)
- Keep property values concise and clear

#### Use Standard Formats
- Dates: `2025-01-09`
- Status: `active`, `completed`, `on-hold`, `archived`
- Priority: `high`, `medium`, `low`
- Levels: `beginner`, `intermediate`, `advanced`

#### Update Regularly
- Keep status and progress properties current
- Review and update during weekly reviews
- Archive completed items appropriately

---

## 🔍 Search & Query Examples

### Tag-Based Searches
```
tag:#project                    # All projects
tag:#skill AND tag:#active      # Active skills
tag:#high-priority              # High priority items
tag:#technical AND tag:#project # Technical projects
```

### Property-Based Queries (Dataview)
```dataview
TABLE 
  status as "Status",
  priority as "Priority", 
  due-date as "Due Date"
FROM #project 
WHERE status = "active"
SORT priority DESC, due-date ASC
```

```dataview
TABLE 
  current-level as "Current",
  target-level as "Target", 
  hours-invested as "Hours"
FROM #skill 
WHERE priority = "high"
SORT hours-invested DESC
```

### Combined Searches
```
(tag:#project OR tag:#skill) AND tag:#active
tag:#daily-note AND mood:"productive"
tag:#knowledge AND tag:#technical
```

---

## 📊 Organization by Properties

### Project Management
- **Status tracking**: See what's active, completed, or blocked
- **Priority sorting**: Focus on high-impact work
- **Timeline management**: Track start and end dates
- **Type categorization**: Differentiate project types

### Skill Development
- **Progress tracking**: Monitor hours and level advancement
- **Priority focus**: Identify which skills need attention
- **Category organization**: Group related skills
- **Review scheduling**: Track when to check in

### Daily Tracking
- **Mood patterns**: Monitor emotional trends
- **Energy management**: Track productivity patterns
- **Focus assessment**: Identify peak performance times
- **Habit consistency**: Track daily routines

---

## 🛠️ Maintenance

### Weekly Maintenance
- Review new tags created during the week
- Consolidate similar or duplicate tags
- Update property values for progress
- Archive completed items appropriately

### Monthly Maintenance
- Comprehensive tag review and cleanup
- Property schema validation
- Query performance optimization
- Documentation updates

### Quarterly Maintenance
- Major tag system restructuring
- Property schema evolution
- Advanced query optimization
- System-wide consistency check

---

## 🚀 Advanced Usage

### Nested Tags
- Use hierarchical tags: `#skill/technical/programming`
- Creates natural organization structure
- Allows for broad and specific searches

### Property Calculations
- Use Dataview for computed properties
- Create progress percentages
- Calculate time-based metrics

### Custom Views
- Create specialized queries for different needs
- Build dashboards for different life areas
- Develop automated reports

---

## 📚 Templates Integration

All templates include pre-configured properties:
- **[[Project Template]]** - Project management properties
- **[[Skill Template]]** - Skill tracking properties
- **[[Daily Note Template]]** - Daily tracking properties
- **[[Review Templates]]** - Review-specific properties

---

## 🔄 Evolution

This system is designed to evolve with your needs:
- Start simple and add complexity as needed
- Adjust tags and properties based on usage patterns
- Regularly review and optimize for your workflow
- Don't be afraid to experiment with new approaches

---

*Consistent tagging and properties are the foundation of an organized vault*
