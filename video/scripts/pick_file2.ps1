# Find the file-open dialog anywhere, bring it to foreground, then type the path.
# Safer than waiting for it to be foreground by itself. Still guards: keys are sent
# only after verifying the foreground window IS the dialog.
param(
  [Parameter(Mandatory=$true)][string]$FilePath,
  [int]$TimeoutSec = 20
)
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public class PF2 {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc p, IntPtr l);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder t, int c);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  public static List<string> T = new List<string>();
  public static List<IntPtr> H = new List<IntPtr>();
  public static bool Cb(IntPtr h, IntPtr l) {
    if (!IsWindowVisible(h)) return true;
    var sb = new StringBuilder(512);
    GetWindowText(h, sb, 512);
    var t = sb.ToString();
    if (t.Length > 0) { T.Add(t); H.Add(h); }
    return true;
  }
}
"@
if (-not (Test-Path $FilePath)) { Write-Output "NG: file not found"; exit 1 }
$jaOpen = [string][char]0x958B + [string][char]0x304F  # "Open" dialog title (ja)
$deadline = (Get-Date).AddSeconds($TimeoutSec)
while ((Get-Date) -lt $deadline) {
  [PF2]::T.Clear(); [PF2]::H.Clear()
  [PF2]::EnumWindows([PF2+EnumProc]{param($h,$l) [PF2]::Cb($h,$l)}, [IntPtr]::Zero) | Out-Null
  for ($i = 0; $i -lt [PF2]::T.Count; $i++) {
    if ([PF2]::T[$i] -eq $jaOpen -or [PF2]::T[$i] -eq "Open") {
      $dlg = [PF2]::H[$i]
      [PF2]::SetForegroundWindow($dlg) | Out-Null
      Start-Sleep -Milliseconds 400
      if ([PF2]::GetForegroundWindow() -eq $dlg) {
        [System.Windows.Forms.SendKeys]::SendWait($FilePath)
        Start-Sleep -Milliseconds 500
        [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
        Write-Output "OK: path sent"
        exit 0
      } else {
        Write-Output "WARN: could not focus dialog, retrying"
      }
    }
  }
  Start-Sleep -Milliseconds 500
}
Write-Output "NG: open-dialog not found within ${TimeoutSec}s"
exit 2
