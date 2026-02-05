#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# FactoryWager Vault Profile Integration v1.3.8
# Terminal shortcuts and secure registry integration
# ═══════════════════════════════════════════════════════════════════════════════

# Vault shortcuts
alias fw-vault-rotate='bun run ~/.factory-wager/factory-wager-vault.ts rotate'
alias fw-vault-health='bun run ~/.factory-wager/factory-wager-vault.ts health'
alias fw-vault-set='bun run ~/.factory-wager/factory-wager/factory-wager-vault.ts set'
alias fw-vault-get='bun run ~/.factory-wager/factory-wager/factory-wager-vault.ts get'
alias fw-vault-list='bun run ~/.factory-wager/factory-wager/factory-wager-vault.ts list'
alias fw-vault-delete='bun run ~/.factory-wager/factory-wager/factory-wager-vault.ts delete'
alias fw-vault-init='bun run ~/.factory-wager/factory-wager-vault.ts init-demo'

# Secure registry auth (auto-fetches from vault)
export BUN_CONFIG_TOKEN="$(bun -e 'console.log(await Bun.secrets.get({service: "factory-wager", name: "com.factory-wager.registry.token"}) ?? "")')"

# Pre-flight vault check
fw-vault-health-silent() {
    if ! fw-vault-health >/dev/null 2>&1; then
        echo "⚠️  Vault credentials missing or expired. Run: fw-vault-rotate"
        return 1
    fi
    return 0
}

# Enhanced FactoryWager commands with vault integration
fw-secure() {
    if ! fw-vault-health-silent; then
        echo "🔐 Initializing vault..."
        fw-vault-init
    fi
    
    echo "🚀 FactoryWager Secure Mode Active"
    echo "📊 Vault Status: $(fw-vault-health >/dev/null 2>&1 && echo '✅ Healthy' || echo '❌ Issues')"
    echo "🔑 Registry Token: ${BUN_CONFIG_TOKEN:0:8}..."
}

# Quick vault status
fw-vault-status() {
    echo "🔐 FactoryWager Vault Status"
    echo "=========================="
    echo "Registry Token: ${BUN_CONFIG_TOKEN:0:8}..."
    echo "Health Check: $(fw-vault-health >/dev/null 2>&1 && echo '✅ Pass' || echo '❌ Fail')"
    echo ""
    echo "Recent Credentials:"
    fw-vault-list | head -20
}

# Emergency vault reset
fw-vault-reset() {
    echo "🚨 EMERGENCY VAULT RESET"
    echo "This will delete all stored credentials."
    read -p "Are you sure? (yes/no): " confirm
    
    if [[ "$confirm" == "yes" ]]; then
        echo "🔄 Rotating all credentials..."
        fw-vault-rotate
        echo "✅ Emergency rotation complete"
    else
        echo "❌ Cancelled"
    fi
}

# Vault backup
fw-vault-backup() {
    local backup_dir="$HOME/.factory-wager/backups"
    local backup_file="$backup_dir/vault-backup-$(date +%Y%m%d-%H%M%S).json"
    
    mkdir -p "$backup_dir"
    
    echo "💾 Creating vault backup..."
    if [[ -f "$HOME/.factory-wager/vault-metadata.json" ]]; then
        cp "$HOME/.factory-wager/vault-metadata.json" "$backup_file"
        echo "✅ Backup created: $backup_file"
    else
        echo "❌ No vault metadata found"
    fi
}

# Vault restore
fw-vault-restore() {
    local backup_dir="$HOME/.factory-wager/backups"
    
    if [[ ! -d "$backup_dir" ]]; then
        echo "❌ No backup directory found"
        return 1
    fi
    
    echo "📂 Available backups:"
    ls -la "$backup_dir"/*.json 2>/dev/null || echo "No backups found"
    
    read -p "Enter backup filename: " backup_file
    
    if [[ -f "$backup_dir/$backup_file" ]]; then
        cp "$backup_dir/$backup_file" "$HOME/.factory-wager/vault-metadata.json"
        echo "✅ Vault restored from $backup_file"
        fw-vault-health
    else
        echo "❌ Backup file not found"
    fi
}

# Initialize on shell startup
if command -v bun >/dev/null 2>&1; then
    # Silent vault check on startup
    if ! fw-vault-health-silent 2>/dev/null; then
        echo "🔐 FactoryWager Vault: Run 'fw-vault-init' to setup credentials"
    fi
fi

# Help function
fw-vault-help() {
    echo "🔐 FactoryWager Vault Commands"
    echo "=============================="
    echo "fw-vault-init          Initialize vault with demo credentials"
    echo "fw-vault-health        Run vault health check"
    echo "fw-vault-rotate        Rotate all credentials"
    echo "fw-vault-list          List all stored credentials"
    echo "fw-vault-set <svc> <key> <val>  Store a credential"
    echo "fw-vault-get <svc> <key>     Retrieve a credential"
    echo "fw-vault-delete <svc> <key>  Delete a credential"
    echo "fw-vault-status        Show vault status"
    echo "fw-vault-backup        Backup vault metadata"
    echo "fw-vault-restore       Restore from backup"
    echo "fw-vault-reset         Emergency reset (rotate all)"
    echo "fw-secure              Enable secure mode"
    echo "fw-vault-help          Show this help"
}

echo "🔐 FactoryWager Vault Profile Loaded"
echo "Type 'fw-vault-help' for available commands"
