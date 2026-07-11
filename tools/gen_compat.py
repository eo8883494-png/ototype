# -*- coding: utf-8 -*-
"""data/compat.json 生成スクリプト（開発用・再生成可能）。
16タイプ×16タイプの対称マトリクスを、軸の一致数と相違軸の組み合わせから合成する。
実行: python tools/gen_compat.py  → data/compat.json を上書き。
"""
import json, io, sys, itertools, os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")

AXES = ["place", "core", "into", "find"]
POLES = {"place": ("F", "R"), "core": ("L", "S"), "into": ("D", "E"), "find": ("T", "M")}

with open(os.path.join(ROOT, "data", "types.json"), encoding="utf-8") as f:
    TYPES = json.load(f)
CODES = list(TYPES.keys())

# 相違軸ごとの「違いの言い換え」（△でも“楽しみ方が違うだけ”の枠組み）
DIFF_PHRASE = {
    "place": "現場で浴びたい派とじっくり聴きたい派",
    "core": "言葉で聴く人と音で聴く人",
    "into": "どっぷり浸る人とゆるく楽しむ人",
    "find": "王道を愛する人と開拓する人",
}
# 一致軸ごとの「共通点」
SAME_PHRASE = {
    "place": "音楽の楽しみ方の温度",
    "core": "曲のどこに痺れるか",
    "into": "ハマり方の深さ",
    "find": "曲の探し方",
}

def rating(match_count: int) -> str:
    # 4=同タイプ, 3 → ◎ / 2 → ○ / 1・0 → △
    if match_count >= 3:
        return "◎"
    if match_count == 2:
        return "○"
    return "△"

def summary(a: str, b: str) -> str:
    diffs = [ax for i, ax in enumerate(AXES) if a[i] != b[i]]
    sames = [ax for i, ax in enumerate(AXES) if a[i] == b[i]]
    if not diffs:
        return "聴き方がほぼ同じ、魂の同族。好きの理由まで通じ合える"
    if len(diffs) == 4:
        return "全部が真逆。だからこそ、お互いの世界が2倍に広がる組み合わせ"
    if len(diffs) == 1:
        return f"{SAME_PHRASE[sames[0]]}も含めてほぼ同じ。{DIFF_PHRASE[diffs[0]]}の違いが良いスパイス"
    if len(diffs) == 2:
        return f"{DIFF_PHRASE[diffs[0]]}。でも{SAME_PHRASE[sames[0]]}は同じだから、ちゃんと噛み合う"
    # len == 3
    return f"{DIFF_PHRASE[diffs[0]]}。共通点は{SAME_PHRASE[sames[0]]}だけ、そこから世界が混ざり始める"

compat = {}
for a, b in itertools.combinations_with_replacement(CODES, 2):
    match = sum(1 for i in range(4) if a[i] == b[i])
    key = f"{a}-{b}" if a <= b else f"{b}-{a}"
    compat[key] = {"rating": rating(match), "match": match, "summary": summary(a, b)}

out = os.path.join(ROOT, "data", "compat.json")
with open(out, "w", encoding="utf-8", newline="\n") as f:
    json.dump(compat, f, ensure_ascii=False, indent=1)

ratings = [v["rating"] for v in compat.values()]
print(f"generated {len(compat)} pairs -> {out}")
print("◎:", ratings.count("◎"), "○:", ratings.count("○"), "△:", ratings.count("△"))
