# 👥 **USERS REPORT LIVE**

**🔄**:

```dataviewjs
dv.button("🔄 Sync", async () => {
  const statusEl = dv.el("div", "🔄 Running sync...", {
    attr: { style: "margin: 10px 0; padding: 10px; background: #e3f2fd; border-radius: 5px;" }
  });

  try {
    // Safe spawn with timeout
    const proc = Bun.spawn({
      cmd: ['bun', 'users-report:sync'],
      cwd: process.cwd(),
      timeout: 30000,
      maxBuffer: 10e6,
      stdout: 'pipe',
      stderr: 'pipe'
    });

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      throw new Error(`Sync failed with code ${exitCode}`);
    }

    statusEl.innerHTML = "✅ Sync complete!";
    statusEl.style.background = "#e8f5e8";
    statusEl.style.color = "#2e7d32";

    // Auto-refresh data
    setTimeout(() => dv.view.reload(), 1000);

  } catch (error) {
    statusEl.innerHTML = `❌ Sync failed: ${error.message}`;
    statusEl.style.background = "#ffebee";
    statusEl.style.color = "#c62828";
  }
});
```

**Table**:

```dataview
TABLE userId AS "ID", name AS "Name", bets AS "Bets", profit AS "Profit", roi AS "ROI"
FROM "data/users-report"
SORT profit DESC
```

**Top Users**:

```dataview
TABLE name, profit, roi
FROM "data/users-report"
WHERE profit > 1000
SORT roi DESC
```
