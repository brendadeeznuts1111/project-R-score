# 🎮 **Table Formulas - Interactive Demo**

> [!SUCCESS] **Hands-On Learning**: Try these formulas directly in your notes to see them work!

---

## 🚀 **Quick Start Demo**

### **Basic Addition Formula**
Copy this table into any note to see automatic calculation:

```markdown
| Item | Quantity | Price | Total |
| ---- | -------- | ----- | ----- |
| Apples | 5 | 1.50 | |
| Bananas | 3 | 0.75 | |
| Oranges | 4 | 2.00 | |
| **Grand Total** | | | |
<!-- TBLFM: $4=($2*$3) -->
<!-- TBLFM: @>$4=sum(@I..@-1) -->
```

**Expected Result**: Grand Total = $20.75

---

## 📊 **Progressive Demo - From Simple to Advanced**

### **Level 1: Basic Operations**
```markdown
| Base | Add | Subtract | Multiply | Divide |
| ---- | --- | ------- | -------- | ------ |
| 100 | 25 | 10 | 2 | 5 |
| 50 | 15 | 5 | 3 | 2 |
| **Results** | | | | |
<!-- TBLFM: @2$6=($2+$3) -->
<!-- TBLFM: @2$7=($2-$4) -->
<!-- TBLFM: @2$8=($2*$5) -->
<!-- TBLFM: @2$9=($2/$6) -->
```

### **Level 2: Conditional Logic**
```markdown
| Score | Grade | Status |
| ----- | ----- | ------ |
| 95 | | |
| 85 | | |
| 72 | | |
| 58 | | |
<!-- TBLFM: $2=if($1>=90, "A", if($1>=80, "B", if($1>=70, "C", "F"))) -->
<!-- TBLFM: $3=if($1>=70, "✅ PASS", "❌ FAIL") -->
```

### **Level 3: Time Tracking**
```markdown
| Task | Start | End | Duration |
| ---- | ----- | --- | -------- |
| Meeting | 09:00 | 10:30 | |
| Coding | 11:00 | 14:30 | |
| Review | 15:00 | 16:15 | |
| **Total** | | | |
<!-- TBLFM: $>=($3 - $2);hm -->
<!-- TBLFM: @>$>=sum(@I..@-1);hm -->
```

---

## 🎯 **Real-World Project Management Demo**

### **Project Budget Tracker**
```markdown
## 💰 Project Budget Analysis

| Category | Budget | Spent | Remaining | % Used | Status |
| -------- | ------ | ----- | --------- | ------ | ------ |
| Development | 5000 | 3500 | | | |
| Design | 2000 | 1800 | | | |
| Marketing | 1500 | 800 | | | |
| Testing | 1000 | 400 | | | |
| **Totals** | | | | | |
<!-- TBLFM: $4=($2-$3) -->
<!-- TBLFM: $5=(($3/$2)*100);%.1f -->
<!-- TBLFM: $6=if($5<=80, "✅ On Track", if($5<=100, "⚠️ Near Limit", "🚨 Over Budget")) -->
<!-- TBLFM: @>$2=sum(@I..@-1) -->
<!-- TBLFM: @>$3=sum(@I..@-1) -->
<!-- TBLFM: @>$4=sum(@I..@-1) -->
<!-- TBLFM: @>$5=mean(@I..@-1) -->
```

### **Task Progress Tracker**
```markdown
## 📈 Sprint Progress

| Task | Hours Est. | Hours Actual | % Complete | Status |
| ---- | ---------- | ------------ | ---------- | ------ |
| Feature A | 20 | 18 | | |
| Feature B | 15 | 12 | | |
| Bug Fixes | 8 | 10 | | |
| Documentation | 5 | 3 | | |
| **Sprint Total** | | | | |
<!-- TBLFM: $4=(($3/$2)*100);%.0f -->
<!-- TBLFM: $5=if($4>=100, "✅ Complete", if($4>=75, "🟡 Nearly Done", "🔄 In Progress")) -->
<!-- TBLFM: @>$2=sum(@I..@-1) -->
<!-- TBLFM: @>$3=sum(@I..@-1) -->
<!-- TBLFM: @>$4=mean(@I..@-1) -->
```

---

## 🎓 **Learning Progress Demo**

### **Skill Development Tracker**
```markdown
## 🎯 Skill Learning Progress

| Skill | Target Hours | Current Hours | % Complete | Daily Avg | Status |
| ----- | ------------ | ------------- | ---------- | --------- | ------ |
| JavaScript | 100 | 45 | | | |
| Python | 80 | 60 | | | |
| React | 60 | 15 | | | |
| TypeScript | 40 | 25 | | | |
| **Overall** | | | | | |
<!-- TBLFM: $4=(($3/$2)*100);%.0f -->
<!-- TBLFM: $5=($3/30) -->
<!-- TBLFM: $6=if($4>=80, "🎯 Mastered", if($4>=50, "🟡 Proficient", "🌱 Learning")) -->
<!-- TBLFM: @>$2=sum(@I..@-1) -->
<!-- TBLFM: @>$3=sum(@I..@-1) -->
<!-- TBLFM: @>$4=mean(@I..@-1) -->
```

---

## 💡 **Advanced Formula Combinations**

### **Weighted Decision Matrix**
```markdown
## 🤔 Decision Analysis

| Option | Cost | Quality | Speed | Weighted Score |
| ------ | ---- | ------ | ----- | -------------- |
| Option A | 3 | 8 | 7 | |
| Option B | 5 | 9 | 6 | |
| Option C | 2 | 7 | 9 | |
| **Weights** | 0.3 | 0.4 | 0.3 | |
<!-- TBLFM: $5=($2*0.3+$3*0.4+$4*0.3) -->
<!-- TBLFM: @>$5=max(@I..@-1) -->
```

### **Financial Forecasting**
```markdown
## 📈 Revenue Projection

| Month | Revenue | Costs | Profit | Profit % | Growth |
| ----- | ------- | ----- | ------ | -------- | ------ |
| Jan | 10000 | 7000 | | | |
| Feb | 12000 | 7500 | | | |
| Mar | 15000 | 8000 | | | |
| **Total** | | | | | |
<!-- TBLFM: $4=($2-$3) -->
<!-- TBLFM: $5=(($4/$2)*100);%.1f -->
<!-- TBLFM: $6=if(@-1$2>0, (($2-@-1$2)/@-1$2)*100, 0);%.1f -->
<!-- TBLFM: @>$2=sum(@I..@-1) -->
<!-- TBLFM: @>$3=sum(@I..@-1) -->
<!-- TBLFM: @>$4=sum(@I..@-1) -->
```

---

## 🎮 **Try It Yourself - Exercise**

### **Exercise 1: Personal Budget**
Create a monthly budget tracker:
```markdown
| Category | Budget | Actual | Difference | Status |
| -------- | ------ | ------ | ----------- | ------ |
| Rent | 1500 | 1500 | | |
| Food | 600 | 550 | | |
| Transport | 200 | 250 | | |
| Entertainment | 150 | 100 | | |
| **Total** | | | | |
<!-- TBLFM: $4=($2-$3) -->
<!-- TBLFM: $5=if($4>=0, "✅ Under Budget", "⚠️ Over Budget") -->
<!-- TBLFM: @>$2=sum(@I..@-1) -->
<!-- TBLFM: @>$3=sum(@I..@-1) -->
<!-- TBLFM: @>$4=sum(@I..@-1) -->
```

### **Exercise 2: Study Tracker**
Track your learning progress:
```markdown
| Subject | Study Hours | Target Hours | % Complete | Grade |
| ------- | ----------- | ------------ | ---------- | ----- |
| Math | 25 | 40 | | |
| Science | 30 | 35 | | |
| History | 15 | 30 | | |
| **Total** | | | | |
<!-- TBLFM: $4=(($2/$3)*100);%.0f -->
<!-- TBLFM: $5=if($4>=90, "A", if($4>=80, "B", if($4>=70, "C", "D"))) -->
<!-- TBLFM: @>$2=sum(@I..@-1) -->
<!-- TBLFM: @>$3=sum(@I..@-1) -->
<!-- TBLFM: @>$4=mean(@I..@-1) -->
```

---

## 🔧 **Formula Building Guide**

### **Step-by-Step Formula Creation**

1. **Start Simple**: Begin with basic operations
2. **Add Complexity**: Layer functions and conditions
3. **Test Incrementally**: Add one formula at a time
4. **Validate Results**: Check calculations manually

### **Common Formula Patterns**

#### **Percentage Calculations**
```markdown
<!-- TBLFM: $5=(($3/$2)*100);%.1f -->
```

#### **Conditional Status**
```markdown
<!-- TBLFM: $6=if($4>=80, "✅ Good", "⚠️ Needs Attention") -->
```

#### **Running Totals**
```markdown
<!-- TBLFM: @>$2=sum(@I..@-1) -->
```

---

## 🎯 **Next Steps**

1. **Copy a demo table** into one of your notes
2. **Modify the values** to see formulas update
3. **Create your own** using the patterns shown
4. **Integrate into templates** for automated tracking

---

## 📚 **Related Resources**

- [[01-AREAS/KNOWLEDGE/Table Formulas - Complete Reference]] - Full documentation
- [[02-SYSTEM/Templates/Project Template]] - Add formulas to your projects
- [[02-SYSTEM/Templates/Skill Template]] - Track progress automatically

---

*Start with the simple demos and work your way up to the advanced examples!*

**Happy calculating! 🧮✨**
