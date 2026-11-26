$ErrorActionPreference = 'Stop'
if (!(Test-Path '.\src\main\index.ts')) { throw 'Run from project root' }
$backup = Join-Path (Get-Location) ('backup-stage5-full-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
Copy-Item '.\src' $backup -Recurse
$dbdir = Join-Path $env:APPDATA 'itqan-layan\data'
if (Test-Path $dbdir) { Copy-Item $dbdir (Join-Path $backup 'database-backup') -Recurse }
Copy-Item (Join-Path $PSScriptRoot 'src\*') '.\src' -Recurse -Force
Write-Host 'Stage 5 integrated installed. Run npm run typecheck.'
