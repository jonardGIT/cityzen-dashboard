$ErrorActionPreference='Continue'
$base='http://192.168.0.131:3000/api/v1'
$apiKey='local-dev-key'

function NewHeaders([string]$token){
  $h=@{'x-api-key'=$apiKey;'Content-Type'='application/json'}
  if($token){$h['Authorization']="Bearer $token"}
  return $h
}

function LoginViewerToken(){
  try{
    $body=(@{email='analyst@xypes.local';password='Password123!'}|ConvertTo-Json)
    $resp=Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Headers (NewHeaders '') -Body $body -TimeoutSec 20
    if($resp.accessToken){return $resp.accessToken}
    if($resp.token){return $resp.token}
    return $null
  } catch {
    return $null
  }
}

function TestPayload([string]$name,[hashtable]$payload,[string]$token){
  $json = $payload | ConvertTo-Json
  try{
    $resp=Invoke-WebRequest -Uri "$base/incidents/report" -Method POST -Headers (NewHeaders $token) -Body $json -TimeoutSec 20 -UseBasicParsing
    Write-Output ("PASS {0} status={1}" -f $name,$resp.StatusCode)
    if($resp.Content){
      $content = $resp.Content
      if($content.Length -gt 180){$content=$content.Substring(0,180)+'...'}
      Write-Output ("body={0}" -f $content)
    }
  } catch {
    $code=0
    $body=''
    if($_.Exception.Response){
      $r=$_.Exception.Response
      $code=[int]$r.StatusCode
      try{
        $sr=New-Object IO.StreamReader($r.GetResponseStream())
        $body=$sr.ReadToEnd()
      }catch{}
    }
    Write-Output ("FAIL {0} status={1}" -f $name,$code)
    if($body){Write-Output ("body={0}" -f $body)}
  }
  Write-Output '---'
}

$token=LoginViewerToken
if(-not $token){
  Write-Output 'viewer_login FAIL'
  exit 1
}

$now=(Get-Date).ToString('s')

$cases=@(
  @{Name='case_01_description_only'; Payload=@{description='report sweep: description only'}},
  @{Name='case_02_plus_mediaUrl'; Payload=@{description='report sweep'; mediaUrl=''}},
  @{Name='case_03_plus_dateReported'; Payload=@{description='report sweep'; mediaUrl=''; dateReported=$now}},
  @{Name='case_04_plus_statusId'; Payload=@{description='report sweep'; mediaUrl=''; dateReported=$now; statusId='1'}},
  @{Name='case_05_plus_locationId'; Payload=@{description='report sweep'; mediaUrl=''; dateReported=$now; statusId='1'; locationId='1'}},
  @{Name='case_06_plus_categoryId'; Payload=@{description='report sweep'; mediaUrl=''; dateReported=$now; statusId='1'; locationId='1'; categoryId='1'}},
  @{Name='case_07_plus_severityId'; Payload=@{description='report sweep'; mediaUrl=''; dateReported=$now; statusId='1'; locationId='1'; categoryId='1'; severityId='1'}},
  @{Name='case_08_with_citizenId_forbidden'; Payload=@{description='report sweep'; mediaUrl=''; dateReported=$now; statusId='1'; locationId='1'; categoryId='1'; severityId='1'; citizenId='1'}}
)

foreach($c in $cases){
  TestPayload $c.Name $c.Payload $token
}
