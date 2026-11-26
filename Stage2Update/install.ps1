param([string]$Project='D:\Projects\ItqanLayan')
$ErrorActionPreference='Stop'
$main=Join-Path $Project 'src\main\index.ts'; $auth=Join-Path $Project 'src\main\services\auth.ts'; $pre=Join-Path $Project 'src\preload\index.ts'
$utf8=New-Object System.Text.UTF8Encoding($false)
$m=[IO.File]::ReadAllText($main);$a=[IO.File]::ReadAllText($auth);$p=[IO.File]::ReadAllText($pre)
if($a -notmatch 'const sessions\s*=\s*new Map' -or $m -notmatch 'registerAuthHandlers\(\)' -or $p -notmatch 'auth\s*:\s*\{'){throw 'Unexpected project files. No changes made.'}
$backup=Join-Path $Project ('backup-villas-'+(Get-Date -Format 'yyyyMMdd-HHmmss'));New-Item -ItemType Directory $backup|Out-Null;Copy-Item (Join-Path $Project 'src') $backup -Recurse
if($a -notmatch 'export function getVillaSession'){ $a+="`nexport function getVillaSession(id: number) { return sessions.get(id) }`n" }
if($m -notmatch 'registerVillaHandlers\(\)'){ $m="import { registerVillaHandlers } from './services/villas'`n"+$m; $m=$m.Replace('registerAuthHandlers()','registerAuthHandlers()'+"`n  registerVillaHandlers()") }
if($p -notmatch 'villas\s*:'){ $p=[regex]::Replace($p,'auth\s*:\s*\{',"villas: {`n list: (data: unknown) => ipcRenderer.invoke('villas:list', data),`n save: (data: unknown) => ipcRenderer.invoke('villas:save', data),`n archive: (data: unknown) => ipcRenderer.invoke('villas:archive', data)`n },`n auth: {",1) }
foreach($channel in @('dashboard','profile','owner','violation')) { if($p -notmatch "villas:$channel") { $p=$p.Replace('villas: {', "villas: {`n ${channel}: (data: unknown) => ipcRenderer.invoke('villas:$channel', data),") } }
[IO.File]::WriteAllText($auth,$a,$utf8);[IO.File]::WriteAllText($main,$m,$utf8);[IO.File]::WriteAllText($pre,$p,$utf8)
Copy-Item (Join-Path $PSScriptRoot 'villas.ts') (Join-Path $Project 'src\main\services\villas.ts') -Force
Copy-Item (Join-Path $PSScriptRoot 'renderer\*') (Join-Path $Project 'src\renderer\src') -Recurse -Force
Write-Host "Installed. Source backup: $backup"
