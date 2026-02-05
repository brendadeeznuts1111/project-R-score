# 🔧 GitHub Pages Troubleshooting Guide

## 404 File Not Found Error

If you're getting a "404 File not found" error on GitHub Pages, here are the
most common solutions:

### 🚀 Quick Fix

Run the deployment script:

```bash
./deploy-github-pages.sh
```

This will prepare your files for GitHub Pages deployment.

### 📋 Step-by-Step Troubleshooting

#### 1. Check Repository Settings

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll down to **Pages** section
4. Ensure **Source** is set to **"Deploy from a branch"**
5. Select **main** branch and **"/ (root)"** folder
6. Click **Save**

#### 2. File Structure Issues

Ensure you have these files in your repository root:

```
/
├── index.html              # Main page (required)
├── .nojekyll              # Prevents Jekyll processing
├── crystal-clear-architecture/
│   ├── index.html         # Your main content
│   ├── docs/
│   └── analytics/
└── README.md
```

#### 3. Branch Configuration

Make sure you're pushing to the correct branch:

```bash
# Check current branch
git branch --show-current

# Switch to main if needed
git checkout main

# Push to main
git push origin main
```

#### 4. Repository Name Issues

If your repository name doesn't match the URL, update the repository name in
GitHub or update the URLs in your HTML files.

#### 5. Custom Domain Issues

If using a custom domain:

- Check your `CNAME` file exists in the repository root
- Ensure DNS is properly configured
- Wait up to 24 hours for DNS propagation

### 🔍 Common Issues & Solutions

#### Issue: "Repository not found"

**Solution**: Make sure the repository is public and GitHub Pages is enabled.

#### Issue: "Page build failed"

**Solution**: Check the Pages build log in repository settings.

#### Issue: Files not showing

**Solution**: Ensure files are committed and pushed to the main branch.

#### Issue: Wrong branch

**Solution**: GitHub Pages serves from the branch specified in settings.

### 📊 Verification Steps

1. **Check file existence**:

   ```bash
   ls -la index.html
   ls -la .nojekyll
   ```

2. **Verify repository settings**:

   - Repository is public
   - GitHub Pages is enabled
   - Correct branch selected

3. **Check build status**:
   - Go to Settings > Pages
   - Check if there's a green checkmark
   - Review any error messages

### 🛠️ Manual Deployment

If automatic deployment fails, deploy manually:

```bash
# 1. Ensure you're on main branch
git checkout main

# 2. Copy files to root
cp -r crystal-clear-architecture/* ./

# 3. Create .nojekyll
touch .nojekyll

# 4. Commit and push
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

### 🔄 Alternative: GitHub Actions

Use this workflow file (`.github/workflows/pages.yml`):

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v4
      - run: cp -r crystal-clear-architecture/* ./
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .
      - uses: actions/deploy-pages@v4
```

### 📞 Need Help?

If you're still having issues:

1. Check the [GitHub Pages documentation](https://docs.github.com/en/pages)
2. Review the repository's Pages build log
3. Open an issue in the repository
4. Check GitHub Status for any outages

### 🎯 Expected Result

After following these steps, your site should be available at:

```
https://[username].github.io/[repository-name]/
```

For example:

```
https://brendadeeznuts1111.github.io/crystal-clear-architecture/
```

### 🚀 Pro Tips

- **Wait time**: Changes can take 5-10 minutes to appear
- **Cache clearing**: Hard refresh (Ctrl+F5) if changes don't show
- **Branch naming**: Use `main` (not `master`) for new repositories
- **File permissions**: Ensure files are not executable unless needed

---

## 📋 Checklist

- [ ] Repository is public
- [ ] GitHub Pages is enabled
- [ ] Correct branch selected (main)
- [ ] index.html exists in repository root
- [ ] .nojekyll file exists
- [ ] Files are committed and pushed
- [ ] Waited 5-10 minutes after deployment

If all boxes are checked and you still have issues, please check the GitHub
Pages build log for specific error messages.
