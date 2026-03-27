#!/usr/bin/env pwsh
# Diagnose agencies endpoint issues

$base = 'http://192.168.0.131:3000/api/v1'
$apiKey = 'local-dev-key'

function New-Headers([string]$token, [bool]$json = $false) {
    $h = @{'x-api-key' = $apiKey }
    if ($json) { $h['Content-Type'] = 'application/json' }
    if ($token) { $h['Authorization'] = "Bearer $token" }
    return $h
}

# Login first
Write-Host "Logging in as admin@xypes.local..." -ForegroundColor Cyan
$loginBody = (@{email = 'admin@xypes.local'; password = 'Password123!' } | ConvertTo-Json)
try {
    $login = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Headers (New-Headers '' $true) -Body $loginBody -TimeoutSec 20
    $token = $login.accessToken
    Write-Host "Login successful. Token: $($token.Substring(0, 20))..." -ForegroundColor Green
}
catch {
    Write-Host "Login failed: $_" -ForegroundColor Red
    exit 1
}

# Test GET /agencies without auth
Write-Host "`nTesting GET /agencies (no auth)..." -ForegroundColor Cyan
try {
    $agencies = Invoke-RestMethod -Uri "$base/agencies" -Method GET -Headers (New-Headers '' $false) -TimeoutSec 20
    Write-Host "Success (no auth). Response type: $($agencies.GetType().Name)" -ForegroundColor Green
    if ($agencies -is [array]) {
        Write-Host "  Count: $($agencies.Count)"
        if ($agencies.Count -gt 0) {
            Write-Host "  First item: $(($agencies[0] | ConvertTo-Json -Compress))" -ForegroundColor Gray
        }
    }
    elseif ($agencies -is [hashtable]) {
        Write-Host "  Keys: $($agencies.Keys -join ', ')" -ForegroundColor Gray
    }
}
catch {
    $response = $_.Exception.Response
    if ($response) {
        $status = [int]$response.StatusCode
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        $raw = $reader.ReadToEnd()
        Write-Host "ERROR (Status $status): $raw" -ForegroundColor Red
    }
    else {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test GET /agencies with auth token
Write-Host "`nTesting GET /agencies (with auth token)..." -ForegroundColor Cyan
try {
    $agencies = Invoke-RestMethod -Uri "$base/agencies" -Method GET -Headers (New-Headers $token $false) -TimeoutSec 20
    Write-Host "Success (with auth). Response type: $($agencies.GetType().Name)" -ForegroundColor Green
    if ($agencies -is [array]) {
        Write-Host "  Count: $($agencies.Count)"
        if ($agencies.Count -gt 0) {
            Write-Host "  First item fields: $($agencies[0].PSObject.Properties.Name -join ', ')" -ForegroundColor Gray
        }
    }
}
catch {
    $response = $_.Exception.Response
    if ($response) {
        $status = [int]$response.StatusCode
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        $raw = $reader.ReadToEnd()
        Write-Host "ERROR (Status $status): $raw" -ForegroundColor Red
    }
    else {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nDiagnostic complete." -ForegroundColor Cyan
