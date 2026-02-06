#!/bin/zsh
# Zsh completion for kimi CLI
# Add to your .zshrc: source /path/to/kimi-completion.zsh

_kimi() {
    local curcontext="$curcontext" state line
    typeset -A opt_args
    
    _arguments -C \
        '1: :_kimi_commands' \
        '*:: :->subcmd'
    
    case "$line[1]" in
        topic)
            _arguments '1: :_kimi_topic_subcommands'
            ;;
        project)
            _arguments '1: :_kimi_project_subcommands'
            ;;
        hooks)
            _arguments '1: :_kimi_hooks_subcommands'
            ;;
        watch)
            _arguments '1: :_kimi_watch_subcommands'
            ;;
        webhook)
            _arguments '1: :_kimi_webhook_subcommands'
            ;;
        notify)
            _arguments '1: :_kimi_notify_subcommands'
            ;;
        channel)
            _arguments '1: :_kimi_channel_subcommands'
            ;;
        integration)
            _arguments '1: :_kimi_integration_subcommands'
            ;;
        perf)
            _arguments '1: :_kimi_perf_subcommands'
            ;;
        color)
            _arguments '1: :_kimi_color_subcommands'
            ;;
    esac
}

_kimi_commands() {
    local commands=(
        'metrics:Metrics collection and dashboard'
        'shell:Shell management and execution'
        'settings:Settings dashboard'
        'workflow:Workflow visualizer'
        'vault:Vault credential management'
        'interactive:Interactive shell mode'
        'monitor:Performance monitoring'
        'plugin:Plugin system'
        'config:Configuration manager'
        'session:Session management'
        'error:Error handling'
        'job:Background job queue'
        'log:Structured logging'
        'security:Security validation'
        'notify:Notification system'
        'update:Auto-update manager'
        'telegram:Telegram integration'
        'openclaw:OpenClaw bridge'
        'topic:Telegram topic manager'
        'channel:Channel monitor'
        'project:Project integration'
        'webhook:GitHub webhook bridge'
        'hooks:Git hooks for topic routing'
        'watch:File watcher for projects'
        'integration:Integration status dashboard'
        'perf:JSC Performance monitoring'
        'color:Color utility'
        'setup:Quick setup wizard'
        'test:Run integration test suite'
    )
    _describe -t commands 'kimi commands' commands
}

_kimi_topic_subcommands() {
    local subcommands=(
        'list:List all topics'
        'super:Show super topics'
        'channels:List channels'
        'routing:Display routing rules'
        'route:Test message routing'
        'all:Show all topic info'
    )
    _describe -t subcommands 'topic subcommands' subcommands
}

_kimi_project_subcommands() {
    local subcommands=(
        'list:List all projects'
        'groups:Show project groups'
        'show:Show project details'
        'current:Show current project'
        'route:Test project routing'
        'notify:Send test notification'
    )
    _describe -t subcommands 'project subcommands' subcommands
}

_kimi_hooks_subcommands() {
    local subcommands=(
        'install:Install git hooks'
        'uninstall:Remove git hooks'
        'list:Show installed hooks'
    )
    _describe -t subcommands 'hooks subcommands' subcommands
}

_kimi_watch_subcommands() {
    local subcommands=(
        'start:Start file watcher'
        'status:Show watch status'
    )
    _describe -t subcommands 'watch subcommands' subcommands
}

_kimi_webhook_subcommands() {
    local subcommands=(
        'simulate:Simulate webhook event'
        'server:Start webhook server'
        'test:Test all event types'
    )
    _describe -t subcommands 'webhook subcommands' subcommands
}

_kimi_notify_subcommands() {
    local subcommands=(
        'rules:Show notification rules'
        'enable:Enable notification'
        'disable:Disable notification'
        'test:Test notification'
        'stats:Show statistics'
    )
    _describe -t subcommands 'notify subcommands' subcommands
}

_kimi_channel_subcommands() {
    local subcommands=(
        'dashboard:Real-time dashboard'
        'watch:Watch mode'
        'stats:Statistics'
    )
    _describe -t subcommands 'channel subcommands' subcommands
}

_kimi_integration_subcommands() {
    local subcommands=(
        'stats:Show statistics'
        'matrix:Show topic-project matrix'
    )
    _describe -t subcommands 'integration subcommands' subcommands
}

_kimi_perf_subcommands() {
    local subcommands=(
        'memory:Show JSC memory report'
        'gc:Force garbage collection'
        'profile:Run profiler test'
        'monitor:Monitor file read memory'
        'timezone:Get/set timezone'
        'describe:Describe a value'
        'snapshot:Full performance snapshot'
        'drain:Drain pending microtasks'
    )
    _describe -t subcommands 'perf subcommands' subcommands
}

_kimi_color_subcommands() {
    local subcommands=(
        'convert:Convert color format'
        'rgba:Get RGBA channels'
        'ansi:Show ANSI color code'
        'contrast:WCAG contrast check'
        'lighten:Lighten color'
        'darken:Darken color'
        'topics:Show topic colors'
    )
    _describe -t subcommands 'color subcommands' subcommands
}

compdef _kimi kimi
