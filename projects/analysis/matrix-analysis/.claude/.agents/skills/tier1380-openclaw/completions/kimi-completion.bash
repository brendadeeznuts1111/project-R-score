#!/bin/bash
# Bash completion for kimi CLI
# Source this file in your .bashrc: source /path/to/kimi-completion.bash

_kimi_complete() {
    local cur prev opts
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"
    
    # Main commands
    local commands="metrics shell settings workflow vault interactive monitor plugin config session error job log security notify update telegram openclaw topic channel project webhook hooks watch integration perf color setup test"
    
    # Subcommands for each main command
    case "${prev}" in
        topic)
            local opts="list super channels routing route all"
            COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
            return 0
            ;;
        project)
            local opts="list groups show current route notify"
            COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
            return 0
            ;;
        hooks)
            local opts="install uninstall list"
            COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
            return 0
            ;;
        watch)
            local opts="start status"
            COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
            return 0
            ;;
        webhook)
            local opts="simulate server test"
            COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
            return 0
            ;;
        notify)
            local opts="rules enable disable test stats"
            COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
            return 0
            ;;
        channel)
            local opts="dashboard watch stats"
            COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
            return 0
            ;;
        integration)
            local opts="stats matrix"
            COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
            return 0
            ;;
        perf)
            local opts="memory gc profile monitor timezone describe snapshot drain"
            COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
            return 0
            ;;
        color)
            local opts="convert rgba ansi contrast lighten darken topics"
            COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
            return 0
            ;;
        simulate)
            local opts="push pull_request issues release workflow_run"
            COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
            return 0
            ;;
    esac
    
    # Complete main commands
    if [[ ${COMP_CWORD} -eq 1 ]]; then
        COMPREPLY=( $(compgen -W "${commands}" -- ${cur}) )
        return 0
    fi
}

complete -F _kimi_complete kimi
