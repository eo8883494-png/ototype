# TikTok投稿タスクの実行中だけ画面ロック/スリープを防ぐ(2026-07-15)。
# 根本原因: 19:00の無人実行タイミングでアイドル時間が閾値を超え、Windowsが画面をロックしていた
# (LockAppがフォアグラウンドになりEnumWindowsからファイルダイアログが見えなくなる)。
# Windowsのロック/スリープ設定そのものは変更しない(システム設定変更はしない方針)。
# 代わりに、動画プレイヤー等が使う標準API(SetThreadExecutionState)でこのプロセスが
# 生きている間だけ「アイドルではない」とOSに伝える。プロセス終了で自動的に元の挙動に戻る。
param(
  [int]$DurationSec = 2400  # 40分。3本の投稿作業をカバーする想定
)
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class KeepAwake {
  [DllImport("kernel32.dll")]
  public static extern uint SetThreadExecutionState(uint esFlags);
}
"@
# 0x80000000はPowerShell 5.1がInt32として解釈し負値になるため、明示的にUInt32へ変換する
$ES_CONTINUOUS = [Convert]::ToUInt32("80000000", 16)
$ES_SYSTEM_REQUIRED = [uint32]1
$ES_DISPLAY_REQUIRED = [uint32]2
[KeepAwake]::SetThreadExecutionState($ES_CONTINUOUS -bor $ES_SYSTEM_REQUIRED -bor $ES_DISPLAY_REQUIRED) | Out-Null
Write-Output "[keep_awake] active for $DurationSec sec"
Start-Sleep -Seconds $DurationSec
[KeepAwake]::SetThreadExecutionState($ES_CONTINUOUS) | Out-Null
Write-Output "[keep_awake] released"
