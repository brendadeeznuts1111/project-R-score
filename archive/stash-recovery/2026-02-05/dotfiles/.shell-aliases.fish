# 🚀 FactoryWager Bun CLI Aliases - Fish Shell Version
# Add this to your ~/.config/fish/config.fish

# ⚡ Core Daily Commands
alias bunq 'bun run quick-info'
alias bungh 'bun run github-integration'
alias bundl 'bun run deep-links'
alias bunmon 'bun run mcp-monitor'
alias bunai 'bun run ai-demo'

# 🎯 Enhanced One-Liner Aliases (with flags)
alias bunqs 'bun run quick-info --short'
alias bunghs 'bun run github-integration --short'
alias bundls 'bun run deep-links --short'
alias bunais 'bun run ai-demo --summary'

# 🌅 Morning Ritual (all-in-one)
alias bunmorning 'bunqs and bunghs and bunais'
alias buncheck 'bunq and bungh and bunai'

# 🔍 Deep Link Shortcuts
alias bunfile 'bundl "Bun.file"'
alias bunsecret 'bundl "Bun.secrets.get"'
alias bunnano 'bundl "Bun.nanoseconds"'
alias bunstring 'bundl "stringWidth"'

# 🛠️ Development Workflows
alias bundev 'bunqs and bundl "ai-operations" and bunmon'
alias bunsec 'bunqs and bungh and bunai --no-cache'
alias bunperf 'bunqs and bunai --no-security'

# 📊 Monitoring & Debugging
alias bunwatch 'bunmon'
alias bundebug 'bundl "Bun.debug" and bunqs'
alias bunhealth 'bunq and bunghs and bunais'

# 🎯 Endpoint Status (NEW - HSL Color Coded)
alias bunep 'bun run status:check'
alias bunepw 'bun run status:watch'
alias bunepm 'bun run status:matrix'
alias bunepj 'bun run status:check --json'

# ⚡ Speed Optimizations
alias bunspeed 'bun run quick-info --short and bun run github-integration --short'
alias bunfast 'bunqs and bunghs'

# 🔧 Utility Aliases
alias bunhelp 'echo "FactoryWager CLI: bunq|bungh|bundl|bunmon|bunai|bunmorning"'
alias bunver 'bun --version and echo "FactoryWager v5.1.0"'

# 🐚 Fish Functions
function bundeep
    if test (count $argv) -eq 0
        echo "Usage: bundeep <api_name>"
        return 1
    end
    bun run deep-links $argv[1] --short
end

function bunstatus
    echo "🚀 FactoryWager Status Check"
    bun run quick-info --short
    echo ""
    echo "🔗 GitHub Health"
    bun run github-integration --short
    echo ""
    echo "🤖 AI Insights"
    bun run ai-demo --summary
    echo ""
    echo "🎯 Endpoint Status"
    bun run status:check
end

function bunepcheck
    echo "🎯 Checking endpoint: $argv[1]"
    bun run status:check $argv[1]
end

function bunusage
    echo "🚀 FactoryWager CLI Usage:"
    echo ""
    echo "Daily Commands:"
    echo "  bunq        - Quick status check"
    echo "  bungh       - GitHub health check"
    echo "  bundl <api> - Generate deep links"
    echo "  bunmon      - Start monitoring"
    echo "  bunai       - AI insights demo"
    echo ""
    echo "Quick Variants:"
    echo "  bunqs       - Ultra-fast status"
    echo "  bunghs      - Quick GitHub health"
    echo "  bundls <api> - Quick deep links"
    echo "  bunais      - AI insights summary"
    echo ""
    echo "Workflows:"
    echo "  bunmorning  - Complete morning check"
    echo "  buncheck    - Full system check"
    echo "  bunstatus   - Detailed status report"
    echo ""
    echo "Endpoint Status (HSL Color Coded):"
    echo "  bunep       - Check all endpoints"
    echo "  bunepw      - Watch endpoints continuously"
    echo "  bunepm      - Show HSL status matrix"
    echo "  bunepj      - JSON output for endpoints"
    echo "  bunepcheck  - Check specific endpoint"
    echo ""
    echo "Deep Links:"
    echo "  bunfile     - Bun.file API docs"
    echo "  bunsecret   - Bun.secrets API docs"
    echo "  bunnano     - Bun.nanoseconds docs"
    echo "  bunstring   - stringWidth utils"
    echo ""
    echo "Examples:"
    echo "  bundl \"Bun.file\" --examples"
    echo "  bunai --duration=120"
    echo "  bunmon (Ctrl+C to exit)"
end

# 🎉 Auto-initialization (optional)
if test "$argv[1]" = "--init"
    echo "🎉 FactoryWager CLI aliases initialized!"
    echo "Run 'bunusage' to see all available commands"
    echo "Run 'bunmorning' for your daily system check"
end
