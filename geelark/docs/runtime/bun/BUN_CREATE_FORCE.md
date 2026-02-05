# `bun create --force` Flag

## Overview

The `--force` flag allows `bun create` to overwrite existing files in the target directory instead of failing.

## Syntax

```bash
bun create <template> <directory> --force
```

## When to Use

### 1. Updating Existing Projects
```bash
# Re-scaffold to get latest template updates
bun create user/repo my-existing-app --force
```

### 2. Fixing Broken Templates
```bash
# Re-apply template files
bun create @geelark/create-upload-app my-app --force
```

### 3. Merging Template Changes
```bash
# Merge new template features into existing app
bun create react my-app --force
```

## Behavior

### Without `--force` (Default)
```bash
$ bun create react my-app
❌ Error: Directory "my-app" is not empty

Existing files:
  • package.json
  • src/
  • README.md

Options:
  • Use --force to overwrite existing files
  • Or choose an empty directory
```

### With `--force`
```bash
$ bun create react my-app --force
⚠️  --force enabled: Will overwrite existing files

📁 Creating app: my-app
   Location: /path/to/my-app
   Mode: Force overwrite

  ✅ package.json
  ✅ tsconfig.json
  ✅ src/index.ts
  ✅ .env.upload.template
```

## Important Notes

⚠️ **Warning**: `--force` will overwrite files without asking!

### Files That Are Overwritten
- `package.json`
- `tsconfig.json`
- Source files (`.ts`, `.tsx`, `.js`, `.jsx`)
- Configuration files (`.gitignore`, `bunfig.toml`)
- Documentation files (`README.md`)

### Files That Are Preserved
- `.env` files (unless in template)
- `node_modules/`
- Build artifacts (`dist/`, `build/`)
- `.git/` directory
- Files starting with `.` (hidden files) not in template

## Best Practices

### 1. Backup First
```bash
# Always backup before using --force
cp -r my-app my-app.backup
bun create user/repo my-app --force
```

### 2. Use Git
```bash
# Commit your changes first
git add .
git commit -m "Backup before re-scaffolding"

# Then use --force
bun create user/repo my-app --force

# Review changes
git diff

# Keep what you want, discard what you don't
```

### 3. Selective Overwrite
```bash
# Copy only specific files from template
bun create user/repo temp-template
cp temp-template/package.json my-app/
rm -rf temp-template
```

## Examples

### Update Upload System
```bash
# Get latest upload system features
bun run env:dev  # Backup current config
git add . && git commit -m "Pre-update backup"

bun create @geelark/create-upload-app . --force

# Review what changed
git diff

# Keep your custom changes, accept template updates
git checkout -- package.json  # Keep your package.json
```

### Re-Apply Configuration
```bash
# Re-apply bunfig.toml from template
bun create @geelark/create-upload-app . --force

# Restore your custom settings
git checkout HEAD~1 -- .env.upload
```

## Common Use Cases

### 1. Feature Updates
```bash
# Template has new features
bun create user/repo my-app --force

# Now you have the latest features!
```

### 2. Bug Fixes
```bash
# Template fixed a bug
bun create user/repo my-app --force

# Bug fix applied!
```

### 3. Configuration Reset
```bash
# Reset to default configuration
bun create user/repo my-app --force

# Clean slate with template defaults
```

## Advanced Usage

### Force with Git Integration
```bash
# Create patch file to review changes
bun create user/repo temp-app --force
diff -ru my-app temp-app > template-changes.patch
rm -rf temp-app

# Review and apply selectively
cat template-changes.patch | less
git apply template-changes.patch --reject
```

### Force with Backup
```bash
# Automated backup
backup_file="my-app-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -czf "$backup_file" my-app

echo "Backup created: $backup_file"

# Apply force
bun create user/repo my-app --force
```

### Force with Dry Run
```bash
# See what would be overwritten
ls -la my-app

# Decide if you want to proceed
# bun create user/repo my-app --force
```

## Troubleshooting

### Issue: Accidentally Overwrote Important Files
```bash
# Restore from Git
git checkout HEAD -- path/to/file

# Or from backup
cp my-app.backup/package.json my-app/
```

### Issue: Lost Custom Configuration
```bash
# Git history has your back
git log --follow -- package.json
git show <commit>:package.json > my-package.json
```

### Issue: Template Has Unwanted Changes
```bash
# Revert everything
git reset --hard HEAD

# Or selectively
git checkout HEAD -- file-you-want-to-keep
```

## Safety Checklist

Before using `--force`, make sure:

- [ ] All changes are committed to Git
- [ ] You have a recent backup
- [ ] You know which files will be overwritten
- [ ] You're ready to merge template changes manually
- [ ] You have time to review the diff afterward

## Related Commands

```bash
# Show what would be created (dry run)
bun create user/repo temp-dir --force
# Then compare with your project
diff -rq temp-dir my-app
rm -rf temp-dir

# Create but exclude certain files
bun create user/repo my-app
# Then manually merge specific files

# Use with specific branch
bun create user/repo#stable my-app --force
```

## Summary

| Scenario | Command | Safe? |
|----------|---------|-------|
| New project | `bun create user/repo my-app` | ✅ Always |
| Empty directory | `bun create user/repo my-app` | ✅ Always |
| Update existing | `bun create user/repo my-app --force` | ⚠️ Backup first! |
| Fix broken app | `bun create user/repo my-app --force` | ⚠️ Commit first! |

---

**Remember**: `--force` is powerful but dangerous. Always have a backup or Git commit before using it!
