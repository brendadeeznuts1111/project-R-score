# scripts/wiki-shortcuts.ps1 - PowerShell aliases and shortcuts for wiki template system

# Wiki Template System PowerShell Shortcuts
# Import this file in your PowerShell: . ~/Projects/scripts/wiki-shortcuts.ps1

# Get project root
$env:WIKI_ROOT = if ($env:WIKI_ROOT) { $env:WIKI_ROOT } else { Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path) }

Write-Host "Wiki Template System Shortcuts Loaded" -ForegroundColor Cyan
Write-Host "Project Root: $env:WIKI_ROOT" -ForegroundColor Cyan
Write-Host ""

# === Template Management ===
function wiki-list {
    bun run "$env:WIKI_ROOT/lib/mcp/wiki-generator-mcp.ts" templates $args
}

function wiki-register {
    bun run "$env:WIKI_ROOT/lib/mcp/wiki-generator-mcp.ts" template $args
}

function wiki-generate {
    param(
        [Parameter(Mandatory=$false)]
        [string]$Format = "markdown",
        
        [string]$BaseUrl,
        
        [string]$Workspace,
        
        [string]$Template
    )
    
    $cliArgs = @("generate")
    
    if ($Format) {
        $cliArgs += "--format", $Format
    }
    
    if ($BaseUrl) {
        $cliArgs += "--base-url", $BaseUrl
    }
    
    if ($Workspace) {
        $cliArgs += "--workspace", $Workspace
    }
    
    bun run "$env:WIKI_ROOT/lib/mcp/wiki-generator-mcp.ts" $cliArgs
}

function wiki-score {
    param(
        [Parameter(Mandatory=$false)]
        [string]$Template
    )
    
    if ($Template) {
        bun run "$env:WIKI_ROOT/lib/mcp/wiki-generator-mcp.ts" template $Template
    } else {
        Write-Host "Template scoring is now integrated with template generation" -ForegroundColor Yellow
        bun run "$env:WIKI_ROOT/lib/mcp/wiki-generator-mcp.ts" templates
    }
}

# === MCP-Specific Functions ===
function wiki-history {
    param(
        [int]$Limit = 10
    )
    
    bun run "$env:WIKI_ROOT/lib/mcp/wiki-generator-mcp.ts" history $Limit
}

function wiki-factorywager {
    param(
        [string]$Context = "default"
    )
    
    bun run "$env:WIKI_ROOT/lib/mcp/wiki-generator-mcp.ts" factorywager $Context
}

function wiki-template {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Name
    )
    
    bun run "$env:WIKI_ROOT/lib/mcp/wiki-generator-mcp.ts" template $Name
}

# === Quick Generate Functions ===
function wiki-gen-md {
    param(
        [string]$Template,
        [string]$BaseUrl,
        [string]$Workspace
    )
    
    $cliArgs = @("generate", "--format", "markdown")
    
    if ($BaseUrl) { $cliArgs += "--base-url", $BaseUrl }
    if ($Workspace) { $cliArgs += "--workspace", $Workspace }
    
    bun run "$env:WIKI_ROOT/lib/mcp/wiki-generator-mcp.ts" $cliArgs
}

function wiki-gen-html {
    param(
        [string]$Template,
        [string]$BaseUrl,
        [string]$Workspace
    )
    
    $cliArgs = @("generate", "--format", "html")
    
    if ($BaseUrl) { $cliArgs += "--base-url", $BaseUrl }
    if ($Workspace) { $cliArgs += "--workspace", $Workspace }
    
    bun run "$env:WIKI_ROOT/lib/mcp/wiki-generator-mcp.ts" $cliArgs
}

function wiki-gen-all {
    param(
        [string]$Template,
        [string]$BaseUrl,
        [string]$Workspace
    )
    
    $cliArgs = @("generate", "--format", "all")
    
    if ($BaseUrl) { $cliArgs += "--base-url", $BaseUrl }
    if ($Workspace) { $cliArgs += "--workspace", $Workspace }
    
    bun run "$env:WIKI_ROOT/lib/mcp/wiki-generator-mcp.ts" $cliArgs
}

# === Performance & Analytics ===
function wiki-bench {
    param(
        [int]$Concurrent = 10,
        [switch]$Verbose
    )
    
    $cliArgs = @("benchmark", "--concurrent", $Concurrent)
    if ($Verbose) { $cliArgs += "--verbose" }
    
    bun run "$env:WIKI_ROOT/examples/wiki-template-cli.ts" $cliArgs
}

function wiki-analytics {
    bun run "$env:WIKI_ROOT/examples/wiki-template-cli.ts" analytics
}

function wiki-clear {
    bun run "$env:WIKI_ROOT/examples/wiki-template-cli.ts" clear
}

# Enhanced benchmark with options
function wiki-bench-heavy {
    param(
        [int]$Concurrent = 20
    )
    
    Write-Host "Running heavy benchmark with $Concurrent concurrent operations" -ForegroundColor Magenta
    bun run "$env:WIKI_ROOT/examples/wiki-template-cli.ts" benchmark --concurrent $Concurrent --verbose
}

# === Testing Shortcuts ===
function wiki-test {
    bun test "$env:WIKI_ROOT/test/wiki-template-system.test.ts"
}

function wiki-bench-test {
    bun test "$env:WIKI_ROOT/test/wiki-template-benchmark.test.ts"
}

function wiki-test-all {
    bun test "$env:WIKI_ROOT/test/wiki-template-*.test.ts"
}

# Test with coverage
function wiki-test-coverage {
    bun test --coverage "$env:WIKI_ROOT/test/wiki-template-*.test.ts"
}

# Quick test functions
function wiki-test-unit {
    Write-Host "Running unit tests..." -ForegroundColor Green
    bun test -t "Template Registration|Template Generation|Scoring System" "$env:WIKI_ROOT/test/wiki-template-system.test.ts"
}

function wiki-test-performance {
    Write-Host "Running performance tests..." -ForegroundColor Green
    bun test -t "Performance|Benchmark|Multi-threaded" "$env:WIKI_ROOT/test/wiki-template-*.test.ts"
}

# === Development Shortcuts ===
function wiki-playground {
    Set-Location "$env:WIKI_ROOT"
    bun run dev
}

function wiki-root {
    Set-Location "$env:WIKI_ROOT"
}

# Quick template creation
function wiki-create-template {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Name,
        
        [string]$Provider = "CONFLUENCE",
        
        [string]$Workspace = "wiki/workspace"
    )
    
    Write-Host "Creating template: $Name" -ForegroundColor Yellow
    
    # Set environment variables for interactive registration
    $env:WIKI_TEMPLATE_NAME = $Name
    $env:WIKI_TEMPLATE_PROVIDER = $Provider
    $env:WIKI_TEMPLATE_WORKSPACE = $Workspace
    $env:WIKI_TEMPLATE_DESCRIPTION = "Template created via wiki-create-template"
    $env:WIKI_TEMPLATE_FORMAT = "markdown"
    $env:WIKI_TEMPLATE_CATEGORY = "custom"
    $env:WIKI_TEMPLATE_PRIORITY = "medium"
    $env:WIKI_TEMPLATE_TAGS = "cli, generated, $Name"
    
    bun run "$env:WIKI_ROOT/examples/wiki-template-cli.ts" register
    
    # Clean up environment variables
    Remove-Item Env:WIKI_TEMPLATE_NAME -ErrorAction SilentlyContinue
    Remove-Item Env:WIKI_TEMPLATE_PROVIDER -ErrorAction SilentlyContinue
    Remove-Item Env:WIKI_TEMPLATE_WORKSPACE -ErrorAction SilentlyContinue
    Remove-Item Env:WIKI_TEMPLATE_DESCRIPTION -ErrorAction SilentlyContinue
    Remove-Item Env:WIKI_TEMPLATE_FORMAT -ErrorAction SilentlyContinue
    Remove-Item Env:WIKI_TEMPLATE_CATEGORY -ErrorAction SilentlyContinue
    Remove-Item Env:WIKI_TEMPLATE_PRIORITY -ErrorAction SilentlyContinue
    Remove-Item Env:WIKI_TEMPLATE_TAGS -ErrorAction SilentlyContinue
    
    Write-Host "Template '$Name' created successfully!" -ForegroundColor Green
}

# === Batch Operations ===
function wiki-generate-all-templates {
    Write-Host "Generating content for all templates..." -ForegroundColor Blue
    $outputDir = "./wiki-batch-output-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
    
    # Get list of templates (simplified for PowerShell)
    $templates = @()
    try {
        $output = bun run "$env:WIKI_ROOT/examples/wiki-template-cli.ts" list 2>$null
        $lines = $output -split "`n"
        foreach ($line in $lines) {
            if ($line -match '^[A-Za-z].*:' -and $line -notmatch '📋|─|Registered|Description|Provider') {
                $templateName = ($line -split ':')[0].Trim()
                if ($templateName) { $templates += $templateName }
            }
        }
    } catch {
        Write-Host "Could not retrieve template list" -ForegroundColor Yellow
    }
    
    foreach ($template in $templates) {
        Write-Host "Processing: $template" -ForegroundColor Cyan
        wiki-gen-md $template "$outputDir/$($template.Replace(' ', '_')).md"
    }
    
    Write-Host "Batch generation complete! Output in: $outputDir" -ForegroundColor Green
}

function wiki-score-all-templates {
    Write-Host "Scoring all templates..." -ForegroundColor Blue
    
    $templates = @()
    try {
        $output = bun run "$env:WIKI_ROOT/examples/wiki-template-cli.ts" list 2>$null
        $lines = $output -split "`n"
        foreach ($line in $lines) {
            if ($line -match '^[A-Za-z].*:' -and $line -notmatch '📋|─|Registered|Description|Provider') {
                $templateName = ($line -split ':')[0].Trim()
                if ($templateName) { $templates += $templateName }
            }
        }
    } catch {
        Write-Host "Could not retrieve template list" -ForegroundColor Yellow
    }
    
    foreach ($template in $templates) {
        Write-Host "Scoring: $template" -ForegroundColor Cyan
        wiki-score $template
        Write-Host ""
    }
}

# === Utility Functions ===
function wiki-status {
    Write-Host "=== Wiki Template System Status ===" -ForegroundColor Magenta
    Write-Host ""
    
    Write-Host "Template Count:" -ForegroundColor Yellow
    try {
        $count = (wiki-list | Select-String "Template" | Measure-Object).Count
        Write-Host $count
    } catch {
        Write-Host "0"
    }
    
    Write-Host "Cache Status:" -ForegroundColor Yellow
    try {
        wiki-analytics | Select-String -Context 0,5 "Cache Statistics"
    } catch {
        Write-Host "Unable to retrieve cache status"
    }
    
    Write-Host "Generator Status:" -ForegroundColor Yellow
    try {
        wiki-analytics | Select-String -Context 0,5 "Generator Statistics"
    } catch {
        Write-Host "Unable to retrieve generator status"
    }
    
    Write-Host ""
}

function wiki-cleanup {
    Write-Host "Cleaning up wiki template system..." -ForegroundColor Yellow
    wiki-clear
    
    # Clean up any test outputs (PowerShell equivalent)
    Get-ChildItem -Path "$env:WIKI_ROOT" -Directory -Name "wiki-batch-output-*" | Where-Object { 
        $_ -match 'wiki-batch-output-\d{8}-\d{6}' 
    } | ForEach-Object {
        $dirPath = Join-Path "$env:WIKI_ROOT" $_
        if ((Get-Item $dirPath).CreationTime -lt (Get-Date).AddDays(-7)) {
            Remove-Item -Path $dirPath -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
    
    # Clean up old generated files
    Get-ChildItem -Path "$env:WIKI_ROOT" -File -Name "*generated*.md" -ErrorAction SilentlyContinue | Where-Object {
        (Get-Item $_).CreationTime -lt (Get-Date).AddDays(-1)
    } | Remove-Item -Force -ErrorAction SilentlyContinue
    
    Write-Host "Cleanup complete!" -ForegroundColor Green
}

function wiki-help {
    Write-Host "Wiki Template System - MCP Integration" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Template Management:" -ForegroundColor Yellow
    Write-Host "  wiki-list                    - List available templates" -ForegroundColor White
    Write-Host "  wiki-template <name>         - Generate from specific template" -ForegroundColor White
    Write-Host "  wiki-generate [options]      - Generate wiki with options" -ForegroundColor White
    Write-Host ""
    Write-Host "Quick Generation:" -ForegroundColor Yellow
    Write-Host "  wiki-gen-md [options]        - Generate markdown format" -ForegroundColor White
    Write-Host "  wiki-gen-html [options]      - Generate HTML format" -ForegroundColor White
    Write-Host "  wiki-gen-all [options]       - Generate all formats" -ForegroundColor White
    Write-Host ""
    Write-Host "MCP-Specific Functions:" -ForegroundColor Yellow
    Write-Host "  wiki-history [limit]         - Show generation history" -ForegroundColor White
    Write-Host "  wiki-factorywager [context]  - Generate with FactoryWager enhancements" -ForegroundColor White
    Write-Host ""
    Write-Host "Usage Examples:" -ForegroundColor Yellow
    Write-Host "  wiki-generate -Format markdown -BaseUrl 'https://docs.example.com'" -ForegroundColor Gray
    Write-Host "  wiki-gen-all -BaseUrl 'https://docs.example.com' -Workspace 'my-wiki'" -ForegroundColor Gray
    Write-Host "  wiki-history 20" -ForegroundColor Gray
    Write-Host "  wiki-factorywager 'production'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Note: Now integrated with MCP Wiki Generator for enhanced capabilities!" -ForegroundColor Green
}

function wiki-test {
    bun test "$env:WIKI_ROOT/test/wiki-template-system.test.ts"
}

function wiki-bench-test {
    bun test "$env:WIKI_ROOT/test/wiki-template-benchmark.test.ts"
}

function wiki-test-all {
    bun test "$env:WIKI_ROOT/test/wiki-template-*.test.ts"
}

# Test with coverage
function wiki-test-coverage {
    bun test --coverage "$env:WIKI_ROOT/test/wiki-template-*.test.ts"
}

# Quick test functions
function wiki-test-unit {
    Write-Host "Running unit tests..." -ForegroundColor Green
    bun test -t "Template Registration|Template Generation|Scoring System" "$env:WIKI_ROOT/test/wiki-template-system.test.ts"
}

function wiki-test-performance {
    Write-Host "Running performance tests..." -ForegroundColor Green
    bun test -t "Performance|Benchmark|Multi-threaded" "$env:WIKI_ROOT/test/wiki-template-*.test.ts"
}

# === Development Shortcuts ===
function wiki-playground {
    Set-Location "$env:WIKI_ROOT"
    bun run dev
}

function wiki-root {
    Set-Location "$env:WIKI_ROOT"
}

# Quick template creation
function wiki-create-template {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Name,
        
        [string]$Provider = "CONFLUENCE",
        
        [string]$Workspace = "wiki/workspace"
    )
    
    Write-Host "Creating template: $Name" -ForegroundColor Yellow
    
    # Set environment variables for interactive registration
    $env:WIKI_TEMPLATE_NAME = $Name
    $env:WIKI_TEMPLATE_PROVIDER = $Provider
    $env:WIKI_TEMPLATE_WORKSPACE = $Workspace
    $env:WIKI_TEMPLATE_DESCRIPTION = "Template created via wiki-create-template"
    $env:WIKI_TEMPLATE_FORMAT = "markdown"
    $env:WIKI_TEMPLATE_CATEGORY = "custom"
    $env:WIKI_TEMPLATE_PRIORITY = "medium"
    $env:WIKI_TEMPLATE_TAGS = "cli, generated, $Name"
    
    bun run "$env:WIKI_ROOT/examples/wiki-template-cli.ts" register
    
    # Clean up environment variables
    Remove-Item Env:WIKI_TEMPLATE_NAME -ErrorAction SilentlyContinue
    Remove-Item Env:WIKI_TEMPLATE_PROVIDER -ErrorAction SilentlyContinue
    Remove-Item Env:WIKI_TEMPLATE_WORKSPACE -ErrorAction SilentlyContinue
    Remove-Item Env:WIKI_TEMPLATE_DESCRIPTION -ErrorAction SilentlyContinue
    Remove-Item Env:WIKI_TEMPLATE_FORMAT -ErrorAction SilentlyContinue
    Remove-Item Env:WIKI_TEMPLATE_CATEGORY -ErrorAction SilentlyContinue
    Remove-Item Env:WIKI_TEMPLATE_PRIORITY -ErrorAction SilentlyContinue
    Remove-Item Env:WIKI_TEMPLATE_TAGS -ErrorAction SilentlyContinue
    
    Write-Host "Template '$Name' created successfully!" -ForegroundColor Green
}

# === Batch Operations ===
function wiki-generate-all-templates {
    Write-Host "Generating content for all templates..." -ForegroundColor Blue
    $outputDir = "./wiki-batch-output-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
    
    # Get list of templates (simplified for PowerShell)
    $templates = @()
    try {
        $output = bun run "$env:WIKI_ROOT/examples/wiki-template-cli.ts" list 2>$null
        $lines = $output -split "`n"
        foreach ($line in $lines) {
            if ($line -match '^[A-Za-z].*:' -and $line -notmatch '📋|─|Registered|Description|Provider') {
                $templateName = ($line -split ':')[0].Trim()
                if ($templateName) { $templates += $templateName }
            }
        }
    } catch {
        Write-Host "Could not retrieve template list" -ForegroundColor Yellow
    }
    
    foreach ($template in $templates) {
        Write-Host "Processing: $template" -ForegroundColor Cyan
        wiki-gen-md $template "$outputDir/$($template.Replace(' ', '_')).md"
    }
    
    Write-Host "Batch generation complete! Output in: $outputDir" -ForegroundColor Green
}

function wiki-score-all-templates {
    Write-Host "Scoring all templates..." -ForegroundColor Blue
    
    $templates = @()
    try {
        $output = bun run "$env:WIKI_ROOT/examples/wiki-template-cli.ts" list 2>$null
        $lines = $output -split "`n"
        foreach ($line in $lines) {
            if ($line -match '^[A-Za-z].*:' -and $line -notmatch '📋|─|Registered|Description|Provider') {
                $templateName = ($line -split ':')[0].Trim()
                if ($templateName) { $templates += $templateName }
            }
        }
    } catch {
        Write-Host "Could not retrieve template list" -ForegroundColor Yellow
    }
    
    foreach ($template in $templates) {
        Write-Host "Scoring: $template" -ForegroundColor Cyan
        wiki-score $template
        Write-Host ""
    }
}

# === Bun-Powered Color Helper ===
function Get-BunColor {
    param(
        [Parameter(Mandatory=$true)]
        [string]$HexColor,
        
        [string]$Format = 'ansi',
        
        [switch]$Background
    )
    
    try {
        # Use Bun to convert hex colors to ANSI/HSL
        $colorScript = @"
const color = Bun.color('$HexColor', '$Format'$($Background ? ", 'background'" : ""));
console.log(color || '');
"@
        
        $result = bun --eval $colorScript 2>$null
        return $result.Trim()
    }
    catch {
        # Fallback to PowerShell colors if Bun.color fails
        return $null
    }
}

function Write-BunColor {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Text,
        
        [Parameter(Mandatory=$true)]
        [string]$HexColor,
        
        [switch]$Background
    )
    
    $ansiColor = Get-BunColor -HexColor $HexColor -Format 'ansi' -Background:$Background
    $reset = Get-BunColor -HexColor 'reset' -Format 'ansi'
    
    if ($ansiColor -and $reset) {
        # Use Bun's ANSI color codes
        Write-Host ($ansiColor + $Text + $reset) -NoNewline
        Write-Host ""  # Add newline
    }
    else {
        # Fallback to PowerShell colors
        $psColor = switch ($HexColor) {
            '#3b82f6' { 'Blue' }
            '#22c55e' { 'Green' }
            '#f59e0b' { 'Yellow' }
            '#ef4444' { 'Red' }
            '#8b5cf6' { 'Magenta' }
            '#06b6d4' { 'Cyan' }
            '#6b7280' { 'Gray' }
            '#1f2937' { 'Black' }
            default { 'White' }
        }
        Write-Host $Text -ForegroundColor $psColor
    }
}

# Enhanced theme functions with Bun.color support
function wiki-theme-enhanced {
    param(
        [ValidateSet('factorywager', 'dark', 'light', 'auto')]
        [string]$Theme = 'factorywager'
    )
    
    $env:WIKI_THEME = $Theme
    
    # Theme definitions with hex colors for Bun.color
    $themes = @{
        'factorywager' = @{
            primary = '#3b82f6'
            success = '#22c55e'
            warning = '#f59e0b'
            error = '#ef4444'
            muted = '#6b7280'
            accent = '#06b6d4'
        }
        'dark' = @{
            primary = '#8b5cf6'
            success = '#10b981'
            warning = '#f59e0b'
            error = '#ef4444'
            muted = '#6b7280'
            accent = '#06b6d4'
        }
        'light' = @{
            primary = '#2563eb'
            success = '#059669'
            warning = '#d97706'
            error = '#dc2626'
            muted = '#6b7280'
            accent = '#0891b2'
        }
    }
    
    $selectedTheme = $themes[$Theme]
    
    # Store colors for Bun.color usage
    $env:WIKI_COLOR_PRIMARY = $selectedTheme.primary
    $env:WIKI_COLOR_SUCCESS = $selectedTheme.success
    $env:WIKI_COLOR_WARNING = $selectedTheme.warning
    $env:WIKI_COLOR_ERROR = $selectedTheme.error
    $env:WIKI_COLOR_MUTED = $selectedTheme.muted
    $env:WIKI_COLOR_ACCENT = $selectedTheme.accent
    
    Write-BunColor "🎨 Applied $Theme theme (using Bun.color HSL)" $selectedTheme.accent
}

# === Bun Secrets Integration ===
function Get-WikiSecret {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Name,
        
        [string]$Service = "com.factorywager.wiki"
    )
    
    try {
        $secretScript = @"
const secret = await Bun.secrets.get({ service: '$Service', name: '$Name' });
console.log(secret || '');
"@
        
        $result = bun --eval $secretScript 2>$null
        return $result.Trim()
    }
    catch {
        return $null
    }
}

function Set-WikiSecret {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Name,
        
        [Parameter(Mandatory=$true)]
        [string]$Value,
        
        [string]$Service = "com.factorywager.wiki"
    )
    
    try {
        $secretScript = @"
await Bun.secrets.set({ service: '$Service', name: '$Name' }, '$Value');
console.log('Secret stored successfully');
"@
        
        $result = bun --eval $secretScript 2>$null
        return $result.Trim() -eq "Secret stored successfully"
    }
    catch {
        return $false
    }
}

function Remove-WikiSecret {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Name,
        
        [string]$Service = "com.factorywager.wiki"
    )
    
    try {
        $secretScript = @"
const deleted = await Bun.secrets.delete({ service: '$Service', name: '$Name' });
console.log(deleted ? 'Secret deleted' : 'Secret not found');
"@
        
        $result = bun --eval $secretScript 2>$null
        return $result.Trim() -eq "Secret deleted"
    }
    catch {
        return $false
    }
}

# Enhanced theme functions with Bun Secrets persistence
function wiki-theme-secure {
    param(
        [ValidateSet('factorywager', 'dark', 'light', 'auto')]
        [string]$Theme = 'factorywager'
    )
    
    # Store theme preference securely using Bun Secrets
    if (Set-WikiSecret -Name "selected-theme" -Value $Theme) {
        Write-BunColor "🔐 Theme preference securely stored" $env:WIKI_COLOR_SUCCESS
        wiki-theme-enhanced $Theme
    }
    else {
        Write-BunColor "❌ Failed to store theme preference" $env:WIKI_COLOR_ERROR
    }
}

function wiki-theme-load {
    # Load theme preference from Bun Secrets
    $savedTheme = Get-WikiSecret -Name "selected-theme"
    
    if ($savedTheme) {
        Write-BunColor "🔓 Loaded saved theme: $savedTheme" $env:WIKI_COLOR_ACCENT
        wiki-theme-enhanced $savedTheme
    }
    else {
        Write-BunColor "No saved theme found, using default" $env:WIKI_COLOR_WARNING
        wiki-theme-enhanced 'factorywager'
    }
}

# Store user preferences securely
function wiki-preferences-set {
    param(
        [hashtable]$Preferences
    )
    
    foreach ($key in $Preferences.Keys) {
        $value = $Preferences[$key]
        if (Set-WikiSecret -Name "pref-$key" -Value $value) {
            Write-BunColor "✅ Stored preference: $key" $env:WIKI_COLOR_SUCCESS
        }
        else {
            Write-BunColor "❌ Failed to store: $key" $env:WIKI_COLOR_ERROR
        }
    }
}

function wiki-preferences-get {
    # Get all stored preferences
    $preferenceKeys = @("default-format", "default-workspace", "auto-refresh", "notification-level")
    $preferences = @{}
    
    foreach ($key in $preferenceKeys) {
        $value = Get-WikiSecret -Name "pref-$key"
        if ($value) {
            $preferences[$key] = $value
        }
    }
    
    if ($preferences.Count -gt 0) {
        Write-BunColor "`n🔓 Stored Preferences:" $env:WIKI_COLOR_ACCENT
        foreach ($pref in $preferences.GetEnumerator()) {
            Write-Host "  $($pref.Key): $($pref.Value)"
        }
    }
    else {
        Write-BunColor "No stored preferences found" $env:WIKI_COLOR_WARNING
    }
    
    return $preferences
}

# Secure credential storage for wiki providers
function wiki-credentials-set {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Provider,
        
        [Parameter(Mandatory=$true)]
        [string]$Username,
        
        [Parameter(Mandatory=$true)]
        [string]$ApiToken
    )
    
    $service = "com.factorywager.wiki.providers"
    
    $usernameSuccess = Set-WikiSecret -Service $service -Name "$Provider-username" -Value $Username
    $tokenSuccess = Set-WikiSecret -Service $service -Name "$Provider-token" -Value $ApiToken
    
    if ($usernameSuccess -and $tokenSuccess) {
        Write-BunColor "🔐 Credentials securely stored for $Provider" $env:WIKI_COLOR_SUCCESS
    }
    else {
        Write-BunColor "❌ Failed to store credentials for $Provider" $env:WIKI_COLOR_ERROR
    }
}

function wiki-credentials-get {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Provider
    )
    
    $service = "com.factorywager.wiki.providers"
    
    $username = Get-WikiSecret -Service $service -Name "$Provider-username"
    $token = Get-WikiSecret -Service $service -Name "$Provider-token"
    
    if ($username -and $token) {
        Write-BunColor "🔓 Retrieved credentials for $Provider" $env:WIKI_COLOR_SUCCESS
        return @{
            Username = $username
            ApiToken = $token
        }
    }
    else {
        Write-BunColor "No credentials found for $Provider" $env:WIKI_COLOR_WARNING
        return $null
    }
}

function wiki-theme-preview {
    Write-Host "`n=== Wiki Theme Preview ===" -ForegroundColor Cyan
    
    $primary = if ($env:WIKI_COLOR_PRIMARY) { $env:WIKI_COLOR_PRIMARY } else { '#3b82f6' }
    $success = if ($env:WIKI_COLOR_SUCCESS) { $env:WIKI_COLOR_SUCCESS } else { '#22c55e' }
    $warning = if ($env:WIKI_COLOR_WARNING) { $env:WIKI_COLOR_WARNING } else { '#f59e0b' }
    $error = if ($env:WIKI_COLOR_ERROR) { $env:WIKI_COLOR_ERROR } else { '#ef4444' }
    
    Write-Host "Primary Color:   $primary" -ForegroundColor Blue
    Write-Host "Success Color:   $success" -ForegroundColor Green
    Write-Host "Warning Color:   $warning" -ForegroundColor Yellow
    Write-Host "Error Color:     $error" -ForegroundColor Red
    
    Write-Host "`nSample Output:" -ForegroundColor White
    Write-Host "✅ Success message" -ForegroundColor Green
    Write-Host "⚠️ Warning message" -ForegroundColor Yellow
    Write-Host "❌ Error message" -ForegroundColor Red
    Write-Host "📋 Info message" -ForegroundColor Blue
    Write-Host ""
}

function wiki-theme-reset {
    Remove-Item Env:WIKI_THEME -ErrorAction SilentlyContinue
    Remove-Item Env:WIKI_COLOR_PRIMARY -ErrorAction SilentlyContinue
    Remove-Item Env:WIKI_COLOR_SUCCESS -ErrorAction SilentlyContinue
    Remove-Item Env:WIKI_COLOR_WARNING -ErrorAction SilentlyContinue
    Remove-Item Env:WIKI_COLOR_ERROR -ErrorAction SilentlyContinue
    Write-Host "Theme reset to default (FactoryWager)" -ForegroundColor Cyan
}

# === Utility Functions ===
function wiki-status {
    Write-Host "=== Wiki Template System Status ===" -ForegroundColor Magenta
    Write-Host "  wiki-playground              Start development server"
    Write-Host "  wiki-root                    Go to project root"
    Write-Host "  wiki-create-template <name>  Quick template creation"
    Write-Host ""
    Write-Host "Batch Operations:" -ForegroundColor Yellow
    Write-Host "  wiki-generate-all-templates  Generate content for all templates"
    Write-Host "  wiki-score-all-templates     Score all templates"
    Write-Host ""
    Write-Host "Utilities:" -ForegroundColor Yellow
    Write-Host "  wiki-status                  Show system status"
    Write-Host "  wiki-cleanup                 Clean up temporary files"
    Write-Host "  wiki-help                    Show this help"
    Write-Host "  wiki-theme                   Set wiki theme"
    Write-Host "  wiki-theme-preview           Preview current theme"
    Write-Host "  wiki-theme-reset             Reset theme to default"
    Write-Host ""
    Write-Host "Project Root: $env:WIKI_ROOT" -ForegroundColor Green
    Write-Host ""
}

# === Welcome Message ===
if ($args[0] -ne "--silent") {
    Write-Host "Wiki Template System shortcuts ready!" -ForegroundColor Green
    Write-Host "Type 'wiki-help' for available commands" -ForegroundColor Cyan
    Write-Host ""
}

# Export functions if needed (for modules)
Export-ModuleMember -Function *
