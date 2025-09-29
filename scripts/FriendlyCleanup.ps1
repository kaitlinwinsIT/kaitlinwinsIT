
$banner = @"
   ____                 _       ____            _       _
  / ___|___  _ __   ___| |_    / ___|___  _ __ | |_ ___| |__
 | |   / _ \| '_ \ / _ \ __|  | |   / _ \| '_ \| __/ __| '_ \
 | |__| (_) | | | |  __/ |_   | |__| (_) | | | | || (__| | | |
  \____\___/|_| |_|\___|\__|   \____\___/|_| |_|\__\___|_| |_|

"@
Write-Host $banner -ForegroundColor Cyan

# Configuration
$logData = @()

# Excluded folders (case-insensitive match)
$excludedFolders = @("D:\\blink", "D:\\blink_backup")
$excludedFoldersLower = $excludedFolders | ForEach-Object { $_.ToLower() }

# Ensure destination exists
if (-not (Test-Path $logFolder)) {
    New-Item -ItemType Directory -Path $logFolder | Out-Null
}

