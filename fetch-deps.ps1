# All Ready Coffee - dependency fetcher.
# Downloads the npm packages (Linux x64 builds) so the cloud build server can install them,
# because the cloud server's network policy blocks registry.npmjs.org.
$ErrorActionPreference = "Continue"
Set-Location -Path $PSScriptRoot
$log = Join-Path $PSScriptRoot "fetch.log"
"==== started $(Get-Date) ====" | Out-File $log -Encoding utf8
function Log($m) { $m | Out-File $log -Append -Encoding utf8; Write-Host $m }
Log ("node: " + (node -v 2>&1))
Log ("npm:  " + (npm -v 2>&1))
$work = Join-Path $PSScriptRoot "_linux-deps"
if (Test-Path $work) { Remove-Item $work -Recurse -Force }
New-Item -ItemType Directory -Path $work | Out-Null
Copy-Item (Join-Path $PSScriptRoot "package.json") $work
Set-Location $work
Log "---- npm install (linux x64) ----"
npm install --os=linux --cpu=x64 --libc=glibc --ignore-scripts --no-audit --no-fund 2>&1 | Out-File $log -Append -Encoding utf8
if (-not (Test-Path "node_modules\next")) {
  Log "---- retry with --legacy-peer-deps ----"
  npm install --os=linux --cpu=x64 --libc=glibc --ignore-scripts --no-audit --no-fund --legacy-peer-deps 2>&1 | Out-File $log -Append -Encoding utf8
}
Log "---- installed top-level ----"
npm ls --depth=0 2>&1 | Out-File $log -Append -Encoding utf8
Log ("linux swc present: " + (Test-Path "node_modules\@next\swc-linux-x64-gnu"))
Log "---- packing ----"
tar -czf (Join-Path $PSScriptRoot "deps.tgz") node_modules package-lock.json 2>&1 | Out-File $log -Append -Encoding utf8
Set-Location $PSScriptRoot
$size = (Get-Item "deps.tgz").Length
Log ("deps.tgz bytes: " + $size)
# split into 80MB parts for transfer
$chunk = 80MB
$fs = [System.IO.File]::OpenRead((Join-Path $PSScriptRoot "deps.tgz"))
$buf = New-Object byte[] $chunk
$i = 0
while (($n = $fs.Read($buf, 0, $chunk)) -gt 0) {
  $name = Join-Path $PSScriptRoot ("deps.part{0:D2}" -f $i)
  $out = [System.IO.File]::Create($name); $out.Write($buf, 0, $n); $out.Close()
  $i++
}
$fs.Close()
Log ("parts: " + $i)
Remove-Item $work -Recurse -Force
Log "==== DONE $(Get-Date) ===="
Write-Host ""
Write-Host "All done - you can close this window and tell Claude 'fetched'."
Read-Host "Press Enter to close"
