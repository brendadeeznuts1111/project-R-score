# Git Workflow for Root Directory Organization

**Success = (Measurement × Algorithm × Memory × Network × Platform × Database × Testing × Monitoring × Architecture × Business × Culture × Innovation)ⁿ**

The following commands capture the steps needed to stage, commit, and push the changes that reorganize the project root (moving documentation to `docs/`, reports to `reports/`, and archiving old files in `.root/`).

```bash
# 1️⃣ Stage everything (new files, deletions, modifications)
git add -A

# 2️⃣ Commit with a descriptive message
git commit -m "Organize root directory: move documentation to docs/ and reports to reports/ (archive old files in .root/)"

# 3️⃣ Push the commit to the remote
git push
```

You can run these commands from the repository root (`windsurf-project`).

Feel free to edit the file further if needed, or let me know if there’s anything else you’d like to add!
