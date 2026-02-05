# 📅 Daily Notes

> [!INFO] Day-to-Day Tracking
> This section contains your daily journals and activity tracking.

## 🗓️ Recent Daily Notes

```dataview
TABLE 
  mood as "Mood",
  energy as "Energy", 
  focus as "Focus"
FROM #daily-note 
SORT date DESC
LIMIT 7
```

## 📊 Weekly Mood & Energy Trends

```dataview
TABLE 
  mood as "Mood",
  energy as "Energy",
  focus as "Focus"
FROM #daily-note 
WHERE date >= date(today) - dur(7 days)
SORT date DESC
```

---

## 🎯 How to Use Daily Notes

### Morning Setup (5 minutes)
1. **Open today's note** - Create from template if needed
2. **Set priorities** - What are the 3 most important things?
3. **Schedule time blocks** - When will you do deep work?
4. **Check calendar** - Any appointments or commitments?

### Throughout the Day
1. **Track time** - Use the time block table
2. **Capture insights** - Note thoughts and ideas immediately
3. **Update tasks** - Mark things complete as you go
4. **Document progress** - Note wins and challenges

### Evening Review (10 minutes)
1. **Complete tasks** - Mark everything done
2. **Reflect** - What went well? What didn't?
3. **Capture learnings** - What did you discover?
4. **Plan tomorrow** - Set up next day's priorities

---

## 📝 Daily Note Template

Use the [[Daily Note Template]] for consistent structure:
- **Priorities** - Top 3 focus areas
- **Time blocks** - Schedule your day
- **Tasks** - Track to-dos by priority
- **Reflection** - Capture insights and learnings
- **Health** - Track wellness metrics
- **Gratitude** - End with positivity

---

## 🔍 Patterns & Insights

### Energy Patterns
- **Peak hours:** When do you have most energy?
- **Focus blocks:** When can you do deep work?
- **Low energy:** When should you do easier tasks?

### Productivity Insights
- **Best days:** Which days are most productive?
- **Common distractions:** What pulls you off track?
- **Success factors:** What helps you stay focused?

### Mood Tracking
- **Mood influencers:** What affects your mood?
- **Energy management:** What drains or boosts energy?
- **Stress patterns:** When do you feel most stressed?

---

## 📈 Monthly Review Data

Your daily notes provide valuable data for monthly reviews:
- **Task completion rates**
- **Energy and mood trends**
- **Project progress patterns**
- **Learning and development insights**

---

## 🛠️ Tips for Success

### Be Consistent
- **Same time daily** - Build the habit
- **Keep it simple** - Don't overcomplicate
- **Focus on insights** - Not just task tracking

### Be Honest
- **Real priorities** - What really matters?
- **Real challenges** - What's actually difficult?
- **Real feelings** - Acknowledge your state

### Be Useful
- **Actionable insights** - What can you change?
- **Future planning** - Use data to improve
- **Pattern recognition** - Learn from your data

---

## 📅 Creating New Daily Notes

1. **Copy the template** - [[Daily Note Template]]
2. **Update the date** - Use today's date
3. **Fill in morning section** - Set up for success
4. **Save in this folder** - Keep notes organized

---

*Consistency is key - even 5 minutes daily provides valuable insights*
