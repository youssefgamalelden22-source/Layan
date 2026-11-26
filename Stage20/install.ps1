$ErrorActionPreference = 'Stop'
if (!(Test-Path '.\src\main\index.ts')) { throw 'Run from project root' }
$backup = Join-Path (Get-Location) ('backup-stage20-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
Copy-Item '.\src' $backup -Recurse
$dbdir = Join-Path $env:APPDATA 'itqan-layan\data'
if (Test-Path $dbdir) { Copy-Item $dbdir (Join-Path $backup 'database-backup') -Recurse }
Copy-Item (Join-Path $PSScriptRoot 'src\*') '.\src' -Recurse -Force
Write-Host 'Stage 20 installed. Run npm run typecheck.'
