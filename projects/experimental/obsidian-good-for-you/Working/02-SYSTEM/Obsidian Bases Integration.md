# 🗄️ **Obsidian Bases Integration Guide**

> [!INFO] **Structured Data Views for Your Knowledge Management System**
> This guide shows how to leverage Obsidian Bases for dynamic, database-like views of your notes.

## 🎯 **What Are Obsidian Bases?**

Obsidian Bases are YAML-based files that create dynamic, database-like views of your notes. They extend your knowledge management system with:

- **Structured data views** - Table, cards, list, and map layouts
- **Advanced filtering** - Complex queries with logical operators
- **Computed properties** - Formula-based calculations
- **Aggregation summaries** - Data analysis across notes
- **Context-aware embedding** - Dynamic views within notes

---

## 🏗️ **Base File Structure**

### **Basic Base Template**
```yaml
views:
  - type: table
    name: Active Projects
    filters:
      - "status == 'active'"
    properties:
      - name
      - status
      - priority
      - due-date
    sort:
      - property: priority
        direction: desc
```

### **Complete Base Example**
```yaml
# Project Portfolio Base
views:
  - type: table
    name: Project Portfolio
    filters:
      - "file.folder == '01 - AREAS/PROJECTS'"
    properties:
      - name
      - status
      - priority
      - start-date
      - due-date
      - progress
    sort:
      - property: priority
        direction: desc
      - property: due-date
        direction: asc
    summaries:
      - type: count
        label: Total Projects
      - type: average
        property: progress
        label: Average Progress

  - type: cards
    name: Project Cards
    filters:
      - "status == 'active'"
    properties:
      - name
      - status
      - priority
    card:
      title: "{{name}}"
      subtitle: "Status: {{status}}"
      body: "Priority: {{priority}}"
```

---

## 📊 **Base Templates for Your System**

### **Project Management Base**
```yaml
# Project Management Base
views:
  - type: table
    name: Active Projects Dashboard
    filters:
      - "status == 'active'"
    properties:
      - name
      - project-type
      - priority
      - start-date
      - due-date
      - progress
    sort:
      - property: priority
        direction: desc
    summaries:
      - type: count
        label: Active Projects
      - type: average
        property: progress
        label: Average Progress

  - type: cards
    name: High Priority Projects
    filters:
      - "priority == 'high'"
    properties:
      - name
      - status
      - due-date
    card:
      title: "{{name}}"
      subtitle: "Due: {{due-date}}"
      body: "Status: {{status}}"

  - type: list
    name: Recent Projects
    filters:
      - "start-date > date('2025-01-01')"
    properties:
      - name
      - status
      - project-type
    sort:
      - property: start-date
        direction: desc
```

### **Skill Development Base**
```yaml
# Skill Development Base
views:
  - type: table
    name: Skills Portfolio
    filters:
      - "file.folder == '01 - AREAS/SKILLS'"
    properties:
      - name
      - skill-category
      - current-level
      - target-level
      - hours-invested
      - target-hours
      - priority
    formulas:
      - name: Progress Percentage
        formula: "(hours-invested / target-hours) * 100"
    sort:
      - property: priority
        direction: desc
    summaries:
      - type: count
        label: Total Skills
      - type: sum
        property: hours-invested
        label: Total Hours
      - type: average
        property: Progress Percentage
        label: Average Progress

  - type: cards
    name: High Priority Skills
    filters:
      - "priority == 'high'"
    properties:
      - name
      - skill-category
      - current-level
      - target-level
    card:
      title: "{{name}}"
      subtitle: "{{skill-category}}"
      body: "{{current-level}} → {{target-level}}"
```

### **Daily Review Base**
```yaml
# Daily Review Base
views:
  - type: table
    name: Daily Performance Metrics
    filters:
      - "file.folder == '03 - REVIEWS/DAILY NOTES'"
    properties:
      - date
      - mood
      - energy
      - focus
      - day-of-week
    formulas:
      - name: Productivity Score
        formula: "(energy + focus) / 2"
    sort:
      - property: date
        direction: desc
    summaries:
      - type: count
        label: Total Days
      - type: average
        property: energy
        label: Average Energy
      - type: average
        property: focus
        label: Average Focus

  - type: list
    name: High Energy Days
    filters:
      - "energy == 'high'"
    properties:
      - date
      - mood
      - focus
    sort:
      - property: date
        direction: desc
```

---

## 🔧 **Advanced Features**

### **Complex Filtering**
```yaml
# Complex filters with logical operators
filters:
  - "(status == 'active' and priority == 'high') or (status == 'review')"
  - "due-date < date(today) + dur(7 days)"
  - "skill-category in ['technical', 'business']"
  - "hours-invested > 10 and target-hours <= 50"
```

### **Formula Properties**
```yaml
# Advanced formulas for calculated properties
formulas:
  - name: Days Until Due
    formula: "date(due-date) - date(today)"
  - name: Completion Rate
    formula: "(hours-invested / target-hours) * 100"
  - name: Priority Score
    formula: "priority == 'high' ? 3 : priority == 'medium' ? 2 : 1"
  - name: Status Indicator
    formula: "status == 'active' ? '🟢' : status == 'completed' ? '✅' : '⏳'"
```

### **Multiple View Types**
```yaml
# Different visualization options
views:
  - type: table
    name: Detailed View
    # ... table configuration

  - type: cards
    name: Visual Gallery
    # ... cards configuration

  - type: list
    name: Quick Overview
    # ... list configuration

  - type: map
    name: Geographic View
    filters:
      - "latitude and longitude"
    properties:
      - name
      - latitude
      - longitude
      - location-type
```

---

## 📋 **Creating Your First Base**

### **Step 1: Create Base File**
1. **Create new file** with `.base` extension
2. **Add YAML frontmatter** and views configuration
3. **Save in appropriate folder**

### **Step 2: Define Views**
```yaml
views:
  - type: table
    name: My First View
    filters:
      - "your-filter-here"
    properties:
      - name
      - status
    # ... more configuration
```

### **Step 3: Test and Refine**
1. **Open the base file** to see your view
2. **Adjust filters** as needed
3. **Add more views** for different perspectives

---

## 🔗 **Integration with Your System**

### **Embedding Bases in Notes**
```markdown
## 📊 **Project Dashboard**

![[Project Portfolio Base]]

## 🎯 **Skills Overview**

![[Skill Development Base]]
```

### **Context-Aware Views**
```yaml
# Context-aware base for project-specific views
views:
  - type: table
    name: Project Tasks
    filters:
      - "project == '{{this.name}}'"
      - "status != 'completed'"
    properties:
      - name
      - status
      - assignee
      - due-date
```

### **Linked Data Views**
```yaml
# Base that shows related information
views:
  - type: table
    name: Project Dependencies
    filters:
      - "related-project == '{{this.name}}'"
    properties:
      - name
      - type
      - impact
      - status
```

---

## 🎨 **View Customization**

### **Table View Options**
```yaml
- type: table
  name: Custom Table
  # Table-specific options
  table:
    header: true
    striped: true
    compact: false
  # Sort configuration
  sort:
    - property: priority
      direction: desc
    - property: name
      direction: asc
```

### **Cards View Options**
```yaml
- type: cards
  name: Visual Cards
  # Card customization
  card:
    title: "{{name}}"
    subtitle: "{{status}}"
    body: "{{description}}"
    cover: "{{image}}"
  # Layout options
  cards:
    columns: 3
    gap: medium
```

### **List View Options**
```yaml
- type: list
  name: Simple List
  # List formatting
  list:
    show_property_names: true
    separator: " • "
    empty_text: "No items found"
```

---

## 📊 **Data Analysis with Bases**

### **Aggregation Functions**
```yaml
# Built-in aggregations
summaries:
  - type: count
    label: Total Items
  - type: sum
    property: hours
    label: Total Hours
  - type: average
    property: progress
    label: Average Progress
  - type: min
    property: due-date
    label: Earliest Due
  - type: max
    property: priority
    label: Highest Priority
```

### **Custom Summaries**
```yaml
# Custom formula summaries
summaries:
  - type: formula
    label: Completion Rate
    formula: "sum(progress) / count(items)"
  - type: formula
    label: Budget Utilization
    formula: "(sum(spent) / sum(budget)) * 100"
```

---

## 🛠️ **Best Practices**

### **File Organization**
```text
02 - SYSTEM/
├── Bases/
│   ├── Project Portfolio.base
│   ├── Skills Development.base
│   ├── Daily Reviews.base
│   └── Resource Tracking.base
```

### **Naming Conventions**
- Use descriptive names: `Project Portfolio.base`
- Include purpose: `Skills Development.base`
- Version control: `Dashboard v1.base`, `Dashboard v2.base`

### **Performance Optimization**
- **Limit complex filters** - Break into multiple views
- **Use specific properties** - Avoid loading all properties
- **Regular maintenance** - Archive old data

---

## 🔗 **Integration Points**

### **Link to Your System**
- [[Project Management Hub]] - Use bases for project dashboards
- [[Skill Development Center]] - Track skill progress with bases
- [[Daily Journal System]] - Analyze patterns with bases
- [[Advanced Tables Integration Guide]] - Combine tables and bases

### **Automated Workflows**
- **Daily**: Update review bases with new entries
- **Weekly**: Generate summary reports from bases
- **Monthly**: Create comprehensive analytics views

---

## 📚 **Advanced Examples**

### **Multi-Dimensional Analysis**
```yaml
# Complex analytical base
views:
  - type: table
    name: Performance Analytics
    filters:
      - "date >= date(today) - dur(30 days)"
    properties:
      - name
      - category
      - performance
      - efficiency
      - satisfaction
    formulas:
      - name: Overall Score
        formula: "(performance + efficiency + satisfaction) / 3"
    summaries:
      - type: average
        property: Overall Score
        label: Average Performance
      - type: correlation
        properties: [performance, satisfaction]
        label: Performance-Satisfaction Correlation
```

### **Predictive Analytics**
```yaml
# Predictive view for project completion
views:
  - type: table
    name: Project Forecast
    properties:
      - name
      - progress
      - start-date
      - due-date
    formulas:
      - name: Estimated Completion
        formula: "start-date + ((due-date - start-date) * (progress / 100))"
      - name: On Track
        formula: "date(Estimated Completion) <= date(due-date)"
```

---

## 🚀 **Getting Started Checklist**

### **Setup Tasks**
- [ ] Install Obsidian Bases plugin
- [ ] Create `02 - SYSTEM/Bases/` folder
- [ ] Create your first base file
- [ ] Test basic functionality

### **Integration Tasks**
- [ ] Create project portfolio base
- [ ] Set up skill development base
- [ ] Build daily review base
- [ ] Embed bases in relevant notes

### **Optimization Tasks**
- [ ] Refine filters and formulas
- [ ] Add multiple view types
- [ ] Create custom summaries
- [ ] Set up automated workflows

---

*Transform your knowledge management system with powerful structured data views!*

**Next Steps:** Create your first base file and explore the dynamic data capabilities.
