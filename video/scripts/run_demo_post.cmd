@echo off
rem TikTok API審査デモ用: Direct Postをコンソール表示で実行する(引用符トラブル回避のためcmd化)
cd /d C:\dev\ototype\video
echo === Ototype Video Poster - Content Posting API Direct Post demo ===
C:\dev\x-autopilot\.venv\Scripts\python.exe scripts\tiktok_api_post.py --video upload\RLDT_tiktok.mp4 --caption "Ototype Video Poster demo - private test"
echo.
echo === done ===
pause
