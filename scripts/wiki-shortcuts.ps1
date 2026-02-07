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

# === Configuration Management ===
$script:WikiConfig = @{
    ScriptTimeout = 30
    MaxSecretLength = 2048
    MaxStringLength = 256
    LogLevel = 'Info'
    AuditLogEnabled = $true
}

function Get-WikiConfig {
    param([string]$Key)
    
    if ($Key) {
        return $script:WikiConfig[$Key]
    }
    
    return $script:WikiConfig.Clone()
}

function Set-WikiConfig {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Key,
        
        [Parameter(Mandatory=$true)]
        $Value
    )
    
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
        default {
            throw "Unknown configuration key: $Key"
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
        
        return $result -eq "Secret stored successfully"
    } catch {
        Write-Warning "Failed to store secret '$Name' in service '$Service': $_"
        return $false
    }
}

function Remove-WikiSecretDirect {
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
        
        return $result -eq "Secret deleted"
    } catch {
        Write-Warning "Failed to delete secret '$Name' from service '$Service': $_"
        return $false
    }
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


# === Welcome Message ===
if ($args[0] -ne "--silent") {
    Write-Host "Wiki Template System shortcuts ready!" -ForegroundColor Green
    Write-Host "Type 'wiki-help' for available commands" -ForegroundColor Cyan
    Write-Host ""
}

# Export functions if needed (for modules)
Export-ModuleMember -Function *
