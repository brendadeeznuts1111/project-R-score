# 📊 **Table Formulas - Complete Reference**

> [!INFO] **Advanced Table Calculations**: Master formulas for dynamic table content in your knowledge management system.

---

## 🎯 **Overview & Capabilities**

Table formulas enable powerful calculations directly within your Markdown tables, similar to spreadsheet functionality. Perfect for:

- **Financial tracking** and budget calculations
- **Project metrics** and progress analysis  
- **Time tracking** and duration calculations
- **Data aggregation** and statistical analysis
- **Conditional logic** for dynamic content

---

## 🏗️ **Formula Structure**

### **Basic Syntax**
```markdown
<!-- TBLFM: DESTINATION=SOURCE -->
```

### **Complete Example**
```markdown
| Item              | Grams |
| ----------------- | ----- |
| Whole Wheat Flour | 110   |
| Bread Flour       | 748   |
| Warm Water        | 691   |
| Salt              | 18    |
| Starter           | 40    |
| **Total Grams**   |       |
<!-- TBLFM: @>$2=sum(@I..@-1) -->
```

**Result**: Total Grams = 1607

---

## 📍 **Cell References**

### **Row & Column Notation**
| Symbol | Meaning | Example |
|--------|---------|---------|
| `@1`, `@5` | Specific rows (1st, 5th) | `@3` = 3rd row |
| `$1`, `$5` | Specific columns (1st, 5th) | `$2` = 2nd column |
| `@<`, `$<` | First row/column | `@<` = first row |
| `@>`, `$>` | Last row/column | `@>` = last row |
| `@I` | First content row (after header) | `@I` = data start |
| `@-1`, `$+2` | Relative positions | `@-1` = row above |

### **Cell Combinations**
| Reference | Meaning | Usage |
|-----------|---------|-------|
| `@5$3` | Specific cell (row 5, col 3) | `@5$3` |
| `@5` | Entire row 5 (current column) | `@5` |
| `$3` | Entire column 3 (current row) | `$3` |

---

## 📏 **Ranges**

### **Range Syntax**
```markdown
@I..@-1    # From first data row to row above
$2..$4     # Columns 2 through 4
@2$3..@5$5 # From cell (2,3) to cell (5,5)
```

### **Range Examples**
| Range | Description | Size |
|-------|-------------|------|
| `@<..@>` | Entire table | Variable |
| `@2..@4` | Rows 2 through 4 | 3 rows |
| `$3..$5` | Columns 3 through 5 | 3 columns |
| `@3$2..@3$5` | Row 3, columns 2-5 | 1x4 cells |

---

## 🔢 **Functions**

### **sum() - Addition**
```markdown
| Item       | Amount |
| ---------- | ------ |
| Item A     | 100    |
| Item B     | 200    |
| Item C     | 150    |
| **Total**  |        |
<!-- TBLFM: @>$2=sum(@I..@-1) -->
```

### **mean() - Average**
```markdown
| Test       | Score |
| ---------- | ----- |
| Test 1     | 85    |
| Test 2     | 92    |
| Test 3     | 78    |
| **Average**|       |
<!-- TBLFM: @>$2=mean(@I..@-1) -->
```

---

## ➕➖✖️➗ **Algebraic Operations**

### **Addition (+)**
```markdown
| Base | Add 1 | Add 2 | Total |
| ---- | ----- | ----- | ----- |
| 10   | 5     | 3     |       |
| 20   | 8     | 2     |       |
<!-- TBLFM: $4=($1+$2+$3) -->
```

### **Subtraction (-)**
```markdown
| Total | Cost | Profit |
| ----- | ---- | ------ |
| 100   | 60   |        |
| 150   | 80   |        |
<!-- TBLFM: $3=($1-$2) -->
```

### **Multiplication (×)**
```markdown
| Hours | Rate | Total |
| ----- | ---- | ----- |
| 8     | 25   |       |
| 6     | 30   |       |
<!-- TBLFM: $3=($1*$2) -->
```

### **Division (/)**
```markdown
| Total | People | Per Person |
| ----- | ------ | ---------- |
| 100   | 4      |            |
| 200   | 8      |            |
<!-- TBLFM: $3=($1/$2) -->
```

---

## 🔄 **Conditional Operations**

### **if() Function**
```markdown
| Score | Grade |
| ----- | ----- |
| 95    |       |
| 85    |       |
| 75    |       |
<!-- TBLFM: $2=if($1>=90, "A", if($1>=80, "B", "C")) -->
```

### **Comparison Operators**
| Operator | Meaning | Example |
|----------|---------|---------|
| `<`      | Less than | `if($1<50, "Fail", "Pass")` |
| `>`      | Greater than | `if($1>80, "Excellent", "Good")` |
| `<=`     | Less than or equal | `if($1<=100, "Valid", "Invalid")` |
| `>=`     | Greater than or equal | `if($1>=70, "Pass", "Fail")` |
| `==`     | Equal | `if($1==100, "Perfect", "Good")` |
| `!=`     | Not equal | `if($1!=0, "Active", "Inactive")` |

---

## ⏰ **Time & Duration Calculations**

### **Time Tracking**
```markdown
| Task        | Start | End   | Duration |
| ----------- | ----- | ----- | -------- |
| Meeting     | 09:00 | 10:30 |          |
| Development | 10:45 | 14:20 |          |
| Review      | 14:30 | 15:15 |          |
<!-- TBLFM: $>=($3 - $2);hm -->
```

### **Date Calculations**
```markdown
| Start Date | Days Added | End Date |
| ---------- | ---------- | -------- |
| 2024-01-01 | 30         |          |
| 2024-02-01 | 45         |          |
<!-- TBLFM: $>=($1 + ($2 * 86400000));dt -->
```

---

## 🎨 **Formatting Options**

### **Decimal Places**
```markdown
| Value | Percentage |
| ----- | ---------- |
| 0.3333 |            |
| 0.6666 |            |
<!-- TBLFM: $2=($1 * 100);%.2f -->
```

### **DateTime Formatting**
```markdown
| Timestamp | Formatted |
| --------- | --------- |
| 1672531200000 |           |
<!-- TBLFM: $2=$1;dt -->
```

### **Duration Formatting**
```markdown
| Minutes | Formatted |
| ------- | --------- |
| 125     |           |
| 240     |           |
<!-- TBLFM: $2=$1;hm -->
```

---

## 🔗 **Chaining Multiple Formulas**

### **Sequential Calculations**
```markdown
| A | B | C | D |
| - | - | - | - |
| 1 | 2 |   |   |
| 3 | 4 |   |   |
<!-- TBLFM: $3=($1+$2)::$4=($3*2) -->
```

### **Multiple Formula Lines**
```markdown
<!-- TBLFM: $3=($1+$2) -->
<!-- TBLFM: $4=($3*2) -->
<!-- TBLFM: $5=mean($3) -->
```

---

## 📈 **Practical Examples**

### **Budget Tracking**
```markdown
| Category | Budget | Spent | Remaining | % Used |
| -------- | ------ | ----- | --------- | ------ |
| Food     | 500    | 350   |           |       |
| Transport| 200    | 150   |           |       |
| Entertainment | 100 | 75    |           |       |
| **Total**| 800    | 575   |           |       |
<!-- TBLFM: $4=($2-$3) -->
<!-- TBLFM: $5=(($3/$2)*100);%.1f -->
<!-- TBLFM: @>$2=sum(@I..@-1) -->
<!-- TBLFM: @>$3=sum(@I..@-1) -->
<!-- TBLFM: @>$4=sum(@I..@-1) -->
<!-- TBLFM: @>$5=mean(@I..@-1) -->
```

### **Project Progress**
```markdown
| Task | Hours | Completed | % Done |
| ---- | ----- | --------- | ------ |
| Research | 20 | 15 | |
| Development | 40 | 25 | |
| Testing | 15 | 5 | |
| **Total** | 75 | 45 | |
<!-- TBLFM: $4=(($3/$2)*100);%.0f -->
<!-- TBLFM: @>$2=sum(@I..@-1) -->
<!-- TBLFM: @>$3=sum(@I..@-1) -->
<!-- TBLFM: @>$4=mean(@I..@-1) -->
```

### **Weighted Scoring**
```markdown
| Criteria | Weight | Score | Weighted Score |
| -------- | ------ | ----- | ------------- |
| Quality  | 0.4    | 8     |               |
| Speed    | 0.3    | 7     |               |
| Cost     | 0.3    | 9     |               |
| **Total** | 1.0    |       |               |
<!-- TBLFM: $4=($2*$3) -->
<!-- TBLFM: @>$4=sum(@I..@-1) -->
```

---

## 🛠️ **Integration with Your System**

### **Use in Project Templates**
Add calculated fields to your [[02-SYSTEM/Templates/Project Template]]:

```markdown
## 📊 **Project Metrics**

| Task | Estimated | Actual | Variance | % Complete |
| ---- | --------- | ------ | -------- | ---------- |
|      |           |        |          |            |
<!-- TBLFM: $4=($3-$2) -->
<!-- TBLFM: $5=(($3/$2)*100);%.0f -->
```

### **Skill Progress Tracking**
Enhance your [[02-SYSTEM/Templates/Skill Template]]:

```markdown
## 📈 **Progress Tracking**

| Week | Hours | New Skills | Total Hours |
| ---- | ----- | ---------- | ----------- |
| 1    | 5     | 2          |             |
| 2    | 8     | 3          |             |
<!-- TBLFM: $4=sum(@I..@-1) -->
```

### **Daily Review Analytics**
Upgrade your [[02-SYSTEM/Templates/Daily Note Template]]:

```markdown
## 📊 **Daily Metrics**

| Metric | Target | Actual | Achievement |
| ------ | ------ | ------ | ----------- |
| Focus | 8/10   | 7/10   |             |
| Energy | 8/10   | 9/10   |             |
<!-- TBLFM: $4=if($3>=$2, "✅ Met", "⏳ Below") -->
```

---

## 🔧 **Advanced Tips**

### **Nested Functions**
```markdown
<!-- TBLFM: $4=if(sum($2..$3)>100, "Over Budget", "On Track") -->
```

### **Error Handling**
```markdown
<!-- TBLFM: $4=if($2>0, ($1/$2), 0) -->
```

### **Conditional Formatting**
```markdown
<!-- TBLFM: $5=if($4>90, "🟢 Excellent", if($4>70, "🟡 Good", "🔴 Needs Work")) -->
```

---

## 📚 **Related Resources**

- [[02-SYSTEM/Advanced Tables Integration Guide]] - Advanced table features
- [[02-SYSTEM/Obsidian Bases Integration]] - Dynamic data views
- [[01-AREAS/KNOWLEDGE/Bun Runtime Utilities - Quick Reference]] - Technical calculations

---

*Master table formulas to create dynamic, calculated content throughout your knowledge management system!*

**Last Updated: {{date}}* | *Version: 1.0*
