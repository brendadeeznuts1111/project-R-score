# 🔧 **Proper PATH Configuration for Bun (Cross-Platform Security Guide)**

The `PATH` environment variable tells your system where to find executable programs. **Proper PATH setup is critical for Bun security and functionality** - incorrect configuration can lead to:
- Command not found errors
- Execution of malicious binaries from untrusted directories
- Version conflicts between multiple Bun installations
- Permission escalation vulnerabilities
- PATH injection attacks in scripts

---

## 🛡️ **Universal Security Principles (Apply Before Any Changes)**

Before modifying PATH:

1. **Never add `.` (current directory) to PATH** - allows execution of malicious binaries in current folder
   ```bash
   # ❌ Never do this – allows ./malware to run before system binaries
   export PATH=".:$PATH"
   ```

2. **Always verify installation paths exist** before adding to PATH using `ls` or `Test-Path`
3. **Prefer user-specific PATH modifications** over system-wide changes to avoid affecting other users
4. **Use absolute paths only** - no relative paths like `../bin` or `./tools` in PATH
5. **Audit existing PATH** for dangerous entries before adding new ones

---

## 🖥️ **OS-Specific Configuration (Step-by-Step)**

### **macOS / Linux (Bash/Zsh)**

```bash
# 1. Verify Bun installation location exists
if [ -f "$HOME/.bun/bin/bun" ]; then
    echo "✅ Bun found at $HOME/.bun/bin/bun"
else
    echo "❌ Bun not found - install first with: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# 2. Determine shell config file
if [ "$SHELL" = "/bin/zsh" ] || [ "$SHELL" = "/usr/bin/zsh" ]; then
    CONFIG_FILE="$HOME/.zshrc"
elif [ "$SHELL" = "/bin/bash" ] || [ "$SHELL" = "/usr/bin/bash" ]; then
    CONFIG_FILE="$HOME/.bashrc"
else
    echo "⚠️ Unknown shell: $SHELL - manually edit your shell config"
    exit 1
fi

# 3. Check if PATH already contains Bun (avoid duplicates)
if grep -q 'export PATH.*\.bun/bin' "$CONFIG_FILE" 2>/dev/null; then
    echo "✅ Bun PATH already configured in $CONFIG_FILE"
else
    echo 'export PATH="$HOME/.bun/bin:$PATH"' >> "$CONFIG_FILE"
    echo "✅ Added Bun to PATH in $CONFIG_FILE"
fi

# 4. Apply changes to current session
export PATH="$HOME/.bun/bin:$PATH"

# 5. Verify configuration
if command -v bun >/dev/null 2>&1; then
    echo "✅ Bun accessible: $(bun --version)"
else
    echo "❌ Bun not accessible - restart terminal or run: source $CONFIG_FILE"
fi
```

### **Windows (PowerShell - Run as User, Not Administrator)**

```powershell
# 1. Verify Bun installation exists
$bunPath = "$env:LOCALAPPDATA\bun\bin"
$bunExe = "$bunPath\bun.exe"

if (Test-Path $bunExe) {
    Write-Host "✅ Bun found at $bunExe" -ForegroundColor Green
} else {
    Write-Host "❌ Bun not found - install first from https://bun.sh" -ForegroundColor Red
    exit 1
}

# 2. Get current user PATH (not system PATH)
$currentUserPath = [Environment]::GetEnvironmentVariable("PATH", "User")

# 3. Check if Bun path already exists (case-insensitive)
if ($currentUserPath -and $currentUserPath.ToLower().Contains($bunPath.ToLower())) {
    Write-Host "✅ Bun PATH already configured" -ForegroundColor Green
} else {
    # 4. Add Bun to beginning of user PATH (takes precedence)
    $newPath = if ($currentUserPath) { "$bunPath;$currentUserPath" } else { $bunPath }
    
    # 5. Set user PATH permanently (no admin rights needed)
    [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
    Write-Host "✅ Added Bun to user PATH" -ForegroundColor Green
    Write-Host "⚠️ Restart PowerShell/CMD for changes to take effect" -ForegroundColor Yellow
}

# 6. Update current session PATH
$env:PATH = "$bunPath;$env:PATH"

# 7. Verify configuration
try {
    $version = & bun --version 2>$null
    Write-Host "✅ Bun accessible: $version" -ForegroundColor Green
} catch {
    Write-Host "❌ Bun not accessible - restart terminal" -ForegroundColor Red
}
```

---

## 🔍 **Verification Script (Bun-Native Security Audit)**

See `tools/verify-path.ts` for the complete Bun-native audit script.

Run with:
```bash
bun run path:audit
```

This performs:
- ✅ Bun executable accessibility check
- ✅ Multiple installation detection
- ✅ Dangerous PATH entry scanning (temp, downloads, wildcards)
- ✅ PATH length validation (Windows 2048 char limit)
- ✅ Security risk assessment

---

## 🚨 **Critical Security Fixes for Common Issues**

### **Issue: Multiple Bun installations causing conflicts**

```bash
# macOS/Linux: Find all Bun installations
find /usr /opt /home -name "bun" -type f 2>/dev/null | grep -E "(bin/bun|bun/bin/bun)"

# Windows: Find all Bun installations
Get-ChildItem -Path C:\ -Recurse -Name "bun.exe" -ErrorAction SilentlyContinue

# Fix: Clean PATH and use only one installation
export PATH="$HOME/.bun/bin:/usr/local/bin:/usr/bin:/bin"
```

### **Issue: PATH injection vulnerabilities in scripts**

```typescript
// SECURITY: Do not forward inherited PATH from untrusted environments.
// Always construct a minimal, explicit PATH like this.
import { resolve } from 'path';

const safeExec = async (command: string, args: string[] = []) => {
  const safePaths = process.platform === 'win32' 
    ? ['C:\\Windows\\System32', 'C:\\Windows', process.env.LOCALAPPDATA + '\\bun\\bin']
    : ['/usr/bin', '/bin', '/usr/sbin', '/sbin', resolve(process.env.HOME || '~', '.bun/bin')];
  
  const safePath = safePaths.join(process.platform === 'win32' ? ';' : ':');
  return await $`env PATH=${safePath} ${command} ${args}`;
};
```

---

## 📋 **Post-Configuration Verification**

```bash
# 1. Verify Bun is accessible and first in PATH
which bun  # Should show ~/.bun/bin/bun

# 2. Check PATH doesn't contain dangerous entries
echo $PATH | tr ':' '\n' | grep -E '^\.|temp|tmp|downloads|desktop'
# Should return nothing

# 3. Run security audit
bun run path:audit
# Should exit with code 0 (success)
```

---

## 🌐 **Cross-Platform PATH Reference**

| OS | Default Bun Location | PATH Separator | Shell Config | Verification |
|---|---|---|---|---|
| **macOS** | `$HOME/.bun/bin` | `:` | `~/.zshrc` | `which bun` |
| **Linux** | `$HOME/.bun/bin` | `:` | `~/.bashrc` | `command -v bun` |
| **Windows** | `%LOCALAPPDATA%\bun\bin` | `;` | User Environment | `where bun` |

This guide ensures your Bun installation is **secure, accessible, and enterprise-ready**. 🛡️✅

