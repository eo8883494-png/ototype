# -*- coding: utf-8 -*-
"""r/{typeId}.html ×16 を data/types.json から生成する（アーティスト差し替え後の再生成にも使う）。
実行: python tools/gen_r_pages.py
"""
import json, io, sys, os, html

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
BASE = "https://eo8883494-png.github.io/ototype/"  # 公開URLに合わせて変更可（README参照）

with open(os.path.join(ROOT, "data", "types.json"), encoding="utf-8") as f:
    TYPES = json.load(f)

os.makedirs(os.path.join(ROOT, "r"), exist_ok=True)

TPL = """<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>私は{name}だった。#オトタイプ</title>
<meta name="description" content="{catch}。あなたの音楽の「聴き方」も16タイプ診断でチェック。20問・約1分・無料。">
<meta property="og:title" content="私は{name}だった。#オトタイプ">
<meta property="og:description" content="{catch}。あなたの聴き方も20問・1分で診断できる。">
<meta property="og:type" content="website">
<meta property="og:url" content="{base}r/{id}.html">
<meta property="og:image" content="{base}assets/ogp/{id}.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="{base}r/{id}.html">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@700;800;900&display=swap" rel="stylesheet">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-V0BNHBZ9CW"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','G-V0BNHBZ9CW');</script>
<style>
body{{margin:0;background:linear-gradient(180deg,#EAF3EC,#CFE3D8 70%);color:#3D4A47;font-family:'M PLUS Rounded 1c',sans-serif;min-height:100dvh;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;line-height:1.8}}
.card{{background:#fff;border:3px solid {color};border-radius:24px;padding:26px 26px 34px;max-width:420px;box-shadow:0 8px 24px rgba(93,120,110,.14)}}
.chr{{width:100%;height:220px;object-fit:contain}}
.code{{font-size:13px;font-weight:900;letter-spacing:.35em;color:{color}}}
h1{{font-size:clamp(30px,8vw,40px);font-weight:900;margin:8px 0 4px}}
.catch{{color:#556661;font-weight:800;font-size:15px}}
a{{display:inline-block;margin-top:26px;background:{color};color:#fff;text-decoration:none;font-weight:800;font-size:16px;padding:15px 34px;border-radius:999px;box-shadow:0 5px 16px rgba(93,120,110,.25)}}
p.f{{margin-top:26px;font-size:11px;color:#7E938D}}
</style>
</head>
<body>
<main class="card">
<img class="chr" src="../assets/chars/{id}.webp" alt="{name}のキャラクター">
<p class="code">{spaced}</p>
<h1>{name}</h1>
<p class="catch">{catch}</p>
<a href="../index.html">あなたも診断する（無料・約2分）</a>
<p class="f">本診断はエンタメ目的です。アーティスト各位とは無関係です。</p>
</main>
</body>
</html>
"""

for t in TYPES.values():
    out = TPL.format(
        id=t["id"], name=html.escape(t["name"]), catch=html.escape(t["catch"]),
        color=t["color"], base=BASE, spaced=" ".join(t["id"]),
    )
    path = os.path.join(ROOT, "r", t["id"] + ".html")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(out)
    print("wrote r/" + t["id"] + ".html")
print("done (16 pages)")
