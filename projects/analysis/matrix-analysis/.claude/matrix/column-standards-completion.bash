#!/bin/bash
# Tier-1380 OMEGA: Bash Completion for matrix:cols CLI
# Source this file: source matrix/column-standards-completion.bash

_matrix_cols_complete() {
    local cur prev opts
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"
    
    # Main commands
    local commands="list get search validate stats zones tension cloudflare chrome core validation watch export preview pipe find interactive fav config doctor matrix shortcuts flags version help"
    
    # Pipe formats
    local pipe_formats="tsv csv names ids grep-tags env"
    
    # Find criteria examples
    local find_criteria="zone= owner= type= required=true required=false has="
    
    # Column IDs (0-96)
    local col_ids=""
    for i in {0..96}; do
        col_ids+="$i "
    done
    
    # Zones
    local zones="default core security cloudflare tension infra validation extensibility skills chrome"
    
    # Types
    local types="string integer float boolean enum percent hex url json object variant semver timestamp ms"
    
    # Owners/teams
    local owners="runtime security platform tension infra validation skills"
    
    case "$prev" in
        get)
            COMPREPLY=( $(compgen -W "$col_ids" -- "$cur") )
            return 0
            ;;
        list)
            COMPREPLY=( $(compgen -W "$zones $types $owners" -- "$cur") )
            return 0
            ;;
        search)
            # Search can be anything, but suggest common terms
            local search_terms="tension cloudflare chrome profile cookie anomaly validation url float enum"
            COMPREPLY=( $(compgen -W "$search_terms" -- "$cur") )
            return 0
            ;;
        pipe)
            COMPREPLY=( $(compgen -W "$pipe_formats" -- "$cur") )
            return 0
            ;;
        find)
            COMPREPLY=( $(compgen -W "$find_criteria" -- "$cur") )
            return 0
            ;;
        bun)
            COMPREPLY=( $(compgen -W "matrix/column-standards-all.ts" -- "$cur") )
            return 0
            ;;
        matrix/column-standards-all.ts)
            COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
            return 0
            ;;
    esac
    
    # Default: suggest commands
    if [[ $COMP_CWORD -eq 1 ]]; then
        COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
        return 0
    fi
}

# Register completion for various invocation methods
complete -F _matrix_cols_complete matrix:cols
complete -F _matrix_cols_complete bun
complete -F _matrix_cols_complete column-standards-all.ts
complete -F _matrix_cols_complete ./matrix/column-standards-all.ts

# Add completion for npm run scripts
complete -F _matrix_cols_complete "bun run matrix:cols"
