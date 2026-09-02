param([string]$OutputDirectory = "backups")
$ErrorActionPreference = "Stop"
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Force -Path $resolvedOutput | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputFile = Join-Path $resolvedOutput "filling-pos-$timestamp.sql"
docker compose exec -T postgres pg_dump -U postgres -d filling_pos --clean --if-exists --no-owner --no-privileges | Out-File -FilePath $outputFile -Encoding utf8
if (-not (Test-Path -LiteralPath $outputFile) -or (Get-Item -LiteralPath $outputFile).Length -eq 0) { throw "Backup file was not created." }
Write-Output "Backup created: $outputFile"
