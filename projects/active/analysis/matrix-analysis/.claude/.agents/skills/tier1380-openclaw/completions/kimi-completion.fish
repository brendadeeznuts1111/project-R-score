#!/usr/bin/env fish
# Fish completion for kimi CLI
# Add to your fish config: source /path/to/kimi-completion.fish

# Main commands
set -l kimi_commands metrics shell settings workflow vault interactive monitor plugin config session error job log security notify update telegram openclaw topic channel project webhook hooks watch integration perf color setup test

# Topic subcommands
set -l topic_subcommands list super channels routing route all

# Project subcommands  
set -l project_subcommands list groups show current route notify

# Hooks subcommands
set -l hooks_subcommands install uninstall list

# Watch subcommands
set -l watch_subcommands start status

# Webhook subcommands
set -l webhook_subcommands simulate server test

# Notify subcommands
set -l notify_subcommands rules enable disable test stats

# Channel subcommands
set -l channel_subcommands dashboard watch stats

# Integration subcommands
set -l integration_subcommands stats matrix

# Perf subcommands
set -l perf_subcommands memory gc profile monitor timezone describe snapshot drain

# Color subcommands
set -l color_subcommands convert rgba ansi contrast lighten darken topics

# Disable file completion for certain commands
complete -c kimi -f

# Main command completion
complete -c kimi -n "not __fish_seen_subcommand_from $kimi_commands" -a "$kimi_commands"

# Topic subcommand completion
complete -c kimi -n "__fish_seen_subcommand_from topic; and not __fish_seen_subcommand_from $topic_subcommands" -a "$topic_subcommands"

# Project subcommand completion
complete -c kimi -n "__fish_seen_subcommand_from project; and not __fish_seen_subcommand_from $project_subcommands" -a "$project_subcommands"

# Hooks subcommand completion
complete -c kimi -n "__fish_seen_subcommand_from hooks; and not __fish_seen_subcommand_from $hooks_subcommands" -a "$hooks_subcommands"

# Watch subcommand completion
complete -c kimi -n "__fish_seen_subcommand_from watch; and not __fish_seen_subcommand_from $watch_subcommands" -a "$watch_subcommands"

# Webhook subcommand completion
complete -c kimi -n "__fish_seen_subcommand_from webhook; and not __fish_seen_subcommand_from $webhook_subcommands" -a "$webhook_subcommands"

# Notify subcommand completion
complete -c kimi -n "__fish_seen_subcommand_from notify; and not __fish_seen_subcommand_from $notify_subcommands" -a "$notify_subcommands"

# Channel subcommand completion
complete -c kimi -n "__fish_seen_subcommand_from channel; and not __fish_seen_subcommand_from $channel_subcommands" -a "$channel_subcommands"

# Integration subcommand completion
complete -c kimi -n "__fish_seen_subcommand_from integration; and not __fish_seen_subcommand_from $integration_subcommands" -a "$integration_subcommands"

# Perf subcommand completion
complete -c kimi -n "__fish_seen_subcommand_from perf; and not __fish_seen_subcommand_from $perf_subcommands" -a "$perf_subcommands"

# Color subcommand completion
complete -c kimi -n "__fish_seen_subcommand_from color; and not __fish_seen_subcommand_from $color_subcommands" -a "$color_subcommands"

# Descriptions for main commands
complete -c kimi -n "not __fish_seen_subcommand_from $kimi_commands" -a "topic" -d "Telegram topic manager"
complete -c kimi -n "not __fish_seen_subcommand_from $kimi_commands" -a "project" -d "Project integration"
complete -c kimi -n "not __fish_seen_subcommand_from $kimi_commands" -a "hooks" -d "Git hooks for topic routing"
complete -c kimi -n "not __fish_seen_subcommand_from $kimi_commands" -a "watch" -d "File watcher for projects"
complete -c kimi -n "not __fish_seen_subcommand_from $kimi_commands" -a "webhook" -d "GitHub webhook bridge"
complete -c kimi -n "not __fish_seen_subcommand_from $kimi_commands" -a "notify" -d "Notification system"
complete -c kimi -n "not __fish_seen_subcommand_from $kimi_commands" -a "channel" -d "Channel monitor"
complete -c kimi -n "not __fish_seen_subcommand_from $kimi_commands" -a "integration" -d "Integration status dashboard"
complete -c kimi -n "not __fish_seen_subcommand_from $kimi_commands" -a "perf" -d "JSC Performance monitoring"
complete -c kimi -n "not __fish_seen_subcommand_from $kimi_commands" -a "color" -d "Color utility"
complete -c kimi -n "not __fish_seen_subcommand_from $kimi_commands" -a "setup" -d "Quick setup wizard"
complete -c kimi -n "not __fish_seen_subcommand_from $kimi_commands" -a "test" -d "Run integration test suite"
