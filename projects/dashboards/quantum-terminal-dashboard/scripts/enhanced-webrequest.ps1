# Enhanced PowerShell WebRequest with Headers, ETag, and DNS Cache
# Target: https://staging.example.com:5000/

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$session.UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"

# DNS Cache Configuration
# Clear DNS cache before request to ensure fresh resolution
Clear-DnsClientCache

# Set DNS cache timeout (Windows registry)
# HKLM:\System\CurrentControlSet\Services\Dnscache\Parameters\MaxCacheTtl = 86400 (1 day)
# HKLM:\System\CurrentControlSet\Services\Dnscache\Parameters\MaxNegativeCacheTtl = 300 (5 min)

# Enhanced Headers with security, performance, and caching directives
$headers = @{
    "Upgrade-Insecure-Requests" = "1"
    "sec-ch-ua" = '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"'
    "sec-ch-ua-mobile" = "?0"
    "sec-ch-ua-platform" = '"macOS"'
    
    # Enhanced Security Headers
    "sec-fetch-dest" = "document"
    "sec-fetch-mode" = "navigate"
    "sec-fetch-site" = "none"
    
    # Cross-Origin Policies
    "Cross-Origin-Embedder-Policy" = "require-corp"
    "Cross-Origin-Opener-Policy" = "same-origin"
    "Cross-Origin-Resource-Policy" = "cross-origin"
    
    # Referrer Policy
    "Referrer-Policy" = "strict-origin-when-cross-origin"
    
    # Accept Headers for content negotiation
    "Accept" = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
    "Accept-Language" = "en-US,en;q=0.9"
    "Accept-Encoding" = "gzip, deflate, br"
    
    # Caching Headers (If-None-Match for ETag support)
    "Cache-Control" = "no-cache, no-store, must-revalidate"
    "Pragma" = "no-cache"
    "Expires" = "0"
    
    # Performance & Privacy
    "DNT" = "1"
    "X-Requested-With" = "XMLHttpRequest"
}

# ETag Cache Dictionary (in-memory cache for ETags)
$script:ETagCache = @{}

function Get-CachedETag {
    param([string]$Uri)
    if ($ETagCache.ContainsKey($Uri)) {
        return $ETagCache[$Uri]
    }
    return $null
}

function Set-CachedETag {
    param([string]$Uri, [string]$ETag)
    $ETagCache[$Uri] = $ETag
}

# Function to make enhanced web request with ETag support
function Invoke-EnhancedWebRequest {
    param(
        [string]$Uri,
        [Microsoft.PowerShell.Commands.WebRequestSession]$Session,
        [hashtable]$Headers,
        [string]$ETag = $null
    )
    
    # Add If-None-Match header if we have a cached ETag
    if ($ETag) {
        $Headers["If-None-Match"] = $ETag
    }
    
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Uri `
            -WebSession $Session `
            -Headers $Headers
        
        # Check for 304 Not Modified
        if ($response.StatusCode -eq 304) {
            Write-Host "304 Not Modified - Using cached response"
            return $null
        }
        
        # Extract and cache ETag from response
        $responseETag = $response.Headers["ETag"]
        if ($responseETag) {
            Set-CachedETag -Uri $Uri -ETag $responseETag
            Write-Host "Cached ETag: $responseETag"
        }
        
        return $response
    }
    catch [Microsoft.PowerShell.Commands.HttpResponseException] {
        if ($_.Exception.Response.StatusCode -eq "NotModified") {
            Write-Host "304 Not Modified - Using cached response"
            return $null
        }
        throw
    }
}

# Alternative: Using HttpClient with more control (PowerShell 7+)
function Invoke-EnhancedWebRequestHttpClient {
    param([string]$Uri)
    
    $handler = New-Object System.Net.Http.HttpClientHandler
    $handler.UseCookies = $true
    $handler.CookieContainer = New-Object System.Net.CookieContainer
    
    $client = New-Object System.Net.Http.HttpClient($handler)
    $client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36")
    
    # Add all headers
    foreach ($header in $headers.GetEnumerator()) {
        if ($header.Key -notin @("Upgrade-Insecure-Requests", "sec-ch-ua", "sec-ch-ua-mobile", "sec-ch-ua-platform")) {
            try {
                $client.DefaultRequestHeaders.Add($header.Key, $header.Value)
            } catch {
                # Some headers may throw, skip them
            }
        }
    }
    
    # Check for cached ETag
    $cachedETag = Get-CachedETag -Uri $Uri
    if ($cachedETag) {
        $client.DefaultRequestHeaders.IfNoneMatch.Add($cachedETag)
    }
    
    try {
        $response = $client.GetAsync($Uri).Result
        
        if ($response.StatusCode -eq [System.Net.HttpStatusCode]::NotModified) {
            Write-Host "304 Not Modified - Using cached response"
            return $null
        }
        
        # Cache new ETag
        if ($response.Headers.ETag) {
            Set-CachedETag -Uri $Uri -ETag $response.Headers.ETag.Tag
        }
        
        return $response
    }
    finally {
        $client.Dispose()
    }
}

# DNS Cache Management Functions
function Clear-DnsCache {
    Clear-DnsClientCache
    Write-Host "DNS cache cleared"
}

function Get-DnsCacheEntry {
    param([string]$Hostname)
    # PowerShell doesn't provide direct DNS cache access
    # Use 'ipconfig /displaydns' as workaround
    $output = ipconfig /displaydns | Out-String
    if ($output -match $Hostname) {
        Write-Host "DNS cache entry found for $Hostname"
    }
    else {
        Write-Host "No DNS cache entry for $Hostname"
    }
}

# Execute the enhanced request
Write-Host "Making enhanced request to: https://staging.example.com:5000/"
Write-Host "DNS Cache: Cleared before request"

# Option 1: Invoke-WebRequest with ETag support
$response = Invoke-EnhancedWebRequest `
    -Uri "https://staging.example.com:5000/" `
    -Session $session `
    -Headers $headers `
    -ETag (Get-CachedETag -Uri "https://staging.example.com:5000/")

if ($response) {
    Write-Host "Response Status: $($response.StatusCode)"
    Write-Host "Response Length: $($response.Content.Length) bytes"
    if ($response.Headers["ETag"]) {
        Write-Host "ETag: $($response.Headers["ETag"])"
    }
}