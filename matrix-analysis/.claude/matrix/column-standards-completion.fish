#!/usr/bin/env fish
# Tier-1380 OMEGA: Fish Shell Completion for matrix:cols CLI
# Install: cp column-standards-completion.fish ~/.config/fish/completions/matrix-cols.fish

# Main commands
set -l commands list get search validate stats zones \
    tension cloudflare chrome core validation \
    watch export preview pipe find interactive fav config \
    doctor matrix shortcuts flags version help

# Pipe formats
set -l pipe_formats tsv csv names ids grep-tags env

# Zones
set -l zones default core security cloudflare tension infra validation extensibility skills chrome

# Types
set -l types string integer float boolean enum percent hex url json object variant semver timestamp ms

# Owners
set -l owners runtime security platform tension infra validation skills

# Complete subcommands
complete -c matrix-cols -f
complete -c matrix-cols -n "not __fish_seen_subcommand_from $commands" -a "list" -d "List all columns"
complete -c matrix-cols -n "not __fish_seen_subcommand_from $commands" -a "get" -d "Get column details"
complete -c matrix-cols -n "not __fish_seen_subcommand_from $commands" -a "search" -d "Fuzzy search"
complete -c matrix-cols -n "not __fish_seen_subcommand_from $commands" -a "validate" -d "Validate schema"
complete -c matrix-cols -n "not __fish_seen_subcommand_from $commands" -a "stats" -d "Show statistics"
complete -c matrix-cols -n "not __fish_seen_subcommand_from $commands" -a "zones" -d "List zones"
complete -c matrix-cols -n "not __fish_seen_subcommand_from $commands" -a "tension" -d "Tension zone"
complete -c matrix-cols -n "not __fish_seen_subcommand_from $commands" -a "cloudflare" -d "Cloudflare zone"
complete -c matrix-cols -n "not __fish_seen_subcommand_from $commands" -a "chrome" -d "Chrome columns"
complete -c matrix-cols -n "not __fish_seen_subcommand_from $commands" -a "core" -d "Core zone"
complete -c matrix-cols -n "not __fish_seen_subcommand_from $commands" -a "validation" -d "Validation zone"
complete -c matrix-cols -n "not __fish_seen_subcommand_from $commands" -a "watch" -d "Watch for changes"
complete -c matrix-cols -n "not __fish_seen_subcommand_from $commands" -a "export" -d "Export to markdown"
complete -c matrix-cols -n "not __fish_seen_subcommand_from $commands" -a "preview" -d "Preview hyperlinks"
complete -c matrix-cols -n "not __fish_seen_subcommand_from $commands" -a "pipe" -d "Export as format"
complete -c matrix-cols -n "not __fish_seen_subcommand_from $commands" -a "find" -d "Advanced filter"
complete -c matrix-cols -n "not __fish_seen_subcommand_from $commands" -a "interactive" -d "Interactive mode"
complete -c matrix-cols -n "not __fish_seen_subcommand_from $commands" -a "fav" -d "Favorites"
complete -c matrix-cols -n "not __fish_seen_subcommand_from $commands" -a "config" -d "Configuration"
complete -c matrix-cols -n "not __fish_seen_subcommand_from $commands" -a "doctor" -d "Environment check"
complete -c matrix-cols -n "not __fish_seen_subcommand_from $commands" -a "matrix" -d "Matrix grid view"
complete -c matrix-cols -n "not __fish_seen_subcommand_from $commands" -a "shortcuts" -d "List shortcuts"
complete -c matrix-cols -n "not __fish_seen_subcommand_from $commands" -a "flags" -d "Flag reference"
complete -c matrix-cols -n "not __fish_seen_subcommand_from $commands" -a "version" -d "Show version"
complete -c matrix-cols -n "not __fish_seen_subcommand_from $commands" -a "help" -d "Show help"

# Complete arguments for specific commands
complete -c matrix-cols -n "__fish_seen_subcommand_from get" -a "(seq 0 96)"
complete -c matrix-cols -n "__fish_seen_subcommand_from list" -a "$zones $types $owners"
complete -c matrix-cols -n "__fish_seen_subcommand_from pipe" -a "$pipe_formats"
complete -c matrix-cols -n "__fish_seen_subcommand_from find" -a "zone= owner= type= required=true required=false has="

# Global flags
complete -c matrix-cols -l json -d "Output as JSON"
complete -c matrix-cols -l help -s h -d "Show help"
complete -c matrix-cols -l version -s v -d "Show version"
complete -c matrix-cols -l no-color -d "Disable colors"
