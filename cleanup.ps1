$banner = @"
   ____                 _       ____            _       _
  / ___|___  _ __   ___| |_    / ___|___  _ __ | |_ ___| |__
 | |   / _ \| '_ \ / _ \ __|  | |   / _ \| '_ \| __/ __| '_ \
 | |__| (_) | | | |  __/ |_   | |__| (_) | | | | || (__| | | |
  \____\___/|_| |_|\___|\__|   \____\___/|_| |_|\__\___|_| |_|
          Friendly File Cleanup • For 🕡 SECURITY & 💖 FRIENDSHIP
"@
Write-Host $banner -ForegroundColor Cyan

# Configuration
$sourcePath   = "C:\Users\kaitw\Documents"
$logFolder    = "C:\Users\kaitw\ScriptGraveyard"
$cutoffDays   = 30
$now          = Get-Date
$cutoffDate   = $now.AddDays(-$cutoffDays)
$logCsv       = "C:\Users\kaitw\CleanupLog_$($now.ToString('yyyyMMdd_HHmmss')).csv"
$logData      = @()

# Excluded folders (case-insensitive match)
$excludedFolders = @("D:\\blink", "D:\\blink_backup") | ForEach-Object { $_.ToLower() }

# Ensure destination exists
if (-not (Test-Path $logFolder)) {
    New-Item -ItemType Directory -Path $logFolder | Out-Null
}

# Get old files excluding Blink folders
$oldFiles = Get-ChildItem -Path $sourcePath -Recurse -File | Where-Object {
    $_.LastWriteTime -lt $cutoffDate -and
    ($_.DirectoryName) -and
    -not ($excludedFolders -contains $_.DirectoryName.ToLower())
}

# Move files to graveyard and log
foreach ($file in $oldFiles) {
    $destination = Join-Path $logFolder $file.Name
    Move-Item $file.FullName $destination

    $logData += [pscustomobject]@{
        File        = $file.FullName
        Destination = $destination
        LastWrite   = $file.LastWriteTime
    }
}

# Save CSV log
$logData | Export-Csv -Path $logCsv -NoTypeInformation
Write-Host "Cleanup complete. Log saved to $logCsv" -ForegroundColor Green
