#!/bin/bash
# SERO: Shell Environment & Runtime Optimization
# Enhanced shell configuration with performance optimization and error handling

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="$HOME/.shell_backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Header
echo "🚀 SERO: Shell Environment & Runtime Optimization"
echo "=================================================="
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Function to backup shell config
backup_shell_config() {
    local config_file="$1"
    if [[ -f "$config_file" ]]; then
        local backup_file="$BACKUP_DIR/$(basename "$config_file")_$TIMESTAMP.backup"
        cp "$config_file" "$backup_file"
        log_info "Backed up $config_file to $backup_file"
    fi
}

# Function to deduplicate PATH
deduplicate_path() {
    local path_dirs=()
    local seen_dirs=()
    
    IFS=':' read -ra DIRS <<< "$PATH"
    for dir in "${DIRS[@]}"; do
        local found=0
        for seen_dir in "${seen_dirs[@]}"; do
            if [[ "$dir" == "$seen_dir" ]]; then
                found=1
                break
            fi
        done
        if [[ $found -eq 0 ]]; then
            seen_dirs+=("$dir")
            path_dirs+=("$dir")
        fi
    done
    
    local new_path=$(IFS=':'; echo "${path_dirs[*]}")
    echo "$new_path"
}

# Function to validate tool availability
validate_tool() {
    local tool="$1"
    local expected_path="$2"
    
    if command -v "$tool" &> /dev/null; then
        local actual_path=$(which "$tool")
        if [[ "$actual_path" == "$expected_path" ]]; then
            log_success "✅ $tool validated at $actual_path"
            return 0
        else
            log_warning "⚠️  $tool found at $actual_path (expected $expected_path)"
            return 1
        fi
    else
        log_error "❌ $tool not found in PATH"
        return 1
    fi
}

# Function to add path if not exists
add_path_if_not_exists() {
    local config_file="$1"
    local path_line="$2"
    local comment="$3"
    
    if [[ ! -f "$config_file" ]]; then
        touch "$config_file"
    fi
    
    if ! grep -qF "$path_line" "$config_file"; then
        echo "" >> "$config_file"
        echo "# $comment" >> "$config_file"
        echo "$path_line" >> "$config_file"
        log_info "Added $comment to $(basename "$config_file")"
    else
        log_info "$comment already configured in $(basename "$config_file")"
    fi
}

# Detect current shell
CURRENT_SHELL=$(basename "$SHELL")
log_info "Detected shell: $CURRENT_SHELL"

# Check for required tools
log_info "Checking for required tools..."

# Rust/Cargo
if [[ -d "$HOME/.cargo/bin" ]]; then
    log_info "Rust installation found"
else
    log_error "Rust not found. Please install Rust first: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

# Bun
if [[ -d "$HOME/.bun/bin" ]]; then
    log_info "Bun installation found"
else
    log_warning "Bun not found. Install with: curl -fsSL https://bun.sh/install | bash"
fi

# dotenvx
if [[ -f "$HOME/.local/bin/dotenvx" ]]; then
    log_info "dotenvx installation found"
else
    log_warning "dotenvx not found. Install with: curl -fsSL https://dotenvx.com/install.sh | sh"
fi

# Backup existing configurations
log_info "Backing up existing shell configurations..."
backup_shell_config "$HOME/.zshrc"
backup_shell_config "$HOME/.bash_profile"
backup_shell_config "$HOME/.bashrc"
backup_shell_config "$HOME/.profile"

# Optimize PATH
log_info "Optimizing PATH configuration..."
OPTIMIZED_PATH=$(deduplicate_path)

# Configure shell-specific files
case "$CURRENT_SHELL" in
    "zsh")
        # Zsh configuration
        add_path_if_not_exists "$HOME/.zshrc" "export PATH=\"$HOME/.cargo/bin:\$PATH\"" "SERO: Rust/Cargo Configuration"
        add_path_if_not_exists "$HOME/.zshrc" "export PATH=\"$HOME/.local/bin:\$PATH\"" "SERO: Local binaries"
        add_path_if_not_exists "$HOME/.zshrc" "export PATH=\"$HOME/.bun/bin:\$PATH\"" "SERO: Bun runtime"
        add_path_if_not_exists "$HOME/.zshrc" "export PATH=\"$OPTIMIZED_PATH\"" "SERO: Optimized PATH"
        ;;
    "bash")
        # Bash configuration
        add_path_if_not_exists "$HOME/.bash_profile" "export PATH=\"$HOME/.cargo/bin:\$PATH\"" "SERO: Rust/Cargo Configuration"
        add_path_if_not_exists "$HOME/.bash_profile" "export PATH=\"$HOME/.local/bin:\$PATH\"" "SERO: Local binaries"
        add_path_if_not_exists "$HOME/.bash_profile" "export PATH=\"$HOME/.bun/bin:\$PATH\"" "SERO: Bun runtime"
        add_path_if_not_exists "$HOME/.bash_profile" "export PATH=\"$OPTIMIZED_PATH\"" "SERO: Optimized PATH"
        ;;
    *)
        log_warning "Unsupported shell: $CURRENT_SHELL. Adding to .profile"
        add_path_if_not_exists "$HOME/.profile" "export PATH=\"$HOME/.cargo/bin:\$PATH\"" "SERO: Rust/Cargo Configuration"
        add_path_if_not_exists "$HOME/.profile" "export PATH=\"$HOME/.local/bin:\$PATH\"" "SERO: Local binaries"
        add_path_if_not_exists "$HOME/.profile" "export PATH=\"$HOME/.bun/bin:\$PATH\"" "SERO: Bun runtime"
        add_path_if_not_exists "$HOME/.profile" "export PATH=\"$OPTIMIZED_PATH\"" "SERO: Optimized PATH"
        ;;
esac

# Create verification functions
cat > "$HOME/.local/bin/sero-verify" << 'EOF'
#!/bin/bash
# SERO verification script

echo "🔍 SERO Verification"
echo "===================="

# Check tools
echo "Checking tool availability:"
for tool in cargo rustc bun dotenvx; do
    if command -v "$tool" &> /dev/null; then
        echo "✅ $tool: $(which "$tool")"
        "$tool" --version 2>/dev/null | head -1
    else
        echo "❌ $tool: Not found"
    fi
    echo
done

# Check PATH optimization
echo "Checking PATH optimization:"
PATH_DUPLICATES=$(echo "$PATH" | tr ':' '\n' | sort | uniq -d | wc -l)
if [[ $PATH_DUPLICATES -eq 0 ]]; then
    echo "✅ No duplicate PATH entries found"
else
    echo "⚠️  Found $PATH_DUPLICATES duplicate PATH entries"
fi

echo ""
echo "SERO verification complete!"
EOF

chmod +x "$HOME/.local/bin/sero-verify"

# Create status function
cat > "$HOME/.local/bin/sero-status" << 'EOF'
#!/bin/bash
# SERO status report

echo "📊 SERO Status Report"
echo "===================="
echo "Shell: $SHELL"
echo "Home: $HOME"
echo ""

echo "Tool Status:"
for tool in cargo rustc bun dotenvx; do
    if command -v "$tool" &> /dev/null; then
        echo "✅ $tool: Available"
    else
        echo "❌ $tool: Missing"
    fi
done

echo ""
echo "PATH Analysis:"
echo "Total directories: $(echo "$PATH" | tr ':' '\n' | wc -l)"
echo "Unique directories: $(echo "$PATH" | tr ':' '\n' | sort -u | wc -l)"
echo ""

echo "Configuration Files:"
for file in .zshrc .bash_profile .bashrc .profile; do
    if [[ -f "$HOME/$file" ]]; then
        echo "✅ $file: Exists"
    else
        echo "❌ $file: Not found"
    fi
done

echo ""
echo "SERO status complete!"
EOF

chmod +x "$HOME/.local/bin/sero-status"

# Apply changes to current session
export PATH="$HOME/.cargo/bin:$HOME/.local/bin:$HOME/.bun/bin:$PATH"

# Final validation
echo ""
log_info "Validating installation..."

VALIDATION_FAILED=0

# Validate Rust tools
if ! validate_tool "cargo" "$HOME/.cargo/bin/cargo"; then
    VALIDATION_FAILED=1
fi

if ! validate_tool "rustc" "$HOME/.cargo/bin/rustc"; then
    VALIDATION_FAILED=1
fi

# Validate Bun
if [[ -d "$HOME/.bun/bin" ]]; then
    if ! validate_tool "bun" "$HOME/.bun/bin/bun"; then
        VALIDATION_FAILED=1
    fi
fi

# Validate dotenvx
if [[ -f "$HOME/.local/bin/dotenvx" ]]; then
    if ! validate_tool "dotenvx" "$HOME/.local/bin/dotenvx"; then
        VALIDATION_FAILED=1
    fi
fi

# Summary
echo ""
echo "🎯 SERO Installation Summary"
echo "=========================="

if [[ $VALIDATION_FAILED -eq 0 ]]; then
    log_success "✅ All tools validated successfully!"
    log_success "✅ PATH optimized and deduplicated"
    log_success "✅ Shell configuration updated"
    log_success "✅ Verification tools installed"
else
    log_warning "⚠️  Some tools failed validation. Check the logs above."
fi

echo ""
echo "📋 Next Steps:"
echo "1. Run: source ~/.zshrc (or restart terminal)"
echo "2. Test: sero-verify"
echo "3. Check status: sero-status"
echo "4. Continue with: cd poly-kalshi-arb && ./run.sh"
echo ""
echo "🔧 SERO optimization complete!"
