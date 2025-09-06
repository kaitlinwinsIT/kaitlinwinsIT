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
$sourcePath = "C:\\Users\\kaitw\\Documents"
$logFolder = "C:\\Users\\kaitw\\ScriptGraveyard"
$cutoffDays = 30
$now = Get-Date
$cutoffDate = $now.AddDays(-$cutoffDays)
$logCsv = "C:\\Users\\kaitw\\CleanupLog_$($now.ToString('yyyyMMdd_HHmmss')).csv"
$logData = @()

# Excluded folders (case-insensitive match)
$excludedFolders = @("D:\\blink", "D:\\blink_backup")
$excludedFoldersLower = $excludedFolders | ForEach-Object { $_.ToLower() }

# Ensure destination exists
if (-not (Test-Path $logFolder)) {
    New-Item -ItemType Directory -Path $logFolder | Out-Null
}

# Get old files excluding Blink folders
$oldFiles = Get-ChildItem -Path $sourcePath -Recurse -File | Where-Object {
    $_.LastWriteTime -lt $cutoffDate -and
    $_.DirectoryName -and
    -not ($excludedFoldersLower -contains $_.DirectoryName.ToLower())
}

# Move the files and collect log data
foreach ($file in $oldFiles) {
    $relativePath = $file.FullName.Substring($sourcePath.Length).TrimStart('\')
    $destination = Join-Path $logFolder $relativePath
    $destDir = Split-Path $destination -Parent
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    Move-Item -Path $file.FullName -Destination $destination -Force
    $logData += [PSCustomObject]@{
        FileName      = $file.Name
        OriginalPath  = $file.FullName
        NewPath       = $destination
        LastWriteTime = $file.LastWriteTime
    }
}

# Write log to CSV
if ($logData.Count -gt 0) {
    $logData | Export-Csv -NoTypeInformation -Path $logCsv
    Write-Host "Moved $($logData.Count) files. Log saved to $logCsv" -ForegroundColor Green

    # Optional: email the log to Matt
    $mattEmail = "matt@example.com"       # <-- replace with Matt's real email
    $smtpServer = "smtp.example.com"      # <-- replace with your SMTP server
    try {
        Send-MailMessage -To $mattEmail -From "$env:USERNAME@example.com" -Subject "Cleanup Log" -Body "Files moved to $logFolder" -Attachments $logCsv -SmtpServer $smtpServer
        Write-Host "Cleanup log emailed to Matt." -ForegroundColor Cyan
    } catch {
        Write-Host "Failed to email Matt: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "No files older than $cutoffDays days were found." -ForegroundColor Yellow
}
