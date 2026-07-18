# -*- coding: utf-8 -*-
r"""TikTok Content Posting API (Direct Post) クライアント — 審査承認後の本番投稿用。
2026-07-18時点では未承認のためスケルトン(実装済み・トークン未設定)。
承認後: x-autopilot\.env に TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET /
TIKTOK_ACCESS_TOKEN / TIKTOK_REFRESH_TOKEN を設定して使う。

使い方:
  python scripts\tiktok_api_post.py --video upload\X_tiktok.mp4 --caption "本文" [--public]
  (既定はSELF_ONLY=自分のみ公開。審査デモと初回テストはこの既定のまま使う)
  python scripts\tiktok_api_post.py --refresh-token   (アクセストークン更新)
"""
import argparse
import json
import os
import sys
import urllib.parse
import urllib.request

ENV_PATH = r"C:\dev\x-autopilot\.env"
API_BASE = "https://open.tiktokapis.com/v2"


def load_env():
    vals = {}
    with open(ENV_PATH, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                vals[k.strip()] = v.strip()
    return vals


def api_post(url, payload, token=None, content_type="application/json"):
    if content_type == "application/json":
        data = json.dumps(payload).encode("utf-8")
    else:
        data = urllib.parse.urlencode(payload).encode("utf-8")
    headers = {"Content-Type": content_type}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def refresh_access_token(env):
    out = api_post(
        f"{API_BASE}/oauth/token/",
        {
            "client_key": env["TIKTOK_CLIENT_KEY"],
            "client_secret": env["TIKTOK_CLIENT_SECRET"],
            "grant_type": "refresh_token",
            "refresh_token": env["TIKTOK_REFRESH_TOKEN"],
        },
        content_type="application/x-www-form-urlencoded",
    )
    print(json.dumps(out, ensure_ascii=False, indent=2))
    print("\n上記 access_token / refresh_token を .env に反映してください")


def direct_post(env, video_path, caption, public):
    token = env["TIKTOK_ACCESS_TOKEN"]
    size = os.path.getsize(video_path)
    # 単一チャンクアップロード(64MB未満想定。圧縮済み動画は10MB未満なので常に単一)
    init = api_post(
        f"{API_BASE}/post/publish/video/init/",
        {
            "post_info": {
                "title": caption,
                "privacy_level": "PUBLIC_TO_EVERYONE" if public else "SELF_ONLY",
                "disable_duet": False,
                "disable_comment": False,
                "disable_stitch": False,
            },
            "source_info": {
                "source": "FILE_UPLOAD",
                "video_size": size,
                "chunk_size": size,
                "total_chunk_count": 1,
            },
        },
        token=token,
    )
    if init.get("error", {}).get("code") not in (None, "ok"):
        raise SystemExit(f"init失敗: {init}")
    upload_url = init["data"]["upload_url"]
    publish_id = init["data"]["publish_id"]

    with open(video_path, "rb") as f:
        video_bytes = f.read()
    req = urllib.request.Request(
        upload_url,
        data=video_bytes,
        headers={
            "Content-Type": "video/mp4",
            "Content-Range": f"bytes 0-{size - 1}/{size}",
        },
        method="PUT",
    )
    with urllib.request.urlopen(req, timeout=600) as resp:
        if resp.status not in (200, 201):
            raise SystemExit(f"upload失敗: HTTP {resp.status}")

    status = api_post(
        f"{API_BASE}/post/publish/status/fetch/",
        {"publish_id": publish_id},
        token=token,
    )
    print(json.dumps(status, ensure_ascii=False, indent=2))
    print(f"\npublish_id: {publish_id} (状態はstatus/fetchで追跡可能)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--video")
    ap.add_argument("--caption", default="")
    ap.add_argument("--public", action="store_true", help="既定はSELF_ONLY。本番公開時のみ指定")
    ap.add_argument("--refresh-token", action="store_true")
    args = ap.parse_args()
    env = load_env()

    missing = [k for k in ("TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET") if k not in env]
    if missing:
        raise SystemExit(f".envに未設定: {missing} — API審査承認後に設定します(申請キット参照)")

    if args.refresh_token:
        refresh_access_token(env)
    elif args.video:
        if "TIKTOK_ACCESS_TOKEN" not in env:
            raise SystemExit(".envにTIKTOK_ACCESS_TOKENがありません(OAuth初回認可が未実施)")
        direct_post(env, os.path.abspath(args.video), args.caption, args.public)
    else:
        ap.print_help()
        sys.exit(1)
