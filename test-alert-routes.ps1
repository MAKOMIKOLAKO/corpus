# Alert API Routes Verification Script (PowerShell)

Write-Host "`n🚀 Starting Alert API Routes Verification`n" -ForegroundColor Yellow

# Test configuration
$BaseUrl = $env:BASE_URL ?? "http://localhost:3000"
$CronSecret = $env:CRON_SECRET ?? "F=|+OH&(?Jt#{p=]>w?Bq8Vd_!^Q%y1^"
$SessionToken = $env:SESSION_TOKEN ?? $null

# Test function
function Test-Route {
    param(
        [string]$Method,
        [string]$Path,
        [string]$Body = $null,
        [hashtable]$Headers = @{}
    )
    
    $url = "$BaseUrl$Path"
    $headers = @{
        'Content-Type' = 'application/json'
    } + $Headers
    
    try {
        if ($Body) {
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -Body $Body -ErrorAction Stop
            return @{ Status = 200; Data = $response; Success = $true }
        } else {
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -ErrorAction Stop
            return @{ Status = 200; Data = $response; Success = $true }
        }
    } catch {
        return @{ Status = $_.Exception.Response.StatusCode.value__; Data = $_.ErrorDetails.Message; Success = $false; Error = $_.Exception.Message }
    }
}

# Test 1: GET /api/alert-containers (unauthenticated)
Write-Host "→ Testing GET /api/alert-containers without authentication..." -ForegroundColor Cyan
$result1 = Test-Route -Method "GET" -Path "/api/alert-containers"
if ($result1.Status -eq 401) {
    Write-Host "✓ Correctly returns 401 for unauthenticated request" -ForegroundColor Green
} else {
    Write-Host "✗ Expected 401, got $($result1.Status)" -ForegroundColor Red
}

# Test 2: POST /api/cron/smart-alerts (without secret)
Write-Host "→ Testing POST /api/cron/smart-alerts without CRON_SECRET..." -ForegroundColor Cyan
$result2 = Test-Route -Method "POST" -Path "/api/cron/smart-alerts"
if ($result2.Status -eq 401) {
    Write-Host "✓ Correctly returns 401 without CRON_SECRET" -ForegroundColor Green
} else {
    Write-Host "✗ Expected 401, got $($result2.Status)" -ForegroundColor Red
}

# Test 3: POST /api/cron/smart-alerts (with secret)
Write-Host "→ Testing POST /api/cron/smart-alerts with CRON_SECRET..." -ForegroundColor Cyan
$result3 = Test-Route -Method "POST" -Path "/api/cron/smart-alerts" -Headers @{ Authorization = "Bearer $CronSecret" }
if ($result3.Success) {
    Write-Host "✓ Cron job executed successfully" -ForegroundColor Green
    Write-Host "  Processed: $($result3.Data.processed), Papers added: $($result3.Data.papersAdded)" -ForegroundColor Gray
} else {
    Write-Host "✗ Failed with status $($result3.Status): $($result3.Data)" -ForegroundColor Red
}

# Test 4: Environment variables check
Write-Host "`n→ Checking environment variables..." -ForegroundColor Cyan
$requiredVars = @(
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'CRON_SECRET',
    'SEMANTIC_SCHOLAR_API_KEY',
    'GOOGLE_AI_API_KEY'
)

foreach ($var in $requiredVars) {
    $value = [System.Environment]::GetEnvironmentVariable($var)
    if ($value) {
        Write-Host "✓ $var is set" -ForegroundColor Green
    } else {
        Write-Host "✗ $var is missing" -ForegroundColor Red
    }
}

Write-Host "`n✅ Alert API Routes Verification Complete!`n" -ForegroundColor Green
