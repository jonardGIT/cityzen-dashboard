$ErrorActionPreference = 'Continue'

$base = 'http://192.168.0.131:3000/api/v1'
$frontendBase = 'http://localhost:3001/api'
$apiKey = 'local-dev-key'

$accounts = @(
  @{ role = 'SUPER_ADMIN'; email = 'admin@xypes.local'; password = 'Password123!' },
  @{ role = 'ADMIN'; email = 'ops.lead@xypes.local'; password = 'Password123!' },
  @{ role = 'DISPATCHER'; email = 'dispatcher@xypes.local'; password = 'Password123!' },
  @{ role = 'RESPONDER'; email = 'supervisor@xypes.local'; password = 'Password123!' },
  @{ role = 'VIEWER'; email = 'analyst@xypes.local'; password = 'Password123!' }
)

$expected = @{
  SUPER_ADMIN = @{ usersList = 200; usersCreate = 201; incidentsCreate = 201; incidentsReport = @(403); assignmentsCreate = 201 }
  ADMIN       = @{ usersList = 200; usersCreate = 201; incidentsCreate = 201; incidentsReport = @(403); assignmentsCreate = 201 }
  DISPATCHER  = @{ usersList = 403; usersCreate = 403; incidentsCreate = 201; incidentsReport = @(403); assignmentsCreate = 201 }
  RESPONDER   = @{ usersList = 403; usersCreate = 403; incidentsCreate = 201; incidentsReport = @(403); assignmentsCreate = 403 }
  VIEWER      = @{ usersList = 403; usersCreate = 403; incidentsCreate = 403; incidentsReport = @(201,422); assignmentsCreate = 403 }
}

function New-Headers([string]$token, [bool]$json = $false) {
  $h = @{'x-api-key' = $apiKey}
  if ($token) { $h['Authorization'] = "Bearer $token" }
  if ($json) { $h['Content-Type'] = 'application/json' }
  return $h
}

function Get-Token([string]$email, [string]$password) {
  $body = @{ email = $email; password = $password } | ConvertTo-Json
  $resp = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Headers (New-Headers '' $true) -Body $body -TimeoutSec 20
  if ($resp.accessToken) { return $resp.accessToken }
  if ($resp.token) { return $resp.token }
  return ''
}

function Invoke-Status([string]$method, [string]$path, [hashtable]$headers, [string]$body = '') {
  try {
    if ($body) {
      $r = Invoke-WebRequest -Uri "$base$path" -Method $method -Headers $headers -Body $body -TimeoutSec 20 -UseBasicParsing
    } else {
      $r = Invoke-WebRequest -Uri "$base$path" -Method $method -Headers $headers -TimeoutSec 20 -UseBasicParsing
    }
    return [int]$r.StatusCode
  } catch {
    if ($_.Exception.Response) {
      return [int]$_.Exception.Response.StatusCode
    }
    return 0
  }
}

function Assert-Status([string]$role, [string]$name, [int]$actual, [int]$expectedStatus) {
  if ($actual -eq $expectedStatus) {
    Write-Output ("PASS role={0} test={1} status={2}" -f $role, $name, $actual)
  } else {
    Write-Output ("FAIL role={0} test={1} status={2} expected={3}" -f $role, $name, $actual, $expectedStatus)
  }
}

function Assert-StatusAny([string]$role, [string]$name, [int]$actual, [int[]]$expectedStatuses) {
  if ($expectedStatuses -contains $actual) {
    Write-Output ("PASS role={0} test={1} status={2}" -f $role, $name, $actual)
  } else {
    $expectedText = ($expectedStatuses -join ',')
    Write-Output ("FAIL role={0} test={1} status={2} expectedAny={3}" -f $role, $name, $actual, $expectedText)
  }
}

# Shared payloads with low-collision names
$stamp = [int][double]::Parse((Get-Date -UFormat %s))

foreach ($acct in $accounts) {
  $role = $acct.role
  Write-Output ("---- TEST ROLE {0} ({1}) ----" -f $role, $acct.email)

  $token = ''
  try {
    $token = Get-Token $acct.email $acct.password
  } catch {
    Write-Output ("FAIL role={0} test=login status=0 msg={1}" -f $role, $_.Exception.Message)
    continue
  }

  if (-not $token) {
    Write-Output ("FAIL role={0} test=login status=200 token=missing" -f $role)
    continue
  }

  Write-Output ("PASS role={0} test=login status=200" -f $role)

  $h = New-Headers $token $false
  $hJson = New-Headers $token $true

  # 1) Users list
  $usersListStatus = Invoke-Status 'GET' '/users' $h
  Assert-Status $role 'users_list' $usersListStatus $expected[$role].usersList

  # 2) Users create
  $userPayload = @{
    name = "QA $role $stamp"
    email = "qa.$($role.ToLower()).$stamp@xypes.local"
    password = 'Password123!'
    role = 'VIEWER'
  } | ConvertTo-Json
  $usersCreateStatus = Invoke-Status 'POST' '/users' $hJson $userPayload
  Assert-Status $role 'users_create' $usersCreateStatus $expected[$role].usersCreate

  # 3) Incidents create
  $incidentPayload = @{
    description = "QA incident $role $stamp"
    mediaUrl = ''
    statusId = 1
    locationId = 1
    categoryId = 1
    severityId = 1
    citizenId = 1
  } | ConvertTo-Json
  $incidentsCreateStatus = Invoke-Status 'POST' '/incidents' $hJson $incidentPayload
  Assert-Status $role 'incidents_create' $incidentsCreateStatus $expected[$role].incidentsCreate

  # 4) Incidents report (viewer self-report path)
  $reportPayload = @{
    description = "QA report $role $stamp"
    mediaUrl = ''
    dateReported = (Get-Date).ToString('s')
    statusId = 1
    locationId = 1
    categoryId = 1
    severityId = 1
  } | ConvertTo-Json

  if ($role -eq 'VIEWER') {
    $linkPayload = @{
      name = "QA Viewer $stamp"
      preferredChannel = 'SMS'
    } | ConvertTo-Json
    $linkStatus = Invoke-Status 'POST' '/citizens/link-me' $hJson $linkPayload
    Write-Output ("INFO role={0} test=citizens_link_me status={1}" -f $role, $linkStatus)
  }

  $incidentsReportStatus = Invoke-Status 'POST' '/incidents/report' $hJson $reportPayload
  Assert-StatusAny $role 'incidents_report' $incidentsReportStatus $expected[$role].incidentsReport

  # 5) Assignments create
  $assignmentPayload = @{
    incidentId = 1
    responderId = 1
    statusId = 1
    notes = "QA assignment $role $stamp"
  } | ConvertTo-Json
  $assignmentsCreateStatus = Invoke-Status 'POST' '/assignments' $hJson $assignmentPayload
  Assert-Status $role 'assignments_create' $assignmentsCreateStatus $expected[$role].assignmentsCreate

  # 6) Users capabilities endpoint
  $capsBackendStatus = Invoke-Status 'GET' '/users/capabilities' $h
  Write-Output ("INFO role={0} test=users_capabilities_backend status={1}" -f $role, $capsBackendStatus)

  try {
    $frontendHeaders = @{
      'Authorization' = "Bearer $token"
      'x-api-key' = $apiKey
    }
    $proxyResp = Invoke-WebRequest -Uri "$frontendBase/users/capabilities" -Method GET -Headers $frontendHeaders -TimeoutSec 20 -UseBasicParsing
    Write-Output ("INFO role={0} test=users_capabilities_proxy status={1}" -f $role, [int]$proxyResp.StatusCode)
  } catch {
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
      Write-Output ("INFO role={0} test=users_capabilities_proxy status={1}" -f $role, $status)
    } else {
      Write-Output ("INFO role={0} test=users_capabilities_proxy status=0 msg=frontend_unreachable" -f $role)
    }
  }

  Write-Output ''
}

Write-Output 'Role capability checks complete.'
