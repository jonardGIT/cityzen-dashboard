$ErrorActionPreference='Continue'
$base='http://192.168.0.131:3000/api/v1'
$apiKey='local-dev-key'

function NewHeaders([string]$token){
  $h=@{'x-api-key'=$apiKey;'Content-Type'='application/json'}
  if($token){$h['Authorization']="Bearer $token"}
  return $h
}

function LoginToken([string]$email,[string]$password){
  try{
    $body=(@{email=$email;password=$password}|ConvertTo-Json)
    $resp=Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Headers (NewHeaders '') -Body $body -TimeoutSec 20
    if($resp.accessToken){return $resp.accessToken}
    if($resp.token){return $resp.token}
    return $null
  } catch {
    return $null
  }
}

$viewerToken=LoginToken 'analyst@xypes.local' 'Password123!'
$adminToken=LoginToken 'admin@xypes.local' 'Password123!'

$payload=@{
  description='Endpoint re-test from terminal'
  mediaUrl=''
  dateReported=(Get-Date).ToString('s')
  statusId='1'
  locationId='1'
  categoryId='1'
  severityId='1'
}|ConvertTo-Json

if($viewerToken){
  try{
    $resp=Invoke-WebRequest -Uri "$base/incidents/report" -Method POST -Headers (NewHeaders $viewerToken) -Body $payload -TimeoutSec 20 -UseBasicParsing
    "viewer_report PASS status=$($resp.StatusCode)"
    if($resp.Content){"viewer_body=$($resp.Content)"}
  } catch {
    $code=0
    $body=''
    if($_.Exception.Response){
      $r=$_.Exception.Response
      $code=[int]$r.StatusCode
      try{$sr=New-Object IO.StreamReader($r.GetResponseStream());$body=$sr.ReadToEnd()}catch{}
    }
    "viewer_report FAIL status=$code"
    "viewer_body=$body"
  }
} else {
  'viewer_login FAIL'
}

if($adminToken){
  try{
    $resp=Invoke-WebRequest -Uri "$base/incidents/report" -Method POST -Headers (NewHeaders $adminToken) -Body $payload -TimeoutSec 20 -UseBasicParsing
    "admin_report PASS status=$($resp.StatusCode)"
    if($resp.Content){"admin_body=$($resp.Content)"}
  } catch {
    $code=0
    $body=''
    if($_.Exception.Response){
      $r=$_.Exception.Response
      $code=[int]$r.StatusCode
      try{$sr=New-Object IO.StreamReader($r.GetResponseStream());$body=$sr.ReadToEnd()}catch{}
    }
    "admin_report FAIL status=$code"
    "admin_body=$body"
  }
} else {
  'admin_login FAIL'
}
