param(
    [string]$Subject = "Hello Matt",
    [string]$Body = "Just checking in!"
)

Add-Type -AssemblyName System.Web
$encodedSubject = [System.Web.HttpUtility]::UrlEncode($Subject)
$encodedBody = [System.Web.HttpUtility]::UrlEncode($Body)
$mailto = "mailto:matt@example.com?subject=$encodedSubject&body=$encodedBody"
Start-Process $mailto
