# オトタイプ — あなたの「聴き方」タイプ診断

音楽の知識ゼロでOK。20問(約2分)に答えると、音楽の「聴き方」を**4軸×16タイプ**で判定。
友達に相性リンクを送って、ライブ相性(◎/○/△)と「そのまま送れる誘い文句」までチェックできる。
タイプ別の**プレイリストレシピ**と**全16タイプ一覧**つき。

- フロント: 素のHTML/CSS/JS(ビルドなし・ライブラリなし・Google Fontsのみ)
- バックエンドなし・DBなし: 解説はタイプ別テンプレ、相性リンクは回答列をURLクエリに載せるステートレス方式
- 質問形式: 7段階の同意スケール(そう思う ↔ そう思わない)×20問・1ページスクロール式

## 4軸と16タイプ

| 軸 | 記号 |
|---|---|
| 場所感 | **F**(みんな/現場) ↔ **R**(ひとり/自室) |
| 刺さる核 | **L**(歌詞・言葉) ↔ **S**(音・ノリ) |
| のめり込み | **D**(熱狂) ↔ **E**(ゆるり) |
| 探し方 | **T**(王道) ↔ **M**(開拓) |

タイプコードは4文字(例: `FSDT`=フェス大合唱型)。定義は `data/types.json`。

判定は各設問の同意度(+3〜-3)×設問の向き(`dir`)を軸ごとに合計し、符号で極を決める(同点はpos極・決定的)。
実装は `scoring.mjs` が唯一の真実源で、`app.js` と `tools/selftest.mjs` が同じ関数をimportする。

---

## 1. GitHub Pages で公開する

1. このリポジトリをGitHubへ push(リポジトリ直下が公開ルートの構成)
2. リポジトリの **Settings → Pages → Source: Deploy from a branch → main / (root)** を選択
3. 数分後 `https://<ユーザー名>.github.io/<リポジトリ名>/` で公開される
4. `tools/gen_r_pages.py` の `BASE` を公開URLに合わせて書き換え、`python tools/gen_r_pages.py` で `r/*.html` を再生成して push(OGPの絶対URLを正すため)

ローカル確認(`fetch`を使うため file:// では動かない):

```
cd <このリポジトリ>
python -m http.server 8080
# → http://localhost:8080/
```

## 2. 質問・タイプ・プレイリストの編集

- 質問: `data/questions.json`。各設問は `{ axis, dir, text }`。`dir: 1`=同意でpos極(F/L/D/T)、`dir: -1`=同意でneg極(R/S/E/M)。各軸5問を維持すること
- タイプ: `data/types.json` の `name / catch / keywords / color / artists / fallback(解説文) / playlist(レシピ)`
- 相性: `data/compat.json` は `python tools/gen_compat.py` で軸一致数から再生成できる

**法務ルール**: アーティストは名前のテキスト表記のみ。写真・ロゴ・歌詞・音源・ジャケットは使わない。
フッターの「本診断はエンタメ目的です。アーティスト各位とは無関係です」を消さない。

## 3. OGP画像とシェア用ページの再生成

- `python tools/gen_r_pages.py` … `r/{typeId}.html` ×16 を再生成(タイプ名/キャッチ変更時)
- OGP画像: `python -m http.server 8080` → ブラウザで `http://localhost:8080/tools/ogp-generator.html` →「16枚を一括ダウンロード」→ `assets/ogp/` に上書き(npm等の依存は不要)

## 4. セルフテスト

```
node tools/selftest.mjs
```

- 構造: 16タイプ・各軸5問・全タイプにプレイリスト定義
- バランス: ランダム回答40,000回で全16タイプの出現率が2%以上
- 回帰: 全問同意→FLDT / 全問不同意→RSEM / 全問中立→FLDT(同点はpos極) / pos方向最大回答→FLDT・全margin15・純度高
- 不変条件: 空回答・範囲外回答で例外を出さない

## 構成

```
index.html  app.js  style.css  scoring.mjs
data/types.json  data/questions.json  data/compat.json
r/{typeId}.html ×16          … シェア用OGPページ
assets/ogp/{typeId}.png ×16  … OGP画像
tools/ogp-generator.html     … OGP画像の再生成(ブラウザ)
tools/gen_r_pages.py         … r/*.html の再生成
tools/gen_compat.py          … data/compat.json の再生成(軸一致数ベース)
tools/selftest.mjs           … セルフテスト(node)
```

## 注意

- 本診断はエンタメ目的です。アーティスト各位とは無関係です
- 個人情報は収集しません(ニックネームは任意・最大20字・URLに載る旨をUI上に明記)
- 相性リンクのニックネームはURLクエリに含まれるため、本名を使わないことを推奨

## キャラクター画像・コンテンツの利用ポリシー

© 2026 オトタイプ／はたらくAI研究室

- キャラクター画像・タイプ解説などの権利は制作者(はたらくAI研究室)に帰属します
- **非商用の個人利用はOK**: SNSアイコン・ブログやSNSでの紹介・壁紙などにそのまま使ってかまいません(出典として「オトタイプ」の名前かリンクを添えてもらえるとうれしいです)
- **商用利用・再配布は禁止**: 販売・グッズ化・広告素材・自作発言・画像セットとしての再配布はお断りします
- 診断ロジック・コードの流用について相談がある場合は X [@hataraku_ai_](https://x.com/hataraku_ai_) までどうぞ
