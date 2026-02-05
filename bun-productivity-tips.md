# 🚀 Bun Productivity Tips & One-Liners

A curated collection of powerful Bun CLI commands for maximum developer productivity.

## 📦 **Project Creation & Package Management**

### Create new project + install package in one line
```bash
bun create -y my-app && cd my-app && bun add zod
```
**Use case:** Quick project setup with essential dependencies

## 🏃 **Development & Running**

### Run dev server with hot reload + inspect
```bash
bun --hot --inspect server.ts
```
**Use case:** Development with live reloading and debugging capabilities

### Execute package binary without install (bunx equivalent)
```bash
bunx cowsay "Bun is fast!"
```
**Use case:** Run CLI tools without global installation

## 🧪 **Testing**

### Test with watch + timeout + coverage
```bash
bun test --watch --timeout 5000 --coverage
```
**Use case:** Comprehensive testing with live updates and coverage reports

## 🔄 **Updates & Maintenance**

### Upgrade Bun + check revision immediately
```bash
bun upgrade && bun --revision
```
**Use case:** Keep Bun current and verify the update

### Generate completions for zsh/bash/fish
```bash
bun completions > ~/.bun_completions && echo "source ~/.bun_completions" >> ~/.zshrc
```
**Use case:** Enable shell autocompletion for Bun commands

## ⚡ **Quick Start**

### One-line init + run hello world
```bash
bun init -y && echo 'console.log("Hello from Bun!")' > index.ts && bun run index.ts
```
**Use case:** Instant project creation and verification

## 🎯 **Advanced Usage Patterns**

### Combined workflow: Create, install, test
```bash
bun create -y my-project && cd my-project && bun add typescript @types/bun && bun test
```

### Development with file watching
```bash
bun --watch --hot run dev
```

### Bundle for production
```bash
bun build --minify --outdir dist index.ts
```

### Run scripts from package.json
```bash
bun run dev
bun run build
bun run test
```

## 💡 **Tips for Maximum Productivity**

- Use `bun --help` to explore all available options
- Combine flags for powerful workflows (e.g., `--hot --inspect --watch`)
- Leverage `bunx` for CLI tools instead of global npm installs
- Use `bun create` for instant project scaffolding
- Enable shell completions for faster command entry

## 🔧 **Environment Setup**

Add to your `~/.zshrc` or `~/.bashrc`:
```bash
# Bun completions
[ -s ~/.bun_completions ] && source ~/.bun_completions

# Bun environment
export PATH="$HOME/.bun/bin:$PATH"
```

---

**🚀 Happy coding with Bun!** These commands will supercharge your development workflow.