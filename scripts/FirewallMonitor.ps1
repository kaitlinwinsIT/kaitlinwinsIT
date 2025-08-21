<#
    FirewallMonitor.ps1
    Monitors Windows Firewall logs, categorizes flagged events, removes old unflagged entries,
    and generates HTML reports twice daily. A simple window remains open while the scan runs.
    Schedule with Task Scheduler at desired times.
#>

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# GUI setup
$form = New-Object System.Windows.Forms.Form
$form.Text = "Firewall Scan"
$form.Width = 800
$form.Height = 600
$form.StartPosition = 'CenterScreen'

$box = New-Object System.Windows.Forms.TextBox
$box.Multiline = $true
$box.Dock = 'Fill'
$box.ReadOnly = $true
$box.ScrollBars = 'Vertical'
$form.Controls.Add($box)

function Add-Line($text) {
    $box.AppendText($text + [Environment]::NewLine)
}

$form.Show()
Add-Line "Starting firewall scan..."

# Configuration
$logPath   = "$env:SystemRoot\System32\LogFiles\Firewall\pfirewall.log"
$reportDir = "$env:USERPROFILE\Documents\FirewallReports"
$cutoffDays = 30
$now = Get-Date

if (-not (Test-Path $reportDir)) {
    New-Item -ItemType Directory -Path $reportDir | Out-Null
}

# Read firewall log
if (-not (Test-Path $logPath)) {
    Add-Line "Firewall log not found at $logPath"
    $form.ShowDialog() | Out-Null
    exit
}

Add-Line "Processing log at $logPath"
$logLines = Get-Content $logPath | Where-Object { $_ -and -not $_.StartsWith('#') }

# Parse log lines
$events = foreach ($line in $logLines) {
    $parts = $line -split ' '
    if ($parts.Length -ge 12) {
        [PSCustomObject]@{
            Date     = [datetime]::Parse($parts[0] + ' ' + $parts[1])
            Action   = $parts[2]
            Protocol = $parts[3]
            SrcIP    = $parts[4]
            DstIP    = $parts[5]
            SrcPort  = $parts[6]
            DstPort  = $parts[7]
            Size     = $parts[8]
            Flags    = $parts[11]
        }
    }
}

# Categorize into tiers
$tiers = [ordered]@{
    High   = @()
    Medium = @()
    Low    = @()
}

foreach ($event in $events) {
    $tier = 'Low'
    if ($event.Action -eq 'DROP' -and $event.DstPort -match '^(22|23|3389)$') {
        $tier = 'High'
    } elseif ($event.Action -eq 'DROP') {
        $tier = 'Medium'
    }
    $tiers[$tier] += $event
}

Add-Line "Categorized $($events.Count) events."

# Delete old unflagged entries
$threshold = $now.AddDays(-$cutoffDays)
$retained = @()
foreach ($event in $events) {
    if ($event.Date -ge $threshold -or $event.Action -eq 'DROP') {
        $retained += $event
    }
}
# Overwrite log with retained entries
$raw = $retained | ForEach-Object {
    '{0} {1} {2} {3} {4} {5} {6} {7} - - - {8}' -f `
        $_.Date.ToString('yyyy-MM-dd HH:mm:ss'), `
        $_.Action, `
        $_.Protocol, `
        $_.SrcIP, `
        $_.DstIP, `
        $_.SrcPort, `
        $_.DstPort, `
        $_.Size, `
        $_.Flags
}
Set-Content -Path $logPath -Value $raw
Add-Line "Old unflagged records older than $cutoffDays days removed."

# Generate HTML report
$reportPath = Join-Path $reportDir "FirewallReport_$($now.ToString('yyyyMMdd_HHmmss')).html"
$html = @()
$html += "<html><head><style>body{font-family:Segoe UI;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ccc;padding:4px;} th{background:#f0f0f0;} h2{border-bottom:1px solid #ccc;}</style></head><body>"
$html += "<h1>Firewall Report $($now)</h1>"
foreach ($tier in $tiers.Keys) {
    $html += "<h2>$tier Priority</h2>"
    $html += ($tiers[$tier] | Select-Object Date,Action,Protocol,SrcIP,DstIP,SrcPort,DstPort | ConvertTo-Html -Fragment)
}
$html += "</body></html>"
$html | Out-File -FilePath $reportPath -Encoding UTF8
Add-Line "Report written to $reportPath"

Add-Line "Scan complete."
$form.Refresh()
$form.ShowDialog() | Out-Null
