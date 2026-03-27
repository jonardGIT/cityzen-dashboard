$ErrorActionPreference='Continue'
$base='http://192.168.0.131:3000/api/v1'
$apiKey='local-dev-key'

function New-Headers([string]$token,[bool]$json){
  $h=@{}
  $h['x-api-key']=$apiKey
  if($token){$h['Authorization']="Bearer $token"}
  if($json){$h['Content-Type']='application/json'}
  return $h
}

function Test-Req([string]$name,[string]$method,[string]$url,[hashtable]$headers,[string]$body){
  try{
    if($body){$r=Invoke-WebRequest -Uri $url -Method $method -Headers $headers -Body $body -TimeoutSec 20 -UseBasicParsing}
    else{$r=Invoke-WebRequest -Uri $url -Method $method -Headers $headers -TimeoutSec 20 -UseBasicParsing}
    Write-Output ("PASS {0} status={1}" -f $name,$r.StatusCode)
  } catch {
    $code=0
    if($_.Exception.Response){$code=[int]$_.Exception.Response.StatusCode}
    Write-Output ("FAIL {0} status={1} msg={2}" -f $name,$code,$_.Exception.Message)
  }
}

$h=New-Headers '' $false
Test-Req 'health' 'GET' "$base/health" $h ''
Test-Req 'openapi' 'GET' "$base/openapi.json" $h ''
Test-Req 'docs' 'GET' "$base/docs" $h ''
Test-Req 'citizens_list_public' 'GET' "$base/citizens" $h ''
Test-Req 'assignments_list_public' 'GET' "$base/assignments" $h ''

$adminToken=''
try{
  $body=(@{email='admin@xypes.local';password='Password123!'}|ConvertTo-Json)
  $resp=Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Headers (New-Headers '' $true) -Body $body -TimeoutSec 20
  if($resp.accessToken){$adminToken=$resp.accessToken}elseif($resp.token){$adminToken=$resp.token}
  if($adminToken){Write-Output 'PASS login_admin status=200 token=received'} else {Write-Output 'FAIL login_admin status=200 token=missing'}
}catch{
  $code=0
  if($_.Exception.Response){$code=[int]$_.Exception.Response.StatusCode}
  Write-Output ("FAIL login_admin status={0} msg={1}" -f $code,$_.Exception.Message)
}

$viewerToken=''
try{
  $body=(@{email='analyst@xypes.local';password='Password123!'}|ConvertTo-Json)
  $resp=Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Headers (New-Headers '' $true) -Body $body -TimeoutSec 20
  if($resp.accessToken){$viewerToken=$resp.accessToken}elseif($resp.token){$viewerToken=$resp.token}
  if($viewerToken){Write-Output 'PASS login_viewer status=200 token=received'} else {Write-Output 'FAIL login_viewer status=200 token=missing'}
}catch{
  $code=0
  if($_.Exception.Response){$code=[int]$_.Exception.Response.StatusCode}
  Write-Output ("FAIL login_viewer status={0} msg={1}" -f $code,$_.Exception.Message)
}

if($adminToken){
  $ha=New-Headers $adminToken $false
  Test-Req 'auth_me_admin' 'GET' "$base/auth/me" $ha ''
  Test-Req 'users_list_admin' 'GET' "$base/users" $ha ''
  Test-Req 'incidents_list_admin' 'GET' "$base/incidents" $ha ''
}

if($viewerToken){
  $hv=New-Headers $viewerToken $false
  Test-Req 'auth_me_viewer' 'GET' "$base/auth/me" $hv ''
  Test-Req 'incidents_list_viewer' 'GET' "$base/incidents" $hv ''
  $linkBody=(@{name='QA Viewer';preferredChannel='SMS'}|ConvertTo-Json)
  Test-Req 'citizens_link_me_viewer' 'POST' "$base/citizens/link-me" (New-Headers $viewerToken $true) $linkBody
  $reportBody=(@{description='QA report from dashboard test';mediaUrl='';dateReported=(Get-Date).ToString('s');statusId='1';locationId='1';categoryId='1';severityId='1'}|ConvertTo-Json)
  Test-Req 'incidents_report_viewer' 'POST' "$base/incidents/report" (New-Headers $viewerToken $true) $reportBody
}
