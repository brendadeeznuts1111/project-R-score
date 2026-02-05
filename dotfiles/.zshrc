# ~/.zshrc - Interactive shell config
# Bun-native runtime — bun is the default for all JS/TS

# PATH (for subshells that skip .zprofile)
[ -f ~/.config/shell/path.sh ] && source ~/.config/shell/path.sh
[ -f ~/.config/shell/aliases.sh ] && source ~/.config/shell/aliases.sh

# Bun as default runtime
export BUN_RUNTIME=1
export NODE_NO_WARNINGS=1

# History
HISTSIZE=50000
SAVEHIST=50000
setopt HIST_IGNORE_DUPS SHARE_HISTORY

# 1Password CLI plugin
[ -f ~/.config/op/plugins.sh ] && source ~/.config/op/plugins.sh

# Bun completions
[ -s "$HOME/.bun/_bun" ] && source "$HOME/.bun/_bun"

# Bun Runtime Optimization - Transpiler Cache
export BUN_RUNTIME_TRANSPILER_CACHE_PATH="$HOME/.bun/.bun-cache"

# Bun Utilities
export BUN_UTILITIES_PATH="/Users/nolarose/.bun/utilities"
export PATH="$BUN_UTILITIES_PATH:$PATH"

# bun completions
[ -s "/Users/nolarose/.bun/_bun" ] && source "/Users/nolarose/.bun/_bun"
if command -v bun >/dev/null 2>&1; then export PATH=$(bun -e 'const p=process.env.PATH?.split(":")||[],s=new Set();console.log(p.filter(x=>!s.has(x)&&s.add(x)).join(":"))'); fi
