$ErrorActionPreference='Continue'
$base='http://192.168.0.131:3000/api/v1'
$apiKey='local-dev-key'

function New-Headers([string]$token,[bool]$json){
  $h=@{'x-api-key'=$apiKey}
  if($token){$h['Authorization']="Bearer $token"}
  if($json){$h['Content-Type']='application/json'}
  return $h
}

$viewerLogin=Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Headers (New-Headers '' $true) -Body (@{email='analyst@xypes.local';password='Password123!'}|ConvertTo-Json)
$token=if($viewerLogin.accessToken){$viewerLogin.accessToken}else{$viewerLogin.token}

try{
  Invoke-WebRequest -Uri "$base/incidents" -Method GET -Headers (New-Headers $token $false) -UseBasicParsing | Out-Null
  Write-Output 'incidents_list_viewer: PASS'
}catch{
  $resp=$_.Exception.Response
  if($resp){
    $sr=New-Object IO.StreamReader($resp.GetResponseStream())
    $body=$sr.ReadToEnd()
    Write-Output ("incidents_list_viewer: FAIL status={0} body={1}" -f [int]$resp.StatusCode,$body)
  } else {
    Write-Output ("incidents_list_viewer: FAIL status=0 msg={0}" -f $_.Exception.Message)
  }
}

$reportBody=@{description='QA report from dashboard test';mediaUrl='';dateReported=(Get-Date).ToString('s');statusId='1';locationId='1';categoryId='1';severityId='1'}|ConvertTo-Json
try{
  Invoke-WebRequest -Uri "$base/incidents/report" -Method POST -Headers (New-Headers $token $true) -Body $reportBody -UseBasicParsing | Out-Null
  Write-Output 'incidents_report_viewer: PASS'
}catch{
  $resp=$_.Exception.Response
  if($resp){
    $sr=New-Object IO.StreamReader($resp.GetResponseStream())
    $body=$sr.ReadToEnd()
    Write-Output ("incidents_report_viewer: FAIL status={0} body={1}" -f [int]$resp.StatusCode,$body)
  } else {
    Write-Output ("incidents_report_viewer: FAIL status=0 msg={0}" -f $_.Exception.Message)
  }
}
