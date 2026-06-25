# Shell Completions for Kimi CLI

This directory contains shell completion scripts for the `kimi` CLI.

## Supported Shells

- **Bash** - `kimi-completion.bash`
- **Zsh** - `kimi-completion.zsh`
- **Fish** - `kimi-completion.fish`

## Installation

### Bash

Add to your `~/.bashrc`:

```bash
source ~/.kimi/skills/tier1380-openclaw/completions/kimi-completion.bash
```

Or copy to your completions directory:

```bash
sudo cp completions/kimi-completion.bash /etc/bash_completion.d/kimi
```

### Zsh

Add to your `~/.zshrc`:

```zsh
source ~/.kimi/skills/tier1380-openclaw/completions/kimi-completion.zsh
```

Or add to your fpath:

```zsh
mkdir -p ~/.zsh/completions
cp completions/kimi-completion.zsh ~/.zsh/completions/_kimi
# Add to ~/.zshrc: fpath=(~/.zsh/completions $fpath)
```

### Fish

Copy to your Fish completions directory:

```fish
cp completions/kimi-completion.fish ~/.config/fish/completions/kimi.fish
```

## Usage

After installation, press `<Tab>` to complete commands:

```bash
kimi to<Tab>          # Completes to "topic"
kimi topic l<Tab>     # Completes to "list"
kimi perf <Tab>       # Shows: memory gc profile monitor ...
```

## Features

- Complete main commands (topic, project, hooks, etc.)
- Complete subcommands for each main command
- Descriptions for commands (Zsh/Fish)
- No file completion where not needed
