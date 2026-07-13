# Wait for the native file-open dialog to be foreground, then type the path and confirm.
# Guard: never send keys unless the foreground window title is exactly the Open dialog title.
param(
  [Parameter(Mandatory=$true)][string]$FilePath,
  [int]$TimeoutSec = 20
)
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Win32 {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
}
"@
if (-not (Test-Path $FilePath)) { Write-Output "NG: file not found"; exit 1 }

# "Open" dialog title on ja-JP Windows is U+958B U+304F
$jaOpen = [string][char]0x958B + [string][char]0x304F
$deadline = (Get-Date).AddSeconds($TimeoutSec)
$title = ""
while ((Get-Date) -lt $deadline) {
  $h = [Win32]::GetForegroundWindow()
  $sb = New-Object System.Text.StringBuilder 256
  [Win32]::GetWindowText($h, $sb, 256) | Out-Null
  $title = $sb.ToString()
  if ($title -eq $jaOpen -or $title -eq "Open") {
    Start-Sleep -Milliseconds 400
    [System.Windows.Forms.SendKeys]::SendWait($FilePath)
    Start-Sleep -Milliseconds 500
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
    Write-Output "OK: sent to dialog"
    exit 0
  }
  Start-Sleep -Milliseconds 500
}
Write-Output "NG: dialog not foreground within ${TimeoutSec}s (foreground='$title')"
exit 2
