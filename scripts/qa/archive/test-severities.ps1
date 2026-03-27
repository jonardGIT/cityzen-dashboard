#!/usr/bin/env pwsh
# Test severities API response

$base = 'http://192.168.0.131:3000/api/v1'
$apiKey = 'local-dev-key'

# Login first
Write-Host "Logging in as admin@xypes.local..." -ForegroundColor Cyan
$loginBody = (@{email = 'admin@xypes.local'; password = 'Password123!' } | ConvertTo-Json)
try {
    $login = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Headers @{'x-api-key' = $apiKey; 'Content-Type' = 'application/json'} -Body $loginBody -TimeoutSec 20
    $token = $login.accessToken
    Write-Host "Login successful. Token: $($token.Substring(0, 20))..." -ForegroundColor Green
}
catch {
    Write-Host "Login failed: $_" -ForegroundColor Red
    exit 1
}

# Test GET /severities
Write-Host "`nTesting GET /severities..." -ForegroundColor Cyan
try {
    $severities = Invoke-RestMethod -Uri "$base/severities" -Method GET -Headers @{'x-api-key' = $apiKey; 'Authorization' = "Bearer $token"} -TimeoutSec 20
    Write-Host "Severities API Response:" -ForegroundColor Green
    Write-Host ($severities | ConvertTo-Json -Depth 10)
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
    if ($_.Response) {
        Write-Host "Response Status: $($_.Response.StatusCode)" -ForegroundColor Red
        Write-Host "Response Body: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}
