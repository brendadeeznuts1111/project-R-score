# 🔐 GitHub Secrets Setup Guide

## Required Secrets for Release Pipeline

The release workflow requires specific secrets to be configured in your GitHub
repository settings.

---

## 📦 NPM Publishing Secrets

### `NPM_TOKEN`

**Purpose:** Authentication token for publishing to npm registry

**How to get it:**

1. Go to [npmjs.com](https://www.npmjs.com)
2. Sign in to your account
3. Go to **Access Tokens** in your account settings
4. Click **Generate New Token**
5. Choose **Automation** token type
6. Copy the generated token

**Permissions Required:**

- ✅ Publish packages
- ✅ Read packages

---

## 🔒 Private Registry Secrets

### `PRIVATE_REGISTRY_TOKEN`

**Purpose:** Authentication token for publishing to private package registry

**How to get it:**

1. Contact your private registry administrator
2. Request a publish token with the following permissions:
   - ✅ Publish packages to `@fire22/*` scope
   - ✅ Read packages from private registry
3. Copy the provided token

**Permissions Required:**

- ✅ Publish to private registry
- ✅ Read from private registry

---

## 🛠️ Setting Up Secrets in GitHub

### Step 1: Access Repository Settings

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll down to **Secrets and variables**
4. Click **Actions**

### Step 2: Add NPM_TOKEN

1. Click **New repository secret**
2. **Name:** `NPM_TOKEN`
3. **Value:** Paste your npm automation token
4. Click **Add secret**

### Step 3: Add PRIVATE_REGISTRY_TOKEN

1. Click **New repository secret**
2. **Name:** `PRIVATE_REGISTRY_TOKEN`
3. **Value:** Paste your private registry token
4. Click **Add secret**

---

## ✅ Verification

After setting up the secrets, you can verify they work by:

1. **Manual Test:**

```bash
# Test npm publishing (dry run)
npm config set //registry.npmjs.org/:_authToken YOUR_NPM_TOKEN
npm publish --dry-run

# Test private registry access
bun config set //your-private-registry.com/:_authToken YOUR_PRIVATE_TOKEN
bun install @fire22/some-private-package
```

2. **Workflow Test:**

- Push a new release to test the automated workflow
- Check the workflow logs for any authentication errors

---

## 🚨 Troubleshooting

### "Authentication failed" errors:

- ✅ Verify token hasn't expired
- ✅ Check token has correct permissions
- ✅ Ensure token is properly copied (no extra spaces)

### "Secret not found" errors:

- ✅ Verify secret name matches exactly (case-sensitive)
- ✅ Check secret is in the correct repository (not organization)
- ✅ Ensure workflow has access to the secret

### Registry-specific issues:

- ✅ Verify registry URL is correct
- ✅ Check if registry requires specific token format
- ✅ Confirm account has publish permissions

---

## 🔄 Token Rotation

### Regular Maintenance:

- **Rotate tokens every 90 days** for security
- **Use different tokens for different environments** when possible
- **Monitor token usage** through registry dashboards

### Emergency Rotation:

1. Generate new token in registry
2. Update GitHub secret immediately
3. Test with manual publish
4. Revoke old token

---

## 📞 Support

If you encounter issues:

1. Check the workflow logs for specific error messages
2. Verify all prerequisites are met
3. Contact your registry administrator for token issues
4. Open an issue in this repository for workflow problems

---

## 🔐 Security Best Practices

- ✅ **Never commit tokens to code**
- ✅ **Use automation tokens, not personal tokens**
- ✅ **Limit token scope to minimum required permissions**
- ✅ **Rotate tokens regularly**
- ✅ **Monitor token usage**
- ✅ **Revoke tokens immediately if compromised**

---

<div align="center">

**🔐 Secure your release pipeline with proper secret configuration**

_Follow this guide to ensure smooth, secure package publishing_

</div>
