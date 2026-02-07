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
    # Input validation for environment variables
    if (-not (Test-SafeString -Input $env:WIKI_ROOT)) {
        throw "Invalid WIKI_ROOT environment variable"
    }
    
    try {
        bun run "$env:WIKI_ROOT/lib/mcp/wiki-generator-mcp.ts" templates $args
    } catch {
        Write-Warning "Failed to list wiki templates: $_"
        throw
    }
}

function wiki-register {
    # Input validation for environment variables
    if (-not (Test-SafeString -Input $env:WIKI_ROOT)) {
        throw "Invalid WIKI_ROOT environment variable"
    }
    
    try {
        bun run "$env:WIKI_ROOT/lib/mcp/wiki-generator-mcp.ts" template $args
    } catch {
        Write-Warning "Failed to register wiki template: $_"
        throw
    }
}

function wiki-generate {
    param(
        [Parameter(Mandatory=$false)]
        [string]$Format = "markdown",
        
        [string]$BaseUrl,
        
        [string]$Workspace,
        
        [string]$Template
    )
    
    # Input validation
    if (-not (Test-SafeString -Input $env:WIKI_ROOT)) {
        throw "Invalid WIKI_ROOT environment variable"
    }
    
    if ($Format -and -not (Test-SafeString -Input $Format -Pattern '^[a-zA-Z0-9_-]+$')) {
        throw "Invalid format: $Format"
    }
    
    if ($BaseUrl -and -not (Test-SafeString -Input $BaseUrl -Pattern '^https?://[\w\.-]+')) {
        throw "Invalid base URL: $BaseUrl"
    }
    
    if ($Workspace -and -not (Test-SafeString -Input $Workspace)) {
        throw "Invalid workspace: $Workspace"
    }
    
    if ($Template -and -not (Test-SafeString -Input $Template)) {
        throw "Invalid template: $Template"
    }
    
    try {
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
        
        if ($Template) {
            $cliArgs += "--template", $Template
        }
        
        bun run "$env:WIKI_ROOT/lib/mcp/wiki-generator-mcp.ts" $cliArgs
    } catch {
        Write-Warning "Failed to generate wiki content: $_"
        throw
    }
}

function wiki-score {
    param(
        [Parameter(Mandatory=$false)]
        [string]$Template
    )
    
    # Input validation
    if (-not (Test-SafeString -Input $env:WIKI_ROOT)) {
        throw "Invalid WIKI_ROOT environment variable"
    }
    
    if ($Template -and -not (Test-SafeString -Input $Template)) {
        throw "Invalid template name: $Template"
    }
    
    try {
        if ($Template) {
            bun run "$env:WIKI_ROOT/lib/mcp/wiki-generator-mcp.ts" template $Template
        } else {
            Write-Host "Template scoring is now integrated with template generation" -ForegroundColor Yellow
            bun run "$env:WIKI_ROOT/lib/mcp/wiki-generator-mcp.ts" templates
        }
    } catch {
        Write-Warning "Failed to score wiki template: $_"
        throw
    }
}

# === MCP-Specific Functions ===
function wiki-history {
    param(
        [int]$Limit = 10
    )
    
    # Input validation
    if (-not (Test-SafeString -Input $env:WIKI_ROOT)) {
        throw "Invalid WIKI_ROOT environment variable"
    }
    
    if ($Limit -lt 1 -or $Limit -gt 1000) {
        throw "Limit must be between 1 and 1000"
    }
    
    try {
        bun run "$env:WIKI_ROOT/lib/mcp/wiki-generator-mcp.ts" history $Limit
    } catch {
        Write-Warning "Failed to get wiki history: $_"
        throw
    }
}

function wiki-factorywager {
    param(
        [string]$Context = "default"
    )
    
    # Input validation
    if (-not (Test-SafeString -Input $env:WIKI_ROOT)) {
        throw "Invalid WIKI_ROOT environment variable"
    }
    
    if ($Context -and -not (Test-SafeString -Input $Context -Pattern '^[a-zA-Z0-9._-]+$')) {
        throw "Invalid context: $Context"
    }
    
    try {
        bun run "$env:WIKI_ROOT/lib/mcp/wiki-generator-mcp.ts" factorywager $Context
    } catch {
        Write-Warning "Failed to get FactoryWager wiki: $_"
        throw
    }
}

function wiki-template {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Name
    )
    
    # Input validation
    if (-not (Test-SafeString -Input $env:WIKI_ROOT)) {
        throw "Invalid WIKI_ROOT environment variable"
    }
    
    if (-not (Test-SafeString -Input $Name)) {
        throw "Invalid template name: $Name"
    }
    
    try {
        bun run "$env:WIKI_ROOT/lib/mcp/wiki-generator-mcp.ts" template $Name
    } catch {
        Write-Warning "Failed to get wiki template '$Name': $_"
        throw
    }
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

# === Configuration Management ===
$script:WikiConfig = @{
    ScriptTimeout = 30
    MaxSecretLength = 2048
    MaxStringLength = 256
    LogLevel = 'Info'
    AuditLogEnabled = $true
    ConfigFile = "$env:WIKI_ROOT/.wiki-config.json"
    RateLimitWindow = 60  # seconds
    RateLimitMaxRequests = 100
    PerformanceMetricsEnabled = $true
    DebugLoggingEnabled = $false
}

# Performance metrics collection
$script:PerformanceMetrics = @{
    SecretOperations = 0
    ScriptExecutions = 0
    CacheHits = 0
    CacheMisses = 0
    TotalExecutionTime = 0
    LastReset = (Get-Date)
}

# Rate limiting tracking
$script:RateLimitTracker = @{
    Requests = @()
    WindowStart = (Get-Date)
}

# Configuration cache
$script:ConfigCache = @{}
$script:CacheExpiry = 300 # 5 minutes

function Get-WikiConfig {
    param([string]$Key)
    
    # Check cache first
    if ($Key -and $script:ConfigCache.ContainsKey($Key)) {
        $cacheEntry = $script:ConfigCache[$Key]
        if ((Get-Date) -lt $cacheEntry.Expiry) {
            $script:PerformanceMetrics.CacheHits++
            return $cacheEntry.Value
        } else {
            $script:ConfigCache.Remove($Key)
        }
    }
    
    # Load from file if not in memory
    if (-not $script:WikiConfig.ContainsKey('_LoadedFromFile')) {
        Load-WikiConfigFromFile
    }
    
    $script:PerformanceMetrics.CacheMisses++
    
    if ($Key) {
        $value = $script:WikiConfig[$Key]
        # Cache the value
        $script:ConfigCache[$Key] = @{
            Value = $value
            Expiry = (Get-Date).AddSeconds($script:CacheExpiry)
        }
        return $value
    }
    
    return $script:WikiConfig.Clone()
}

function Load-WikiConfigFromFile {
    $configFile = Get-WikiConfig -Key 'ConfigFile'
    
    if (Test-Path $configFile) {
        try {
            $fileConfig = Get-Content $configFile -Raw | ConvertFrom-Json
            foreach ($key in $fileConfig.PSObject.Properties) {
                if ($script:WikiConfig.ContainsKey($key.Name)) {
                    $script:WikiConfig[$key.Name] = $key.Value
                }
            }
            $script:WikiConfig['_LoadedFromFile'] = $true
            
            if ((Get-WikiConfig -Key 'DebugLoggingEnabled')) {
                Write-Debug "Configuration loaded from file: $configFile"
            }
        } catch {
            Write-Warning "Failed to load configuration from file: $_"
        }
    }
}

function Save-WikiConfigToFile {
    $configFile = Get-WikiConfig -Key 'ConfigFile'
    $configDir = Split-Path $configFile -Parent
    
    try {
        if (-not (Test-Path $configDir)) {
            New-Item -ItemType Directory -Path $configDir -Force | Out-Null
        }
        
        # Create a copy without internal keys
        $configToSave = @{}
        foreach ($key in $script:WikiConfig.Keys) {
            if (-not $key.StartsWith('_')) {
                $configToSave[$key] = $script:WikiConfig[$key]
            }
        }
        
        $configToSave | ConvertTo-Json -Depth 10 | Set-Content -Path $configFile
        
        if ((Get-WikiConfig -Key 'DebugLoggingEnabled')) {
            Write-Debug "Configuration saved to file: $configFile"
        }
    } catch {
        Write-Warning "Failed to save configuration to file: $_"
    }
}

function Set-WikiConfig {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Key,
        
        [Parameter(Mandatory=$true)]
        $Value
    )
    
    # Check rate limiting
    if (-not (Test-RateLimit 'config-change')) {
        throw "Rate limit exceeded for configuration changes"
    }
    
    # Validate configuration changes
    switch ($Key) {
        'ScriptTimeout' {
            if ($Value -is [int] -and $Value -gt 0 -and $Value -le 300) {
                $script:WikiConfig[$Key] = $Value
            } else {
                throw "ScriptTimeout must be between 1 and 300 seconds"
            }
        }
        'MaxSecretLength' {
            if ($Value -is [int] -and $Value -gt 0 -and $Value -le 10240) {
                $script:WikiConfig[$Key] = $Value
            } else {
                throw "MaxSecretLength must be between 1 and 10240 characters"
            }
        }
        'MaxStringLength' {
            if ($Value -is [int] -and $Value -gt 0 -and $Value -le 1024) {
                $script:WikiConfig[$Key] = $Value
            } else {
                throw "MaxStringLength must be between 1 and 1024 characters"
            }
        }
        'LogLevel' {
            if ($Value -in @('Debug', 'Info', 'Warning', 'Error')) {
                $script:WikiConfig[$Key] = $Value
            } else {
                throw "LogLevel must be one of: Debug, Info, Warning, Error"
            }
        }
        'AuditLogEnabled' {
            if ($Value -is [bool]) {
                $script:WikiConfig[$Key] = $Value
            } else {
                throw "AuditLogEnabled must be a boolean value"
            }
        }
        'RateLimitWindow' {
            if ($Value -is [int] -and $Value -gt 0 -and $Value -le 3600) {
                $script:WikiConfig[$Key] = $Value
            } else {
                throw "RateLimitWindow must be between 1 and 3600 seconds"
            }
        }
        'RateLimitMaxRequests' {
            if ($Value -is [int] -and $Value -gt 0 -and $Value -le 10000) {
                $script:WikiConfig[$Key] = $Value
            } else {
                throw "RateLimitMaxRequests must be between 1 and 10000"
            }
        }
        'PerformanceMetricsEnabled' {
            if ($Value -is [bool]) {
                $script:WikiConfig[$Key] = $Value
            } else {
                throw "PerformanceMetricsEnabled must be a boolean value"
            }
        }
        'DebugLoggingEnabled' {
            if ($Value -is [bool]) {
                $script:WikiConfig[$Key] = $Value
            } else {
                throw "DebugLoggingEnabled must be a boolean value"
            }
        }
        default {
            throw "Unknown configuration key: $Key"
        }
    }
    
    # Clear cache for this key
    if ($script:ConfigCache.ContainsKey($Key)) {
        $script:ConfigCache.Remove($Key)
    }
    
    # Save to file
    Save-WikiConfigToFile
    
    if ((Get-WikiConfig -Key 'DebugLoggingEnabled')) {
        Write-Debug "Configuration updated: $Key = $Value"
    }
}

function Test-RateLimit {
    param([string]$Operation = 'default')
    
    $window = Get-WikiConfig -Key 'RateLimitWindow'
    $maxRequests = Get-WikiConfig -Key 'RateLimitMaxRequests'
    $now = (Get-Date)
    
    # Clean old requests
    $cutoff = $now.AddSeconds(-$window)
    $script:RateLimitTracker.Requests = $script:RateLimitTracker.Requests | Where-Object { $_ -gt $cutoff }
    
    # Check if we're at the limit
    if ($script:RateLimitTracker.Requests.Count -ge $maxRequests) {
        if ((Get-WikiConfig -Key 'DebugLoggingEnabled')) {
            Write-Debug "Rate limit exceeded for operation: $Operation"
        }
        return $false
    }
    
    # Add current request
    $script:RateLimitTracker.Requests += $now
    return $true
}

function Update-PerformanceMetrics {
    param(
        [string]$Operation,
        [double]$ExecutionTime = 0
    )
    
    if (-not (Get-WikiConfig -Key 'PerformanceMetricsEnabled')) {
        return
    }
    
    switch ($Operation) {
        'secret-operation' {
            $script:PerformanceMetrics.SecretOperations++
        }
        'script-execution' {
            $script:PerformanceMetrics.ScriptExecutions++
            $script:PerformanceMetrics.TotalExecutionTime += $ExecutionTime
        }
        'cache-hit' {
            $script:PerformanceMetrics.CacheHits++
        }
        'cache-miss' {
            $script:PerformanceMetrics.CacheMisses++
        }
    }
    
    if ((Get-WikiConfig -Key 'DebugLoggingEnabled')) {
        Write-Debug "Performance metrics updated: $Operation ($ExecutionTime ms)"
    }
}

function Get-PerformanceMetrics {
    return $script:PerformanceMetrics.Clone()
}

function Reset-PerformanceMetrics {
    $script:PerformanceMetrics = @{
        SecretOperations = 0
        ScriptExecutions = 0
        CacheHits = 0
        CacheMisses = 0
        TotalExecutionTime = 0
        LastReset = (Get-Date)
    }
    
    if ((Get-WikiConfig -Key 'DebugLoggingEnabled')) {
        Write-Debug "Performance metrics reset"
    }
}

function Write-DebugLog {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,
        
        [string]$Component = "WikiSystem"
    )
    
    if ((Get-WikiConfig -Key 'DebugLoggingEnabled')) {
        $timestamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss.fff')
        Write-Debug "[$timestamp][$Component] $Message"
        
        # Also write to debug log file if WIKI_DEBUG_LOG is set
        if ($env:WIKI_DEBUG_LOG) {
            $logEntry = "[$timestamp][$Component] $Message"
            Add-Content -Path $env:WIKI_DEBUG_LOG -Value $logEntry -ErrorAction SilentlyContinue
        }
    }
}

# === Input Validation Framework ===
function Test-SafeString {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Input,
        
        [string]$Pattern = '^[a-zA-Z0-9._-]+$',
        
        [int]$MaxLength = 0
    )
    
    # Use configured max length if not specified
    if ($MaxLength -eq 0) {
        $MaxLength = Get-WikiConfig -Key 'MaxStringLength'
    }
    
    return $Input -match $Pattern -and $Input.Length -gt 0 -and $Input.Length -le $MaxLength
}

function Test-SafeHexString {
    param(
        [Parameter(Mandatory=$true)]
        [string]$HexColor
    )
    
    return $HexColor -match '^#[0-9a-fA-F]{6}$'
}

function Test-SafeServiceName {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ServiceName
    )
    
    $maxLength = Get-WikiConfig -Key 'MaxStringLength'
    return $ServiceName -match '^[a-zA-Z0-9._-]+$' -and $ServiceName.Length -le $maxLength
}

# === Secure Bun Script Execution ===
function Invoke-SecureBunScript {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Script,
        
        [hashtable]$Env = @{},
        
        [string]$Timeout = ""
    )
    
    # Use configured timeout if not specified
    if (-not $Timeout) {
        $timeoutSeconds = Get-WikiConfig -Key 'ScriptTimeout'
        $Timeout = "$timeoutSeconds"
    }
    
    $tempFile = [System.IO.Path]::GetTempFileName()
    try {
        # Write script to temporary file
        $Script | Out-File -FilePath $tempFile -Encoding UTF8
        
        # Execute with proper error handling
        $process = Start-Process -FilePath "bun" -ArgumentList @("run", $tempFile) -NoNewWindow -PassThru -RedirectStandardOutput "$tempFile.out" -RedirectStandardError "$tempFile.err"
        
        # Wait for completion with timeout
        $timeoutMs = [int]$Timeout * 1000
        if (-not $process.WaitForExit($timeoutMs)) {
            $process.Kill()
            throw "Script execution timed out after $Timeout seconds"
        }
        
        # Read output
        $output = Get-Content "$tempFile.out" -Raw
        $error = Get-Content "$tempFile.err" -Raw
        
        if ($process.ExitCode -ne 0) {
            throw "Bun script failed with exit code $($process.ExitCode): $error"
        }
        
        return $output.Trim()
    } catch {
        Write-Warning "Bun script execution failed: $_"
        throw
    } finally {
        # Cleanup temporary files
        Remove-Item $tempFile -ErrorAction SilentlyContinue
        Remove-Item "$tempFile.out" -ErrorAction SilentlyContinue
        Remove-Item "$tempFile.err" -ErrorAction SilentlyContinue
    }
}

# === Transaction Pattern for Secrets ===
function Set-WikiSecretTransaction {
    param(
        [Parameter(Mandatory=$true)]
        [hashtable]$Secrets,
        
        [string]$Service = "com.factorywager.wiki"
    )
    
    $stored = @()
    $auditLog = @()
    
    try {
        foreach ($secret in $Secrets.GetEnumerator()) {
            $secretName = $secret.Key
            $secretValue = $secret.Value
            
            # Validate inputs
            if (-not (Test-SafeString -Input $secretName)) {
                throw "Invalid secret name: $secretName"
            }
            
            if (-not (Test-SafeString -Input $secretValue -Pattern '^[\w\-\./=+]+$')) {
                throw "Invalid secret value format for: $secretName"
            }
            
            if (-not (Test-SafeServiceName -ServiceName $Service)) {
                throw "Invalid service name: $Service"
            }
            
            # Attempt to store secret using direct function to avoid circular reference
            if (Set-WikiSecretDirect -Name $secretName -Value $secretValue -Service $Service) {
                $stored += $secretName
                $auditLog += @{
                    Timestamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss UTC')
                    Action = 'SET'
                    Service = $Service
                    Name = $secretName
                    Success = $true
                }
            } else {
                throw "Failed to store secret: $secretName"
            }
        }
        
        # Log successful transaction
        Write-AuditLog -Entries $auditLog
        return $true
        
    } catch {
        # Rollback on failure
        Write-Warning "Transaction failed, rolling back stored secrets..."
        foreach ($key in $stored) {
            try {
                Remove-WikiSecretDirect -Name $key -Service $Service | Out-Null
                $auditLog += @{
                    Timestamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss UTC')
                    Action = 'ROLLBACK'
                    Service = $Service
                    Name = $key
                    Success = $true
                }
            } catch {
                Write-Warning "Failed to rollback secret: $key"
            }
        }
        
        # Log failed transaction
        $auditLog += @{
            Timestamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss UTC')
            Action = 'TRANSACTION_FAILED'
            Service = $Service
            Error = $_.ToString()
            Success = $false
        }
        Write-AuditLog -Entries $auditLog
        throw
    }
}

# === Audit Logging ===
function Write-AuditLog {
    param(
        [Parameter(Mandatory=$true)]
        [array]$Entries
    )
    
    # Check if audit logging is enabled
    if (-not (Get-WikiConfig -Key 'AuditLogEnabled')) {
        return
    }
    
    $logFile = Join-Path $env:WIKI_ROOT "logs/wiki-secrets-audit.log"
    $logDir = Split-Path $logFile -Parent
    
    try {
        # Ensure log directory exists
        if (-not (Test-Path $logDir)) {
            New-Item -ItemType Directory -Path $logDir -Force -ErrorAction Stop | Out-Null
        }
        
        foreach ($entry in $Entries) {
            $logEntry = "[$($entry.Timestamp)] $($entry.Action): Service='$($entry.Service)', Name='$($entry.Name)'"
            if ($entry.Error) {
                $logEntry += ", Error='$($entry.Error)'"
            }
            $logEntry += ", Success=$($entry.Success)"
            
            Add-Content -Path $logFile -Value $logEntry -Encoding UTF8 -ErrorAction Stop
        }
    } catch {
        Write-Warning "Failed to write audit log: $_"
        # Don't re-throw as audit logging should not break the main functionality
    }
}

# === Bun-Powered Color Helper ===
function Get-BunColor {
    param(
        [Parameter(Mandatory=$true)]
        [string]$HexColor,
        
        [ValidateSet('ansi', 'rgb', 'hsl', 'hex')]
        [string]$Format = 'ansi',
        
        [switch]$Background
    )
    
    # Input validation
    if (-not (Test-SafeHexString -HexColor $HexColor)) {
        throw "Invalid hex color format: $HexColor. Expected format: #RRGGBB"
    }
    
    if ($HexColor -eq 'reset') {
        # Special case for reset color
        $script = "console.log(Bun.color('reset', 'ansi') || '');"
    } else {
        # Build secure script with proper escaping
        $bgParam = if ($Background) { ", 'background'" } else { "" }
        $script = "const color = Bun.color('$HexColor', '$Format'$bgParam); console.log(color || '');"
    }
    
    try {
        $result = Invoke-SecureBunScript -Script $script
        return $result
    } catch {
        Write-Warning "Failed to get Bun color for $HexColor: $_"
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
    
    # Validate inputs
    if (-not $Text) {
        throw "Text parameter cannot be empty"
    }
    
    if (-not (Test-SafeHexString -HexColor $HexColor)) {
        throw "Invalid hex color format: $HexColor"
    }
    
    try {
        $ansiColor = Get-BunColor -HexColor $HexColor -Format 'ansi' -Background:$Background
        $reset = Get-BunColor -HexColor 'reset' -Format 'ansi'
        
        if ($ansiColor -and $reset) {
            # Use Bun's ANSI color codes
            Write-Host ($ansiColor + $Text + $reset) -NoNewline
            Write-Host ""  # Add newline
        } else {
            # Fallback to PowerShell colors
            Write-BunColorFallback -Text $Text -HexColor $HexColor
        }
    } catch {
        Write-Warning "Failed to write Bun color, using fallback: $_"
        Write-BunColorFallback -Text $Text -HexColor $HexColor
    }
}

function Write-BunColorFallback {
    param(
        [string]$Text,
        [string]$HexColor
    )
    
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

# Enhanced theme functions with Bun.color support
function wiki-theme-enhanced {
    param(
        [ValidateSet('factorywager', 'dark', 'light', 'auto')]
        [string]$Theme = 'factorywager'
    )
    
    try {
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
        if (-not $selectedTheme) {
            throw "Unknown theme: $Theme"
        }
        
        # Atomically update environment variables
        $originalEnv = @{
            WIKI_COLOR_PRIMARY = $env:WIKI_COLOR_PRIMARY
            WIKI_COLOR_SUCCESS = $env:WIKI_COLOR_SUCCESS
            WIKI_COLOR_WARNING = $env:WIKI_COLOR_WARNING
            WIKI_COLOR_ERROR = $env:WIKI_COLOR_ERROR
            WIKI_COLOR_MUTED = $env:WIKI_COLOR_MUTED
            WIKI_COLOR_ACCENT = $env:WIKI_COLOR_ACCENT
        }
        
        try {
            # Store colors for Bun.color usage with validation
            $env:WIKI_COLOR_PRIMARY = $selectedTheme.primary ?? '#3b82f6'
            $env:WIKI_COLOR_SUCCESS = $selectedTheme.success ?? '#22c55e'
            $env:WIKI_COLOR_WARNING = $selectedTheme.warning ?? '#f59e0b'
            $env:WIKI_COLOR_ERROR = $selectedTheme.error ?? '#ef4444'
            $env:WIKI_COLOR_MUTED = $selectedTheme.muted ?? '#6b7280'
            $env:WIKI_COLOR_ACCENT = $selectedTheme.accent ?? '#06b6d4'
            
            Write-BunColor "🎨 Applied $Theme theme (using Bun.color HSL)" $selectedTheme.accent
        } catch {
            # Rollback on failure
            foreach ($key in $originalEnv.Keys) {
                if ($originalEnv[$key]) {
                    Set-Item -Path "env:$key" -Value $originalEnv[$key]
                } else {
                    Remove-Item -Path "env:$key" -ErrorAction SilentlyContinue
                }
            }
            throw
        }
    } catch {
        Write-Warning "Failed to apply theme $Theme`: $_"
        throw
    }
}

# === Bun Secrets Integration ===
# Direct Bun operations (non-transactional)
function Set-WikiSecretDirect {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Name,
        
        [Parameter(Mandatory=$true)]
        [string]$Value,
        
        [string]$Service = "com.factorywager.wiki"
    )
    
    # Check rate limiting
    if (-not (Test-RateLimit 'secret-operation')) {
        throw "Rate limit exceeded for secret operations"
    }
    
    # Input validation
    if (-not (Test-SafeString -Input $Name)) {
        throw "Invalid secret name: $Name"
    }
    
    if (-not (Test-SafeString -Input $Value -Pattern '^[\w\-\./=+]+$')) {
        throw "Invalid secret value format for: $Name"
    }
    
    if (-not (Test-SafeServiceName -ServiceName $Service)) {
        throw "Invalid service name: $Service"
    }
    
    $startTime = (Get-Date)
    
    try {
        Write-DebugLog -Message "Setting secret: $Name in service: $Service" -Component "SecretOperations"
        
        # Escape the value for JavaScript string literal
        $escapedValue = $Value -replace "'", "\'" -replace '`', '\`'
        $script = "await Bun.secrets.set({ service: '$Service', name: '$Name' }, '$escapedValue'); console.log('Secret stored successfully');"
        $result = Invoke-SecureBunScript -Script $script
        
        $executionTime = ((Get-Date) - $startTime).TotalMilliseconds
        Update-PerformanceMetrics -Operation 'secret-operation' -ExecutionTime $executionTime
        
        if ($result -eq "Secret stored successfully") {
            Write-DebugLog -Message "Secret stored successfully: $Name" -Component "SecretOperations"
            return $true
        } else {
            throw "Unexpected result: $result"
        }
    } catch {
        Write-Warning "Failed to store secret '$Name' in service '$Service': $_"
        Write-DebugLog -Message "Failed to store secret: $Name - Error: $_" -Component "SecretOperations"
        return $false
    }
}

function Remove-WikiSecretDirect {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Name,
        
        [string]$Service = "com.factorywager.wiki"
    )
    
    # Check rate limiting
    if (-not (Test-RateLimit 'secret-operation')) {
        throw "Rate limit exceeded for secret operations"
    }
    
    # Input validation
    if (-not (Test-SafeString -Input $Name)) {
        throw "Invalid secret name: $Name"
    }
    
    if (-not (Test-SafeServiceName -ServiceName $Service)) {
        throw "Invalid service name: $Service"
    }
    
    $startTime = (Get-Date)
    
    try {
        Write-DebugLog -Message "Deleting secret: $Name from service: $Service" -Component "SecretOperations"
        
        $script = "const deleted = await Bun.secrets.delete({ service: '$Service', name: '$Name' }); console.log(deleted ? 'Secret deleted' : 'Secret not found');"
        $result = Invoke-SecureBunScript -Script $script
        
        $executionTime = ((Get-Date) - $startTime).TotalMilliseconds
        Update-PerformanceMetrics -Operation 'secret-operation' -ExecutionTime $executionTime
        
        if ($result -eq "Secret deleted") {
            Write-DebugLog -Message "Secret deleted successfully: $Name" -Component "SecretOperations"
            return $true
        } else {
            Write-DebugLog -Message "Secret not found: $Name" -Component "SecretOperations"
            return $false
        }
    } catch {
        Write-Warning "Failed to delete secret '$Name' from service '$Service': $_"
        Write-DebugLog -Message "Failed to delete secret: $Name - Error: $_" -Component "SecretOperations"
        return $false
    }
}

# Secret rotation capabilities
function Rotate-WikiSecret {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Name,
        
        [string]$Service = "com.factorywager.wiki",
        
        [int]$Length = 32,
        
        [ValidateSet('alphanumeric', 'hex', 'base64')]
        [string]$Type = 'alphanumeric'
    )
    
    # Check rate limiting
    if (-not (Test-RateLimit 'secret-rotation')) {
        throw "Rate limit exceeded for secret rotation operations"
    }
    
    Write-DebugLog -Message "Starting secret rotation for: $Name" -Component "SecretRotation"
    
    try {
        # Get current secret
        $currentSecret = Get-WikiSecret -Name $Name -Service $Service
        
        # Generate new secret
        $newSecret = New-RandomSecret -Length $Length -Type $Type
        
        # Store the new secret
        if (Set-WikiSecretDirect -Name $Name -Value $newSecret -Service $Service) {
            # Log the rotation (without exposing the actual secrets)
            Write-AuditLog -Entries @(@{
                Timestamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss UTC')
                Action = 'ROTATE'
                Service = $Service
                Name = $Name
                Success = $true
            })
            
            Write-DebugLog -Message "Secret rotation completed successfully: $Name" -Component "SecretRotation"
            Write-Host "Secret '$Name' has been rotated successfully" -ForegroundColor Green
            
            return @{
                OldSecretLength = if ($currentSecret) { $currentSecret.Length } else { 0 }
                NewSecretLength = $newSecret.Length
                RotationTime = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss UTC')
            }
        } else {
            throw "Failed to store new secret during rotation"
        }
    } catch {
        Write-Warning "Failed to rotate secret '$Name': $_"
        Write-DebugLog -Message "Secret rotation failed: $Name - Error: $_" -Component "SecretRotation"
        
        # Log failed rotation attempt
        Write-AuditLog -Entries @(@{
            Timestamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss UTC')
            Action = 'ROTATE'
            Service = $Service
            Name = $Name
            Success = $false
            Error = $_.Exception.Message
        })
        
        throw
    }
}

function New-RandomSecret {
    param(
        [int]$Length = 32,
        
        [ValidateSet('alphanumeric', 'hex', 'base64')]
        [string]$Type = 'alphanumeric'
    )
    
    switch ($Type) {
        'alphanumeric' {
            $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
            $secret = -join (1..$Length | ForEach-Object { Get-Random -InputObject $chars.ToCharArray() })
        }
        'hex' {
            $secret = -join (1..($Length / 2) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
        }
        'base64' {
            $bytes = [System.Byte[]]::new($Length)
            [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
            $secret = [System.Convert]::ToBase64String($bytes)
        }
    }
    
    Write-DebugLog -Message "Generated new secret of type '$Type' with length $Length" -Component "SecretGeneration"
    return $secret
}

function Get-WikiSecretRotationHistory {
    param(
        [string]$Service = "com.factorywager.wiki",
        
        [int]$Days = 30
    )
    
    $logFile = Join-Path $env:WIKI_ROOT "logs/wiki-secrets-audit.log"
    
    if (-not (Test-Path $logFile)) {
        return @()
    }
    
    $cutoffDate = (Get-Date).AddDays(-$Days)
    $rotations = @()
    
    try {
        $logContent = Get-Content $logFile
        foreach ($line in $logContent) {
            if ($line -match '\[(.+?)\].*ROTATE.*Service=.+? Name=(.+?) Success=(true|false)') {
                $timestamp = [DateTime]::Parse($matches[1])
                if ($timestamp -ge $cutoffDate) {
                    $rotations += @{
                        Timestamp = $timestamp
                        SecretName = $matches[2]
                        Success = $matches[3] -eq 'true'
                    }
                }
            }
        }
    } catch {
        Write-Warning "Failed to read rotation history: $_"
    }
    
    return $rotations | Sort-Object Timestamp -Descending
}

# === Bun Secrets Integration ===
function Get-WikiSecret {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Name,
        
        [string]$Service = "com.factorywager.wiki"
    )
    
    # Input validation
    if (-not (Test-SafeString -Input $Name)) {
        throw "Invalid secret name: $Name"
    }
    
    if (-not (Test-SafeServiceName -ServiceName $Service)) {
        throw "Invalid service name: $Service"
    }
    
    try {
        $script = "const secret = await Bun.secrets.get({ service: '$Service', name: '$Name' }); console.log(secret || '');"
        $result = Invoke-SecureBunScript -Script $script
        return $result
    } catch {
        Write-Warning "Failed to retrieve secret '$Name' from service '$Service': $_"
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
    
    # Input validation
    if (-not (Test-SafeString -Input $Name)) {
        throw "Invalid secret name: $Name"
    }
    
    if (-not (Test-SafeString -Input $Value -Pattern '^[\w\-\./=+]+$')) {
        throw "Invalid secret value format for: $Name"
    }
    
    if (-not (Test-SafeServiceName -ServiceName $Service)) {
        throw "Invalid service name: $Service"
    }
    
    try {
        # Escape the value for JavaScript string literal
        $escapedValue = $Value -replace "'", "\'" -replace '`', '\`'
        $script = "await Bun.secrets.set({ service: '$Service', name: '$Name' }, '$escapedValue'); console.log('Secret stored successfully');"
        $result = Invoke-SecureBunScript -Script $script
        
        # Log the operation
        Write-AuditLog -Entries @(@{
            Timestamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss UTC')
            Action = 'SET'
            Service = $Service
            Name = $Name
            Success = $true
        })
        
        return $result -eq "Secret stored successfully"
    } catch {
        # Log failed operation
        Write-AuditLog -Entries @(@{
            Timestamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss UTC')
            Action = 'SET'
            Service = $Service
            Name = $Name
            Error = $_.ToString()
            Success = $false
        })
        
        Write-Warning "Failed to store secret '$Name' in service '$Service': $_"
        return $false
    }
}

function Remove-WikiSecret {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Name,
        
        [string]$Service = "com.factorywager.wiki"
    )
    
    # Input validation
    if (-not (Test-SafeString -Input $Name)) {
        throw "Invalid secret name: $Name"
    }
    
    if (-not (Test-SafeServiceName -ServiceName $Service)) {
        throw "Invalid service name: $Service"
    }
    
    try {
        $script = "const deleted = await Bun.secrets.delete({ service: '$Service', name: '$Name' }); console.log(deleted ? 'Secret deleted' : 'Secret not found');"
        $result = Invoke-SecureBunScript -Script $script
        
        $success = $result -eq "Secret deleted"
        
        # Log the operation
        Write-AuditLog -Entries @(@{
            Timestamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss UTC')
            Action = 'DELETE'
            Service = $Service
            Name = $Name
            Success = $success
        })
        
        return $success
    } catch {
        # Log failed operation
        Write-AuditLog -Entries @(@{
            Timestamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss UTC')
            Action = 'DELETE'
            Service = $Service
            Name = $Name
            Error = $_.ToString()
            Success = $false
        })
        
        Write-Warning "Failed to delete secret '$Name' from service '$Service': $_"
        return $false
    }
}

# Enhanced theme functions with Bun Secrets persistence
function wiki-theme-secure {
    param(
        [ValidateSet('factorywager', 'dark', 'light', 'auto')]
        [string]$Theme = 'factorywager'
    )
    
    try {
        # Store theme preference securely using Bun Secrets
        if (Set-WikiSecret -Name "selected-theme" -Value $Theme) {
            wiki-theme-enhanced $Theme
            Write-BunColor "🔐 Theme preference securely stored" $env:WIKI_COLOR_SUCCESS
        } else {
            throw "Failed to store theme preference securely"
        }
    } catch {
        Write-BunColor "❌ Failed to store theme preference: $_" $env:WIKI_COLOR_ERROR
        # Don't re-throw, just show error to user
    }
}

function wiki-theme-load {
    # Load theme preference from Bun Secrets
    try {
        $savedTheme = Get-WikiSecret -Name "selected-theme"
        
        if ($savedTheme -and $savedTheme -in @('factorywager', 'dark', 'light', 'auto')) {
            wiki-theme-enhanced $savedTheme
            Write-BunColor "🔓 Loaded saved theme: $savedTheme" $env:WIKI_COLOR_ACCENT
        } else {
            Write-BunColor "No valid saved theme found, using default" $env:WIKI_COLOR_WARNING
            wiki-theme-enhanced 'factorywager'
        }
    } catch {
        Write-BunColor "Failed to load theme preference, using default" $env:WIKI_COLOR_WARNING
        wiki-theme-enhanced 'factorywager'
    }
}

# Store user preferences securely
function wiki-preferences-set {
    param(
        [Parameter(Mandatory=$true)]
        [hashtable]$Preferences
    )
    
    if (-not $Preferences -or $Preferences.Count -eq 0) {
        throw "Preferences hashtable cannot be empty"
    }
    
    try {
        # Use transaction pattern for atomic preference storage
        $success = Set-WikiSecretTransaction -Secrets $Preferences
        
        if ($success) {
            Write-BunColor "✅ All preferences stored successfully" $env:WIKI_COLOR_SUCCESS
        } else {
            throw "Failed to store preferences transaction"
        }
    } catch {
        Write-BunColor "❌ Failed to store preferences: $_" $env:WIKI_COLOR_ERROR
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
    
    # Input validation
    if (-not (Test-SafeString -Input $Provider)) {
        throw "Invalid provider name: $Provider"
    }
    
    if (-not (Test-SafeString -Input $Username)) {
        throw "Invalid username format"
    }
    
    if (-not $ApiToken -or $ApiToken.Length -lt 10) {
        throw "Invalid API token format or length"
    }
    
    $service = "com.factorywager.wiki.providers"
    
    try {
        # Use transaction pattern for atomic credential storage
        $credentials = @{
            "$Provider-username" = $Username
            "$Provider-token" = $ApiToken
        }
        
        $success = Set-WikiSecretTransaction -Secrets $credentials -Service $service
        
        if ($success) {
            Write-BunColor "🔐 Credentials securely stored for $Provider" $env:WIKI_COLOR_SUCCESS
        } else {
            throw "Failed to store credentials for $Provider"
        }
    } catch {
        Write-BunColor "❌ Failed to store credentials for $Provider: $_" $env:WIKI_COLOR_ERROR
    }
}

function wiki-credentials-get {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Provider
    )
    
    # Input validation
    if (-not (Test-SafeString -Input $Provider)) {
        throw "Invalid provider name: $Provider"
    }
    
    $service = "com.factorywager.wiki.providers"
    
    try {
        $username = Get-WikiSecret -Service $service -Name "$Provider-username"
        $token = Get-WikiSecret -Service $service -Name "$Provider-token"
        
        if ($username -and $token) {
            Write-BunColor "🔓 Retrieved credentials for $Provider" $env:WIKI_COLOR_SUCCESS
            
            # Log credential access (without exposing sensitive data)
            Write-AuditLog -Entries @(@{
                Timestamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss UTC')
                Action = 'ACCESS'
                Service = $service
                Name = "$Provider-credentials"
                Success = $true
            })
            
            return @{
                Username = $username
                ApiToken = $token
            }
        } else {
            Write-BunColor "No complete credentials found for $Provider" $env:WIKI_COLOR_WARNING
            return $null
        }
    } catch {
        Write-BunColor "Failed to retrieve credentials for $Provider: $_" $env:WIKI_COLOR_ERROR
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


# === System Management Functions ===
function wiki-system-status {
    Write-Host "`n=== Wiki System Status ===" -ForegroundColor Cyan
    
    # Configuration status
    Write-Host "`n📋 Configuration:" -ForegroundColor Yellow
    $config = Get-WikiConfig
    Write-Host "  Script Timeout: $($config.ScriptTimeout)s"
    Write-Host "  Max Secret Length: $($config.MaxSecretLength)"
    Write-Host "  Max String Length: $($config.MaxStringLength)"
    Write-Host "  Log Level: $($config.LogLevel)"
    Write-Host "  Audit Logging: $(if ($config.AuditLogEnabled) { 'Enabled' } else { 'Disabled' })"
    Write-Host "  Performance Metrics: $(if ($config.PerformanceMetricsEnabled) { 'Enabled' } else { 'Disabled' })"
    Write-Host "  Debug Logging: $(if ($config.DebugLoggingEnabled) { 'Enabled' } else { 'Disabled' })"
    
    # Performance metrics
    if ($config.PerformanceMetricsEnabled) {
        Write-Host "`n📊 Performance Metrics:" -ForegroundColor Yellow
        $metrics = Get-PerformanceMetrics
        Write-Host "  Secret Operations: $($metrics.SecretOperations)"
        Write-Host "  Script Executions: $($metrics.ScriptExecutions)"
        Write-Host "  Cache Hits: $($metrics.CacheHits)"
        Write-Host "  Cache Misses: $($metrics.CacheMisses)"
        Write-Host "  Total Execution Time: $([math]::Round($metrics.TotalExecutionTime, 2))ms"
        Write-Host "  Cache Hit Ratio: $(if ($metrics.CacheHits + $metrics.CacheMisses -gt 0) { [math]::Round(($metrics.CacheHits / ($metrics.CacheHits + $metrics.CacheMisses)) * 100, 2) } else { 0 })%"
        Write-Host "  Last Reset: $($metrics.LastReset)"
    }
    
    # Rate limiting status
    Write-Host "`n🚦 Rate Limiting:" -ForegroundColor Yellow
    $rateLimitStatus = $script:RateLimitTracker
    $windowStart = $rateLimitStatus.WindowStart
    $requestCount = $rateLimitStatus.Requests.Count
    $maxRequests = $config.RateLimitMaxRequests
    Write-Host "  Current Window: Started at $windowStart"
    Write-Host "  Requests in Window: $requestCount / $maxRequests"
    Write-Host "  Window Size: $($config.RateLimitWindow) seconds"
    
    if ($requestCount -ge $maxRequests) {
        Write-Host "  Status: ⚠️ Rate Limit Active" -ForegroundColor Red
    } else {
        Write-Host "  Status: ✅ Available" -ForegroundColor Green
    }
    
    # Environment validation
    Write-Host "`n🔍 Environment Validation:" -ForegroundColor Yellow
    try {
        $wikiRootValid = Test-SafeString -Input $env:WIKI_ROOT
        Write-Host "  WIKI_ROOT: $(if ($wikiRootValid) { '✅ Valid' } else { '❌ Invalid' }) - $env:WIKI_ROOT"
    } catch {
        Write-Host "  WIKI_ROOT: ❌ Error - $_"
    }
    
    # Audit log status
    if ($config.AuditLogEnabled) {
        $logFile = Join-Path $env:WIKI_ROOT "logs/wiki-secrets-audit.log"
        if (Test-Path $logFile) {
            $logSize = (Get-Item $logFile).Length
            $logLines = (Get-Content $logFile | Measure-Object -Line).Lines
            Write-Host "  Audit Log: ✅ Exists - $logLines lines, $([math]::Round($logSize / 1KB, 2))KB"
        } else {
            Write-Host "  Audit Log: ⚠️ Not created yet"
        }
    }
    
    Write-Host ""
}

function wiki-config-set {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Key,
        
        [Parameter(Mandatory=$true)]
        $Value
    )
    
    try {
        Set-WikiConfig -Key $Key -Value $Value
        Write-Host "✅ Configuration updated: $Key = $Value" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to update configuration: $_" -ForegroundColor Red
    }
}

function wiki-config-get {
    param([string]$Key)
    
    try {
        if ($Key) {
            $value = Get-WikiConfig -Key $Key
            Write-Host "$Key`: $value"
        } else {
            $config = Get-WikiConfig
            Write-Host "Current Configuration:" -ForegroundColor Yellow
            foreach ($item in $config.GetEnumerator() | Sort-Object Key) {
                if (-not $item.Key.StartsWith('_')) {
                    Write-Host "  $($item.Key): $($item.Value)"
                }
            }
        }
    } catch {
        Write-Host "❌ Failed to get configuration: $_" -ForegroundColor Red
    }
}

function wiki-metrics-reset {
    try {
        Reset-PerformanceMetrics
        Write-Host "✅ Performance metrics reset" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to reset metrics: $_" -ForegroundColor Red
    }
}

function wiki-debug-enable {
    try {
        Set-WikiConfig -Key 'DebugLoggingEnabled' -Value $true
        Write-Host "✅ Debug logging enabled" -ForegroundColor Green
        Write-Host "Debug logs will be written to console and WIKI_DEBUG_LOG environment variable file" -ForegroundColor Yellow
    } catch {
        Write-Host "❌ Failed to enable debug logging: $_" -ForegroundColor Red
    }
}

function wiki-debug-disable {
    try {
        Set-WikiConfig -Key 'DebugLoggingEnabled' -Value $false
        Write-Host "✅ Debug logging disabled" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to disable debug logging: $_" -ForegroundColor Red
    }
}

function wiki-secret-rotate {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Name,
        
        [string]$Service = "com.factorywager.wiki",
        
        [int]$Length = 32,
        
        [ValidateSet('alphanumeric', 'hex', 'base64')]
        [string]$Type = 'alphanumeric'
    )
    
    try {
        $result = Rotate-WikiSecret -Name $Name -Service $Service -Length $Length -Type $Type
        Write-Host "🔄 Secret rotation completed:" -ForegroundColor Green
        Write-Host "  Secret: $Name"
        Write-Host "  Old Length: $($result.OldSecretLength) characters"
        Write-Host "  New Length: $($result.NewSecretLength) characters"
        Write-Host "  Rotation Time: $($result.RotationTime)"
    } catch {
        Write-Host "❌ Failed to rotate secret: $_" -ForegroundColor Red
    }
}

function wiki-secret-history {
    param(
        [string]$Service = "com.factorywager.wiki",
        
        [int]$Days = 30
    )
    
    try {
        $history = Get-WikiSecretRotationHistory -Service $Service -Days $Days
        
        if ($history.Count -gt 0) {
            Write-Host "📜 Secret Rotation History (Last $Days days):" -ForegroundColor Yellow
            foreach ($entry in $history) {
                $status = if ($entry.Success) { "✅ Success" } else { "❌ Failed" }
                Write-Host "  $($entry.Timestamp.ToString('yyyy-MM-dd HH:mm:ss')) - $($entry.SecretName) - $status"
            }
        } else {
            Write-Host "📜 No rotation history found for the last $Days days" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Failed to get rotation history: $_" -ForegroundColor Red
    }
}

# === Enhanced Welcome Message ===
# Load configuration from file on startup
Load-WikiConfigFromFile | Out-Null

# === Welcome Message ===
if ($args[0] -ne "--silent") {
    Write-Host "Wiki Template System Shortcuts Loaded" -ForegroundColor Green
    Write-Host "Project Root: $env:WIKI_ROOT" -ForegroundColor Cyan
    Write-Host ""
    
    # Show system status if debug logging is enabled
    if ((Get-WikiConfig -Key 'DebugLoggingEnabled')) {
        Write-Host "🐛 Debug mode enabled" -ForegroundColor Yellow
        Write-DebugLog -Message "Wiki shortcuts loaded successfully" -Component "SystemStartup"
    }
    
    # Show quick help
    Write-Host "Quick Commands:" -ForegroundColor White
    Write-Host "  wiki-system-status    Show system status and metrics"
    Write-Host "  wiki-config-get       View configuration"
    Write-Host "  wiki-config-set       Set configuration values"
    Write-Host "  wiki-debug-enable     Enable debug logging"
    Write-Host "  wiki-secret-rotate    Rotate a secret"
    Write-Host "  wiki-help             Show all available commands"
    Write-Host ""
}

# Export functions if needed (for modules)
Export-ModuleMember -Function *
