param([string]$OutputDirectory = "backups")
$ErrorActionPreference = "Stop"
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Force -Path $resolvedOutput | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputFile = Join-Path $resolvedOutput "filling-pos-$timestamp.sql.age"
# ต้องติดตั้ง age (https://github.com/FiloSottile/age) และตั้ง AGE_RECIPIENTS
if (-not $env:AGE_RECIPIENTS) { throw "Set AGE_RECIPIENTS (age public key) before encrypted backup. See docs/backup-drill.md" }
docker compose exec -T postgres pg_dump -U postgres -d filling_pos --clean --if-exists --no-owner --no-privileges | age -r $env:AGE_RECIPIENTS -o $outputFile
if (-not (Test-Path -LiteralPath $outputFile)) { throw "Encrypted backup failed." }
Write-Output "Encrypted backup: $outputFile (RPO 24h — keep 30 days)"
