# -*- coding: utf-8 -*-
r"""TikTok投稿の半自動化(2026-07-18運用変更): 動画+キャプションをTelegramでスマホへ送る。
ブラウザ自動化でのファイル選択が構造的に不可能と判明したため、
「AIが素材一式を用意→人間がOS共有シートから15秒で投稿」方式に切替。

使い方:
  python scripts\send_to_phone.py --video upload\C_RSDT_tiktok.mp4 --caption "本文..."
  python scripts\send_to_phone.py --text-only "メッセージ"   (テキストだけ送る)

トークン/チャットIDは C:\dev\x-autopilot\.env の TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID を読む。
標準ライブラリのみ(requests不要)。
"""
import argparse
import mimetypes
import os
import sys
import urllib.parse
import urllib.request
import uuid

ENV_PATH = r"C:\dev\x-autopilot\.env"


def load_env():
    token = chat_id = None
    with open(ENV_PATH, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("TELEGRAM_BOT_TOKEN="):
                token = line.split("=", 1)[1].strip()
            elif line.startswith("TELEGRAM_CHAT_ID="):
                chat_id = line.split("=", 1)[1].strip()
    if not token or not chat_id:
        raise SystemExit("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID が .env にありません")
    return token, chat_id


def send_text(token, chat_id, text):
    data = urllib.parse.urlencode({"chat_id": chat_id, "text": text}).encode("utf-8")
    req = urllib.request.Request(f"https://api.telegram.org/bot{token}/sendMessage", data=data)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8")


def send_video(token, chat_id, video_path, caption):
    boundary = uuid.uuid4().hex
    fname = os.path.basename(video_path)
    ctype = mimetypes.guess_type(fname)[0] or "video/mp4"
    with open(video_path, "rb") as f:
        video_bytes = f.read()

    parts = []
    for name, value in (("chat_id", chat_id), ("caption", caption)):
        parts.append(
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n".encode("utf-8")
        )
    parts.append(
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"video\"; filename=\"{fname}\"\r\n"
        f"Content-Type: {ctype}\r\n\r\n".encode("utf-8")
    )
    parts.append(video_bytes)
    parts.append(f"\r\n--{boundary}--\r\n".encode("utf-8"))
    body = b"".join(parts)

    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendVideo",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    with urllib.request.urlopen(req, timeout=300) as resp:
        return resp.read().decode("utf-8")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--video")
    ap.add_argument("--caption", default="")
    ap.add_argument("--text-only")
    args = ap.parse_args()
    token, chat_id = load_env()
    if args.text_only:
        out = send_text(token, chat_id, args.text_only)
    elif args.video:
        if not os.path.exists(args.video):
            raise SystemExit(f"動画がありません: {args.video}")
        out = send_video(token, chat_id, os.path.abspath(args.video), args.caption)
    else:
        raise SystemExit("--video か --text-only を指定してください")
    ok = '"ok":true' in out
    print("OK" if ok else f"FAILED: {out[:500]}")
    sys.exit(0 if ok else 1)
