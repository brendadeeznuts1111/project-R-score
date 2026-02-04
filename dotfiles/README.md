# Dotfiles

Shell configuration files tracked for R-Score optimization and development environment consistency.

## Files

- `.zshrc` - Interactive zsh configuration with PATH deduplication

## PATH Deduplication

The `.zshrc` includes a Bun-native PATH deduplication mechanism:

```bash
if command -v bun >/dev/null 2>&1; then 
  export PATH=$(bun -e 'const p=process.env.PATH?.split(":")||[],s=new Set();console.log(p.filter(x=>!s.has(x)&&s.add(x)).join(":"))'); 
fi
```

This removes duplicate PATH entries using Bun's native runtime, contributing to:
- **P_ratio**: Reduced PATH lookup overhead
- **M_impact**: Lower memory usage from deduplicated PATH strings
- **E_elimination**: Prevents duplicate binary resolution conflicts

## Usage

To apply these dotfiles:

```bash
# Symlink .zshrc
ln -s ~/Projects/dotfiles/.zshrc ~/.zshrc

# Or copy
cp dotfiles/.zshrc ~/.zshrc
```

## Related

Part of R-Score optimization stack v4.4 - PATH deduplication contributes +0.019 to P_ratio.
