# 🧪 **System Test & Verification**

> [!INFO] **Test your enhanced knowledge management system**
> Run these tests to verify all components are working correctly.

## 📊 **Dataview Query Test**

### **Active Projects Test**
```dataview
TABLE 
  status as "Status",
  priority as "Priority"
FROM #project 
WHERE !contains(file.path, "Templates")
LIMIT 5
```

### **Skills Test**
```dataview
TABLE 
  current-level as "Current Level",
  target-level as "Target Level"
FROM #skill 
WHERE !contains(file.path, "Templates")
LIMIT 5
```

### **Daily Notes Test**
```dataview
TABLE 
  mood as "Mood",
  energy as "Energy"
FROM #daily-note 
SORT date DESC
LIMIT 3
```

---

## 🔗 **Link Test**

### **Internal Links**
- [[Knowledge Management System - Navigation Hub]]
- [[Project Management Hub]]
- [[Skill Development Center]]
- [[Daily Journal System]]

### **Template Links**
- [[Project Template Framework]]
- [[Skill Development Template]]
- [[Daily Note Template]]

---

## 📋 **Functionality Checklist**

### **✅ Core Features**
- [ ] Templates load correctly
- [ ] Daily notes create in right folder
- [ ] Properties display properly
- [ ] Links work between notes
- [ ] Dataview queries show data

### **✅ Navigation**
- [ ] Homepage links function
- [ ] Backlinks appear correctly
- [ ] Graph view shows connections
- [ ] File explorer organized
- [ ] Search finds content

### **✅ Workflow**
- [ ] Can create new projects
- [ ] Can track skills progress
- [ ] Can write daily notes
- [ ] Can use templates consistently
- [ ] Can review progress

---

## 🎯 **Test Your First Actions**

1. **Create a test project** using the Project Template
2. **Track a test skill** using the Skill Template  
3. **Write today's daily note** using the Daily Template
4. **Check the dashboards** to see your data appear
5. **Explore the graph view** to see connections

---

## 🔧 **Troubleshooting**

### **Dataview Not Working**
- Check that Dataview plugin is enabled
- Verify syntax is correct
- Ensure notes have proper frontmatter

### **Templates Not Loading**
- Check template folder path in settings
- Verify template files exist
- Restart Obsidian if needed

### **Links Not Working**
- Use exact note names with brackets
- Check for typos in link text
- Verify target notes exist

---

*Run this test after installing plugins to verify system functionality*
