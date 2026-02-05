# Security Guidelines

## Repository Privacy

This repository contains API credentials and sensitive configuration. **This repository MUST be kept private.**

### Making Repository Private on GitHub

1. Go to your repository on GitHub: `https://github.com/brendadeeznuts1111/geelark`
2. Click **Settings** (top menu)
3. Scroll down to **Danger Zone**
4. Click **Change repository visibility**
5. Select **Make private**
6. Confirm the change

### Protected Files

The following files contain sensitive information and are excluded from version control:

- `.env` - Environment variables with API credentials
- `.env.test` - Test environment credentials
- `.env.*` - All environment files
- `secrets/` - Any secrets directory
- `*.key`, `*.pem` - Certificate and key files

### Credentials Management

**Never commit:**
- API keys
- Bearer tokens
- APP IDs
- Passwords
- Private keys
- Certificates

**Always use:**
- `.env` files (gitignored)
- Environment variables
- Secure credential storage
- Bun's `Bun.env` for runtime access

### If Credentials Are Exposed

If credentials are accidentally committed:

1. **Immediately rotate all exposed credentials**
2. Remove from git history:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env .env.test" \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. Force push (coordinate with team):
   ```bash
   git push origin --force --all
   ```
4. Update all services with new credentials

### Best Practices

1. ✅ Use `.env.example` for documentation (no real credentials)
2. ✅ Verify `.gitignore` includes all sensitive files
3. ✅ Use `git check-ignore` to verify files are ignored
4. ✅ Review commits before pushing: `git diff --cached`
5. ✅ Use pre-commit hooks to prevent credential commits
6. ✅ Keep repository private
7. ✅ Rotate credentials regularly

### Pre-commit Hook (Optional)

Create `.git/hooks/pre-commit`:

```bash
#!/bin/sh
# Prevent committing sensitive files
if git diff --cached --name-only | grep -E '\.env$|\.env\.|secrets/|\.key$|\.pem$'; then
  echo "❌ Error: Attempting to commit sensitive files!"
  echo "   These files are blocked for security reasons."
  exit 1
fi
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

