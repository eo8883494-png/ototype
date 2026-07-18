# Find the file-open dialog anywhere, bring it to foreground, then type the path.
# v3 (2026-07-15): SetForegroundWindow alone was failing due to Windows' foreground-lock
# protection (the calling PowerShell process isn't the current foreground process, so
# Windows silently refuses the focus steal). Fix: AttachThreadInput to the current
# foreground thread before calling SetForegroundWindow, then detach - this is the
# standard, documented Win32 pattern for this exact situation (not a keystroke/ALT trick).
# Still guards: keys are sent only after verifying the foreground window IS the dialog,
# and it exits with a clear NG code (no forcing) if that verification ever fails.
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
public class PF3 {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc p, IntPtr l);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder t, int c);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint processId);
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
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
  public static bool FocusForce(IntPtr target) {
    uint curThread = GetCurrentThreadId();
    uint dummy;
    IntPtr fg = GetForegroundWindow();
    uint fgThread = GetWindowThreadProcessId(fg, out dummy);
    bool attached = false;
    if (fgThread != curThread) {
      attached = AttachThreadInput(curThread, fgThread, true);
    }
    bool ok = SetForegroundWindow(target);
    if (attached) {
      AttachThreadInput(curThread, fgThread, false);
    }
    return ok;
  }
}
"@
if (-not (Test-Path $FilePath)) { Write-Output "NG: file not found"; exit 1 }
$jaOpen = [string][char]0x958B + [string][char]0x304F  # "Open" dialog title (ja)
$deadline = (Get-Date).AddSeconds($TimeoutSec)
while ((Get-Date) -lt $deadline) {
  [PF3]::T.Clear(); [PF3]::H.Clear()
  [PF3]::EnumWindows([PF3+EnumProc]{param($h,$l) [PF3]::Cb($h,$l)}, [IntPtr]::Zero) | Out-Null
  for ($i = 0; $i -lt [PF3]::T.Count; $i++) {
    if ([PF3]::T[$i] -eq $jaOpen -or [PF3]::T[$i] -eq "Open") {
      $dlg = [PF3]::H[$i]
      [PF3]::FocusForce($dlg) | Out-Null
      Start-Sleep -Milliseconds 400
      if ([PF3]::GetForegroundWindow() -eq $dlg) {
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
