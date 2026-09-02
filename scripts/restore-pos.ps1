param([Parameter(Mandatory = $true)][string]$BackupPath, [Parameter(Mandatory = $true)][string]$Confirmation)
$ErrorActionPreference = "Stop"
if ($Confirmation -cne "RESTORE FILLING POS") { throw "Restore cancelled. Pass -Confirmation 'RESTORE FILLING POS' explicitly." }
$resolvedBackup = [System.IO.Path]::GetFullPath($BackupPath)
if (-not (Test-Path -LiteralPath $resolvedBackup -PathType Leaf)) { throw "Backup file not found: $resolvedBackup" }
Get-Content -LiteralPath $resolvedBackup -Raw | docker compose exec -T postgres psql -U postgres -d filling_pos
if ($LASTEXITCODE -ne 0) { throw "Restore failed with exit code $LASTEXITCODE." }
Write-Output "Restore completed from: $resolvedBackup"
