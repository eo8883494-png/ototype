# 16タイプ一括レンダリング(完了検知用にログとマーカーファイルを書く)
$env:Path = "C:\dev\tools\node;$env:Path"
Set-Location C:\dev\ototype\video
if (Test-Path out\_all_done.txt) { Remove-Item out\_all_done.txt }
npm run render -- --all *> render_all.log
"done $(Get-Date -Format s)" | Out-File out\_all_done.txt -Encoding utf8
